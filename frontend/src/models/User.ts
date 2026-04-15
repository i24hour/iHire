import mongoose from 'mongoose';

export interface IUser {
    _id?: string;
    email: string;
    username?: string;
    image?: string;
    points?: number;
    githubId?: string;
    githubUsername?: string;
    githubAccessToken?: string;
    githubConnectedAt?: Date;
    lastGithubSyncAt?: Date;
    githubCommitsTotal?: number; // Total commits already rewarded — used to prevent double-counting
    githubSyncLockUntil?: Date;
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
    points: {
        type: Number,
        default: 0,
    },
    githubId: {
        type: String,
        sparse: true,
        unique: true,
    },
    githubUsername: {
        type: String,
    },
    githubAccessToken: {
        type: String,
    },
    githubConnectedAt: {
        type: Date,
    },
    lastGithubSyncAt: {
        type: Date,
    },
    githubCommitsTotal: {
        type: Number,
        default: 0,
    },
    githubSyncLockUntil: {
        type: Date,
    },
}, {
    timestamps: true,
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
