import { Station } from '../models/station.model';
import { Route } from '../models/route.model';
import { AppError } from '../utils/AppError';

// Helper to parse "Lat, Lon" string from Google Maps into [Lon, Lat] array for MongoDB
const parseCoordinates = (rawCoordinates: string): [number, number] => {
    const parts = rawCoordinates.split(',');
    const lat = parseFloat(parts[0].trim());
    const lon = parseFloat(parts[1].trim());
    return [lon, lat];
};

export const StationService = {

    // 1. ADMIN: Create Station
    createStation: async (stationName: string, rawCoordinates: string) => {
        const [lon, lat] = parseCoordinates(rawCoordinates);

        // Proximity Block: Check if any station exists within 10 meters
        const nearbyStation = await Station.findOne({
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [lon, lat] },
                    $maxDistance: 10
                }
            }
        });

        if (nearbyStation) {
            throw new AppError(`Conflict: '${nearbyStation.stationName}' already exists within 10 meters of these coordinates.`, 409);
        }

        const newStation = new Station({
            stationName,
            location: {
                type: 'Point',
                coordinates: [lon, lat]
            }
        });

        await newStation.save();
        return newStation;
    },

    // 2. PASSENGER: Autocomplete Search (O(1) Indexed)
    searchStations: async (query: string) => {
        return await Station.find(
            {
                $text: { $search: query },
                isActive: true // Passengers should only see active stations
            },
            { score: { $meta: 'textScore' } } // Project the match score
        )
            .sort({ score: { $meta: 'textScore' } }) // Sort by highest relevance
            .limit(10) // Prevent dropdown lag
            .lean();
    },

    // 3. ADMIN: Fetch all stations
    getAllStations: async (isActiveFilter?: string) => {
        const query = isActiveFilter !== undefined ? { isActive: isActiveFilter === 'true' } : {};

        return await Station.find(query)
            .sort({ stationName: 1 }) // Alphabetical sort for admin dashboard
            .lean();
    },

    // 4. ADMIN: Fetch single station for editing
    getStationById: async (id: string) => {
        const station = await Station.findById(id).lean();
        if (!station) throw new AppError('Station not found', 404);
        return station;
    },

    // 5. ADMIN: Update Station
    updateStation: async (id: string, stationName: string, rawCoordinates?: string) => {
        const updateData: any = { stationName };

        // Only run the coordinate logic if the Admin is actually updating the location
        if (rawCoordinates) {
            const [lon, lat] = parseCoordinates(rawCoordinates);

            // Proximity Block (excluding the current station we are editing)
            const nearbyStation = await Station.findOne({
                _id: { $ne: id },
                location: {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [lon, lat] },
                        $maxDistance: 10
                    }
                }
            });

            if (nearbyStation) {
                throw new AppError(`Conflict: '${nearbyStation.stationName}' is already occupying this physical location.`, 409);
            }

            updateData.location = {
                type: 'Point',
                coordinates: [lon, lat]
            };
        }

        const updatedStation = await Station.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedStation) throw new Error('Station not found');
        return updatedStation;
    },

    // 6. ADMIN: Soft Delete / Reactivate
    toggleStationStatus: async (id: string, isActive: boolean) => {

        // Safety Block: If we are trying to disable a station, ensure no active route relies on it
        if (!isActive) {
            const dependentRoute = await Route.findOne({
                isActive: true,
                'stops.stationId': id
            });

            if (dependentRoute) {
                throw new Error(`Cannot disable station. It is currently being used by active route: '${dependentRoute.routeName}'. Disable or update the route first.`);
            }
        }

        const updatedStation = await Station.findByIdAndUpdate(
            id,
            { isActive },
            { new: true }
        );

        if (!updatedStation) throw new Error('Station not found');
        return updatedStation;
    }
};