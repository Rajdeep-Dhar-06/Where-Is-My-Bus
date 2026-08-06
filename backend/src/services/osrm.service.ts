import * as turf from '@turf/turf';

interface OSRMResponse {
    code: string;
    message?: string;
    routes: {
        geometry: {
            type: 'LineString';
            coordinates: [number, number][];
        };
    }[];
}

export const OsrmService = {

    /**
     * Fetches raw road geometry from OSRM, linearly pre-interpolates it into 10-meter 
     * segments using Turf.js, and rebuilds prefix-sum arrays for O(1) live ETA math.
     * 
     * @param coordinates Array of [longitude, latitude] station coordinates in driving order.
     * @param stepSizeMeters Spatial resolution for interpolation. Defaults to 10 meters.
     */
    fetchRouteGeometry: async (
        coordinates: [number, number][],
        stepSizeMeters: number = 10
    ) => {
        // 1. Format coordinates for OSRM URL: "lon,lat;lon,lat;lon,lat"
        const coordinateString = coordinates.map(c => `${c[0]},${c[1]}`).join(';');

        // 2. OSRM API Request (Fetch raw road path)
        const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${coordinateString}?overview=full&geometries=geojson`;

        try {
            const response = await fetch(osrmUrl);
            const data = (await response.json()) as OSRMResponse;

            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                throw new Error(`OSRM Routing Error: ${data.message || data.code}`);
            }

            const rawCoordinates = data.routes[0]?.geometry.coordinates;
            if (!rawCoordinates || rawCoordinates.length < 2) {
                throw new Error("OSRM returned incomplete route geometry.");
            }

            // 3. Convert OSRM output to a Turf GeoJSON LineString
            const rawLine = turf.lineString(rawCoordinates);
            const totalDistanceMeters = turf.length(rawLine, { units: 'meters' });

            // 4. Interpolation Pipeline: Chop the route into uniform 10-meter chunks
            const interpolatedCoordinates: [number, number][] = [];
            const cumulativeDistances: number[] = [];

            for (let currentDist = 0; currentDist < totalDistanceMeters; currentDist += stepSizeMeters) {
                const sampledPoint = turf.along(rawLine, currentDist, { units: 'meters' });
                interpolatedCoordinates.push(sampledPoint.geometry.coordinates as [number, number]);
                cumulativeDistances.push(currentDist);
            }

            // Explicitly push the final destination point to guarantee path completion
            const finalPoint = turf.along(rawLine, totalDistanceMeters, { units: 'meters' });
            interpolatedCoordinates.push(finalPoint.geometry.coordinates as [number, number]);
            cumulativeDistances.push(totalDistanceMeters);

            // 5. Construct the pre-interpolated GeoJSON LineString
            const interpolatedLine = turf.lineString(interpolatedCoordinates);

            // 6. Map original station stops to their exact index in the new interpolated array
            const stationGeometryIndices: number[] = [];

            for (const stationCoord of coordinates) {
                const stationPoint = turf.point(stationCoord);
                const snapped = turf.nearestPointOnLine(interpolatedLine, stationPoint);

                // properties.index provides the nearest coordinate index in the interpolated line
                const nearestIndex = snapped.properties.index ?? 0;
                stationGeometryIndices.push(nearestIndex);
            }

            // 7. Re-calculate distances between adjacent bus stops using the new indices
            const distancesBetweenStops: number[] = [];
            for (let i = 0; i < stationGeometryIndices.length - 1; i++) {
                const currentStopIndex = stationGeometryIndices[i];
                const nextStopIndex = stationGeometryIndices[i + 1];

                const legDistance = cumulativeDistances[nextStopIndex] - cumulativeDistances[currentStopIndex];
                distancesBetweenStops.push(legDistance);
            }

            // 8. Return formatted data matching MongoDB Route schema
            return {
                geometry: {
                    type: 'LineString' as const,
                    coordinates: interpolatedCoordinates
                },
                cumulativeDistances,
                stationGeometryIndices,
                distancesBetweenStops
            };

        } catch (error: any) {
            console.error('[OsrmService] Failed to execute route interpolation:', error.message);
            throw new Error(`Failed to generate interpolated route graph: ${error.message}`);
        }
    }
};