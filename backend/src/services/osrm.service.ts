// Using native Node 18+ fetch API (no Axios required)

// Define the exact shape of the OSRM response we care about
interface OSRMLeg {
    distance: number;
    annotation: {
        distance: number[]; // Distances between individual geometry coordinates
    };
}

interface OSRMResponse {
    code: string;
    message?: string;
    routes: {
        geometry: {
            type: 'LineString';
            coordinates: [number, number][];
        };
        legs: OSRMLeg[];
    }[];
}

export const OsrmService = {

    /**
     * Fetches the physical road geometry and calculates the prefix sum arrays for O(1) ETA math.
     * @param coordinates Array of [longitude, latitude] pairs in exact driving order.
     */
    fetchRouteGeometry: async (coordinates: [number, number][]) => {
        // 1. Format coordinates for OSRM URL: "lon,lat;lon,lat;lon,lat"
        const coordinateString = coordinates.map(c => `${c[0]},${c[1]}`).join(';');

        // 2. Construct the OSRM API URL
        // overview=full: Returns the maximum resolution polyline without simplification.
        // geometries=geojson: Returns a standard GeoJSON LineString (no decoding required).
        // annotations=distance: Forces OSRM to return the exact distance between every single coordinate.
        const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${coordinateString}?overview=full&geometries=geojson&annotations=distance`;

        try {
            const response = await fetch(osrmUrl);
            const data = (await response.json()) as OSRMResponse;

            // 3. Handle OSRM Routing Failures (e.g., trying to route across an ocean or unmapped road)
            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                throw new Error(`OSRM Routing Error: ${data.message || data.code}`);
            }

            const route = data.routes[0];
            if (!route || !route.geometry || !route.legs) {
                throw new Error("OSRM returned incomplete route data.");
            }

            const fullGeometry = route.geometry;
            const legs = route.legs;

            // 4. Initialize our mathematical arrays
            const cumulativeDistances: number[] = [0];
            const stationGeometryIndices: number[] = [0];
            const distancesBetweenStops: number[] = [];

            let runningTotalDistance = 0;
            let currentCoordinateIndex = 0;

            // 5. The Prefix Sum Algorithm
            // We iterate through each 'leg' (the path between Station i and Station i+1)
            for (let i = 0; i < legs.length; i++) {
                const leg = legs[i];

                // Save the total distance of this specific leg
                distancesBetweenStops.push(leg?.distance || 0);

                // Iterate through the micro-distances between the raw geometry coordinates of this leg
                const segmentDistances = leg?.annotation?.distance || [];

                for (const distance of segmentDistances) {
                    runningTotalDistance += distance;
                    cumulativeDistances.push(runningTotalDistance);
                    currentCoordinateIndex++;
                }

                // The end of this leg represents the exact array index of the next bus stop
                stationGeometryIndices.push(currentCoordinateIndex);
            }

            // 6. Architectural Integrity Check
            // If the prefix sum array length does not perfectly match the geometry coordinate array length,
            // our O(1) ETA math in the live service will crash or return incorrect values.
            if (cumulativeDistances.length !== fullGeometry.coordinates.length) {
                throw new Error(
                    `CRITICAL: Geometry mismatch. Coordinates length (${fullGeometry.coordinates.length}) ` +
                    `does not match distance array length (${cumulativeDistances.length}).`
                );
            }

            // 7. Return exactly what route.service.ts expects
            return {
                geometry: fullGeometry,
                cumulativeDistances,
                stationGeometryIndices,
                distancesBetweenStops
            };

        } catch (error: any) {
            console.error('[OsrmService] Failed to fetch route geometry:', error.message);
            throw new Error(`Failed to generate route graph: ${error.message}`);
        }
    }
};