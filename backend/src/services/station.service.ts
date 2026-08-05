import { Station } from "../models/station.model";

export const StationService = {

    // 1. ADMIN: Create a new physical bus stop
    createStation: async (stationName: string, coordinates: [number, number]) => {
        // We must wrap the coordinates inside the GeoJSON structure required by MongoDB
        const newStation = new Station({
            stationName,
            location: {
                type: 'Point',
                coordinates: coordinates // [longitude, latitude]
            },
            isActive: true
        });

        await newStation.save();
        return newStation;
    },

    // 2. ADMIN: List all stations (For dashboard tables and dropdowns)
    getAllStations: async (isActiveFilter?: string) => {
        const query = isActiveFilter !== undefined ? { isActive: isActiveFilter === 'true' } : {};

        // .sort({ stationName: 1 }) alphabetizes the list for the admin UI dropdown
        // .lean() strips heavy Mongoose wrappers, returning pure JSON for speed
        return await Station.find(query)
            .sort({ stationName: 1 })
            .lean();
    },

    // 3. PASSENGER: Autocomplete Search
    searchStations: async (searchQuery: string) => {
        // We only want passengers routing to/from active stations
        return await Station.find(
            {
                isActive: true,
                $text: { $search: searchQuery }
            },
            // Projection: Tells Mongo to calculate a relevance score based on the text match
            { score: { $meta: 'textScore' } }
        )
            // Sort the results so the highest relevance score appears first
            .sort({ score: { $meta: 'textScore' } })
            // Limit to 10 results so the mobile app autocomplete doesn't lag
            .limit(10)
            .select('stationName location') // Only send what the UI needs
            .lean();
    },

    // 4. ADMIN: Soft delete or reactivate
    toggleStation: async (id: string, isActive: boolean) => {
        const updatedStation = await Station.findByIdAndUpdate(
            id,
            { isActive },
            { new: true } // Return the modified document, not the old one
        );

        if (!updatedStation) {
            throw new Error(`Station with ID ${id} not found.`);
        }

        return updatedStation;
    }
};