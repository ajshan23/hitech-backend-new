import mongoose, { Document, Schema } from "mongoose";

export interface IWorker extends Document {
    workerName: string;
    workerImage: string;
    key: string;
    phoneNumber: string;
    status: boolean;
}

const workerSchema: Schema = new Schema<IWorker>({
    workerName: {
        type: String,
        required: true,
        trime: true,
    },
    workerImage: {
        type: String,
    },
    key: {
        type: String,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    status: {
        type: Boolean,
        default: true,
    }
}, { timestamps: true })


const Worker = mongoose.model<IWorker>("Worker", workerSchema);
export default Worker;