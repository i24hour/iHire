import mongoose from 'mongoose';

export interface IUser {
    _id?: string;
    email: string;
    username?: string;
    image?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const UserSchema = new mongoose.Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    username: {
        type: String,
        unique: true,
        sparse: true, // Allow multiple nulls if username not set yet
        index: true,
        lowercase: true,
        trim: true,
    },
    image: {
        type: String, // Base64 or URL
    },
}, {
    timestamps: true,
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
