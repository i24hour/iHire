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
    githubCommitsTotal?: number;
    githubPointsLastUpdatedAt?: Date;
    githubPointsHistory?: Array<{
        timestamp: Date;
        points: number;
    }>;
    chainPoints?: number;
    chainPointsLastUpdatedAt?: Date;
    chainPointsHistory?: Array<{
        timestamp: Date;
        points: number;
    }>;
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
        sparse: true,
        index: true,
        lowercase: true,
        trim: true,
    },
    image: {
        type: String,
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
    githubPointsLastUpdatedAt: {
        type: Date,
    },
    githubPointsHistory: [{
        timestamp: {
            type: Date,
            required: true,
        },
        points: {
            type: Number,
            required: true,
            min: 0,
        },
        _id: false,
    }],
    chainPoints: {
        type: Number,
        default: 0,
    },
    chainPointsLastUpdatedAt: {
        type: Date,
    },
    chainPointsHistory: [{
        timestamp: {
            type: Date,
            required: true,
        },
        points: {
            type: Number,
            required: true,
            min: 0,
        },
        _id: false,
    }],
    githubSyncLockUntil: {
        type: Date,
    },
}, {
    timestamps: true,
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
