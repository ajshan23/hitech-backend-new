import mongoose, { Schema, Document, Types } from "mongoose";

export interface IOnSiteJob extends Document {
  _id: string;
  customerName: string;
  customerAddress: string;
  complaintNumber?: string; // Optional
  phoneNumbers: string[];
  make?: string; // Optional
  dealerName?: string; // Optional
  warrantyStatus: "Warranty" | "Non-Warranty"; // Default: "Non-Warranty"
  reportedComplaint?: string; // Optional
  attendedDate?: Date; // Optional
  attendedPerson?: Types.ObjectId; // Optional
  complaintStatus: "Pending" | "Closed" | "Sent to Workshop"; // Default: "Pending"
  complaintDetails?: string; // Optional
  paymentStatus: "Pending" | "Paid"; // Default: "Pending"
  createdAt: Date;
  updatedAt: Date;
}

const onSiteJobSchema: Schema = new Schema<IOnSiteJob>(
  {
    customerName: {
      type: String,
      required: true,
    },
    customerAddress: {
      type: String,
      required: true,
    },
    complaintNumber: {
      type: String,
      unique: true,
      sparse: true, // Allows null values while enforcing uniqueness
    },
    phoneNumbers: [
      {
        type: String,
        required: true,
      },
    ],
    make: {
      type: String,
    },
    dealerName: {
      type: String,
    },
    warrantyStatus: {
      type: String,
      enum: ["Warranty", "Non-Warranty"],
      default: "Non-Warranty", // Default value
    },
    reportedComplaint: {
      type: String,
    },
    attendedDate: {
      type: Date,
    },
    attendedPerson: {
      type: Schema.Types.ObjectId,
      ref: "Worker",
    },
    complaintStatus: {
      type: String,
      enum: ["Pending", "Closed", "Sent to Workshop"],
      default: "Pending", // Default value
    },
    complaintDetails: {
      type: String,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending", // Default value
    },
  },
  { timestamps: true }
);

export const OnSiteJob = mongoose.model<IOnSiteJob>(
  "OnSiteJob",
  onSiteJobSchema
);
