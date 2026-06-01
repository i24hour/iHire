import mongoose from 'mongoose';

export interface IUserProject {
    _id?: string;
    title: string;
    description?: string;
    siteUrl?: string;
    githubUrl?: string;
    technologies?: string[];
    createdAt?: Date;
}

export interface IUser {
    _id?: string;
    email: string;
    username?: string;
    image?: string;
    headline?: string;
    bio?: string;
    projects?: IUserProject[];
    points?: number;
    githubId?: string;
    githubUsername?: string;
    githubAccessToken?: string;
    githubConnectedAt?: Date;
    lastGithubSyncAt?: Date;
    githubCommitsTotal?: number;
    githubPointsLastUpdatedAt?: Date;
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
    headline: {
        type: String,
        maxlength: 120,
    },
    bio: {
        type: String,
        maxlength: 500,
    },
    projects: [{
        title: { type: String, required: true, maxlength: 80 },
        description: { type: String, maxlength: 300 },
        siteUrl: { type: String, maxlength: 500 },
        githubUrl: { type: String, maxlength: 500 },
        technologies: [{ type: String, maxlength: 40 }],
        createdAt: { type: Date, default: Date.now },
    }],
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
    githubSyncLockUntil: {
        type: Date,
    },
}, {
    timestamps: true,
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
