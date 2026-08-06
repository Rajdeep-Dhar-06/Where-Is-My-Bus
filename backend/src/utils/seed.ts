import mongoose from 'mongoose';
import { Station } from '../models/station.model';
import { Vehicle } from '../models/vehicle.model';
import { Route } from '../models/route.model';
import { User } from '../models/user.model';
import { RouteService } from '../services/route.service';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config();

const seedDatabase = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) throw new Error('MONGO_URI is missing');

        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected.');

        console.log('🧹 Clearing old data...');
        await Station.deleteMany({});
        await Route.deleteMany({});
        await Vehicle.deleteMany({});
        await User.deleteMany({});

        console.log('📍 Creating Stations...');
        // Realistic coordinates for a small segment in Kolkata (e.g. Sealdah to Park Circus)
        const stationsData = [
            { stationName: 'Sealdah Station', location: { type: 'Point', coordinates: [88.3723, 22.5678] } },
            { stationName: 'Moulali', location: { type: 'Point', coordinates: [88.3685, 22.5599] } },
            { stationName: 'Nonapukur', location: { type: 'Point', coordinates: [88.3651, 22.5524] } },
            { stationName: 'Park Circus', location: { type: 'Point', coordinates: [88.3653, 22.5441] } }
        ];

        const createdStations = await Station.insertMany(stationsData);
        const stationIds = createdStations.map(s => s._id.toString());

        console.log('🛣️  Building Route via OSRM...');
        // Trigger OSRM to generate the geometry and cumulative distances
        const route = await RouteService.buildAndSaveRoute('Route 45: Sealdah - Park Circus', stationIds);
        console.log(`✅ Route created: ${route.routeName} (${route.stops.length} stops)`);

        console.log('🚌 Creating Vehicles...');
        await Vehicle.insertMany([
            { plateNumber: 'WB-12-3456', capacity: 40, status: 'ACTIVE' },
            { plateNumber: 'WB-99-8888', capacity: 45, status: 'ACTIVE' }
        ]);

        console.log('🎉 Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedDatabase();
