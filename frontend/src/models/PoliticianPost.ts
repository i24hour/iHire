import mongoose, { Types } from 'mongoose';

export type PoliticianPostCategory =
    | 'on_portfolio'
    | 'related'
    | 'off_topic'
    | 'attack'
    | 'personal'
    | 'unknown';

export interface IPoliticianPost {
    _id?: string;
    politicianId: Types.ObjectId | string;
    externalId: string;
    text: string;
    postedAt?: Date;
    postUrl?: string;
    rawMarkdown?: string;
    category: PoliticianPostCategory;
    score: number;
    scoreReason?: string;
    /** How the post was classified: llm (preferred) or keyword fallback. */
    scoredBy?: 'llm' | 'keyword' | 'fallback';
    scoredAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

const PoliticianPostSchema = new mongoose.Schema<IPoliticianPost>(
    {
        politicianId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Politician',
            required: true,
            index: true,
        },
        externalId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },
        text: { type: String, required: true },
        postedAt: { type: Date, index: true },
        postUrl: { type: String, trim: true },
        rawMarkdown: { type: String },
        category: {
            type: String,
            enum: ['on_portfolio', 'related', 'off_topic', 'attack', 'personal', 'unknown'],
            default: 'unknown',
            index: true,
        },
        score: { type: Number, default: 0 },
        scoreReason: { type: String },
        scoredBy: {
            type: String,
            enum: ['llm', 'keyword', 'fallback'],
            default: 'keyword',
        },
        scoredAt: { type: Date },
    },
    { timestamps: true }
);

PoliticianPostSchema.index({ politicianId: 1, postedAt: -1 });

const PoliticianPost =
    mongoose.models.PoliticianPost ||
    mongoose.model<IPoliticianPost>('PoliticianPost', PoliticianPostSchema);

export default PoliticianPost;
