import mongoose, { Schema, Document, Types } from "mongoose"

export interface IJobCardImage extends Document {
    _id: string;
    jobCardId: Types.ObjectId;
    image: string;
    key: string;
    createdAt: Date;
    updatedAt: Date;
}


const imageSchema: Schema = new Schema<IJobCardImage>({
    jobCardId: {
        type: Schema.Types.ObjectId,
        ref: "JobCard",
        required: true
    },
    image: {
        type: String,
        required: true
    },
    key: {
        type: String,
        required: true
    },
})

export const JobCardImage = mongoose.model<IJobCardImage>("JobCardImage", imageSchema);