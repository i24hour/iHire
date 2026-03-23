import mongoose from 'mongoose';

export interface IChainMember {
    userId: string; // email or id from next-auth
    name: string;
    image?: string;
    isWorking: boolean;
    contributionTime: number; // total seconds
    lastStartedAt?: number; // timestamp
    parentId?: string; // userId of who added this member
    isStarter?: boolean;
}

export interface IChain {
    _id?: string;
    name: string;
    status: 'Active' | 'Idle' | 'Burst';
    totalTime: number; // total seconds
    maxTime: number; // maximum time reached before a burst or currently
    lastStartedAt?: number; // timestamp when at least one user started working
    burstAt?: number; // timestamp when chain burst
    whatsappLink?: string;
    members: IChainMember[];
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ChainMemberSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String },
    isWorking: { type: Boolean, default: false },
    contributionTime: { type: Number, default: 0 },
    lastStartedAt: { type: Number },
    parentId: { type: String },
    isStarter: { type: Boolean, default: false },
});

const ChainSchema = new mongoose.Schema({
    name: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['Active', 'Idle', 'Burst'], 
        default: 'Idle' 
    },
    totalTime: { type: Number, default: 0 },
    maxTime: { type: Number, default: 0 },
    lastStartedAt: { type: Number },
    burstAt: { type: Number },
    whatsappLink: { type: String },
    members: [ChainMemberSchema],
    createdBy: { type: String },
}, {
    timestamps: true,
});

export default mongoose.models.Chain || mongoose.model('Chain', ChainSchema);
