import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicle extends Document {
    plateNumber: string;
    capacity: number;
    status: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
}

const vehicleSchema = new Schema<IVehicle>({
    plateNumber: { type: String, required: true, unique: true, index: true },
    capacity: { type: Number, required: true },
    status: { type: String, enum: ['ACTIVE', 'MAINTENANCE', 'RETIRED'], default: 'ACTIVE' }
}, { timestamps: true });

export const Vehicle = mongoose.model<IVehicle>('Vehicle', vehicleSchema);