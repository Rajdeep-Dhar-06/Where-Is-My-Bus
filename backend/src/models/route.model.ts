import mongoose, { Schema, Document } from 'mongoose';

export interface IRouteStop {
    stationId: mongoose.Types.ObjectId;
    order: number;
    geometryIndex: number;
    distanceToNext: number;
}

export interface IRoute extends Document {
    routeName: string;
    isActive: boolean;
    stops: IRouteStop[];
    geometry: {
        type: 'LineString';
        coordinates: [number, number][];
    };
    displayGeometry: {
        type: 'LineString';
        coordinates: [number, number][];
    };
    cumulativeDistances: number[];
}

const routeSchema = new Schema<IRoute>({
    routeName: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    stops: [{
        stationId: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
        order: { type: Number, required: true },
        geometryIndex: { type: Number, required: true },
        distanceToNext: { type: Number, required: true }
    }],
    geometry: {
        type: { type: String, enum: ['LineString'], default: 'LineString', required: true },
        coordinates: { type: [[Number]], required: true }
    },
    displayGeometry: {
        type: { type: String, enum: ['LineString'], default: 'LineString', required: true },
        coordinates: { type: [[Number]], required: true }
    },
    cumulativeDistances: { type: [Number], required: true }
}, { timestamps: true });

// Compound index to instantly find routes connecting two specific stations
routeSchema.index({ 'stops.stationId': 1 });

export const Route = mongoose.model<IRoute>('Route', routeSchema);