import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICounter extends Document {
  _id: string;
  sequence_value: number;
}

const counterSchema: Schema = new Schema<ICounter>({
  _id: {
    type: String,
    required: true,
  },
  sequence_value: {
    type: Number,
    default: 0,
  },
});

const Counter = mongoose.model<ICounter>("Counter", counterSchema);

export { Counter };

export interface IJobCard extends Document {
  _id: string;
  jobCardNumber: string;
  jobCardStatus: string;
  customerName: string;
  customerAddress: string;
  phoneNumber: string[];
  InDate?: Date;
  OutDate?: Date;
  Make: string; //brand name like maruthy
  HP?: number;
  KVA?: number;
  RPM?: number;
  Type?: string;
  Frame: string;
  SrNo: string; //serial number
  DealerName?: string;
  DealerNumber?: string;
  warranty?: boolean;
  works?: string;
  spares?: string;
  industrialworks?: string;
  attachments: [string];
  images: Types.ObjectId[];
  worker: Types.ObjectId;
  invoiceNumber: string;
  invoiceDate: Date;
  others?: string;
  createdAt: Date;
  updatedAt: Date;
}

const jobCardSchema: Schema = new Schema<IJobCard>(
  {
    customerName: {
      type: String,
      required: true,
    },
    customerAddress: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: [String], // Array of strings
      required: true,
      validate: {
        validator: function (value: string[]) {
          return value.length > 0; // Ensure the array is not empty
        },
        message: "At least one phone number is required.",
      },
    },
    jobCardNumber: {
      type: String,
      required: true,
    },
    InDate: {
      type: Date,
      default: () => new Date(), // Let MongoDB store in UTC
    },
    OutDate: {
      type: Date,
    },
    Make: {
      type: String,
    },
    HP: {
      type: Number,
    },
    KVA: {
      type: Number,
    },
    RPM: {
      type: Number,
    },
    Type: {
      type: String,
    },
    Frame: {
      type: String,
    },
    SrNo: {
      type: String,
    },
    DealerName: {
      type: String,
    },
    DealerNumber: {
      type: String,
    },
    works: {
      type: String,
    },
    spares: {
      type: String,
    },
    industrialworks: {
      type: String,
    },
    attachments: [
      {
        type: String,
      },
    ],
    warranty: {
      type: Boolean,
    },
    jobCardStatus: {
      type: String,
      enum: ["Created", "Pending", "Returned", "Completed", "Billed"],
      required: true,
    },
    images: [
      {
        type: Schema.Types.ObjectId,
        ref: "JobCardImage",
      },
    ],
    worker: {
      type: Schema.Types.ObjectId,
      ref: "Worker",
    },
    invoiceNumber: {
      type: String,
    },
    invoiceDate: {
      type: Date,
    },
    others: {
      type: String,
    },
  },
  { timestamps: true }
);

const JobCard = mongoose.model<IJobCard>("JobCard", jobCardSchema);

export { JobCard };
