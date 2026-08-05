import mongoose, { Schema, Document } from 'mongoose';

export interface IStation extends Document {
    stationName: string;
    location: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
    };
    isActive: boolean;
}

const stationSchema = new Schema<IStation>({
    stationName: { type: String, required: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point', required: true },
        coordinates: { type: [Number], required: true }
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Text index for the Passenger autocomplete search bar
stationSchema.index({ stationName: 'text' });

export const Station = mongoose.model<IStation>('Station', stationSchema);