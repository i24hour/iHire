import mongoose from 'mongoose';

export interface ITimeTask {
    _id?: string;
    userId: string;
    title: string;
    description: string;
    startTime: number;
    pausedElapsed: number;
    enabled: boolean;
    completed: boolean;
    milestones: Array<{
        text: string;
        timestamp: number;
    }>;
    targetTime?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

const ITimeTaskSchema = new mongoose.Schema<ITimeTask>({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
    startTime: {
        type: Number,
        required: true,
    },
    pausedElapsed: {
        type: Number,
        default: 0,
    },
    enabled: {
        type: Boolean,
        default: true,
    },
    completed: {
        type: Boolean,
        default: false,
    },
    milestones: [{
        text: String,
        timestamp: Number,
    }],
    targetTime: {
        type: Number,
    },
}, {
    timestamps: true,
});

// Index for faster queries
ITimeTaskSchema.index({ userId: 1, completed: 1, createdAt: -1 });

export default mongoose.models.ITimeTask || mongoose.model<ITimeTask>('ITimeTask', ITimeTaskSchema);
