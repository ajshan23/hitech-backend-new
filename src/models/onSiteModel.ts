import mongoose, { Schema, Document, Types } from "mongoose";

export interface IOnSiteJob extends Document {
    _id: string;
    customerName: string;
    customerAddress: string;
    complaintNumber: string;
    phoneNumbers: string[];
    make: string;
    dealerName?: string;
    warrantyStatus: "Warranty" | "Non-Warranty";
    reportedComplaint: string;
    attendedDate?: Date;
    attendedPerson: Types.ObjectId;
    complaintStatus: "Pending" | "Closed" | "Sent to Workshop";
    complaintDetails?: string;
    paymentStatus: "Pending" | "Paid";
    createdAt: Date;
    updatedAt: Date;
}

const onSiteJobSchema: Schema = new Schema<IOnSiteJob>({
    customerName: {
        type: String,
        required: true
    },
    customerAddress: {
        type: String,
        required: true
    },
    complaintNumber: {
        type: String,
        required: true,
        unique: true
    },
    phoneNumbers: [{
        type: String,
        required: true
    }],
    make: {
        type: String,
        required: true
    },
    dealerName: {
        type: String
    },
    warrantyStatus: {
        type: String,
        enum: ["Warranty", "Non-Warranty"],
        required: true
    },
    reportedComplaint: {
        type: String,
        required: true
    },
    attendedDate: {
        type: Date
    },
    attendedPerson: {
        type: Schema.Types.ObjectId,
        ref: "Worker",
        required: true
    },
    complaintStatus: {
        type: String,
        enum: ["Pending", "Closed", "Sent to Workshop"],
        required: true
    },
    complaintDetails: {
        type: String
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid"],
        required: true
    }
}, { timestamps: true });

export const OnSiteJob = mongoose.model<IOnSiteJob>("OnSiteJob", onSiteJobSchema);
