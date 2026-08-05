import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    clerkId: string;
    name: string;
    phone: string;
    role: 'ADMIN' | 'DRIVER';
    licenseNumber?: string;
    isActive: boolean;
}

const userSchema = new Schema<IUser>({
    clerkId: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'DRIVER'], required: true },
    licenseNumber: {
        type: String,
        // Conditional validation: Only drivers require a license
        required: function () { return this.role === 'DRIVER'; }
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Indexes for ClerkId (Unique, Immutable) and Phone (Unique, Mutable)
userSchema.index({ clerkId: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });

export const User = mongoose.model<IUser>('User', userSchema);