import mongoose from 'mongoose';

export interface IReply {
    _id?: string;
    ideaId: mongoose.Types.ObjectId | string;
    content: string;
    createdBy: string; // userId (email)
    isPublic: boolean; // public vs private
    createdAt?: Date;
    updatedAt?: Date;
}

const ReplySchema = new mongoose.Schema<IReply>({
    ideaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Idea',
        required: true,
        index: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
    createdBy: {
        type: String,
        required: true,
        index: true,
    },
    isPublic: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

export default mongoose.models.Reply || mongoose.model<IReply>('Reply', ReplySchema);
