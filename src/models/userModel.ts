import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    _id: string;
    username: string,
    // department: string,
    email: string,
    password: string,
    createdAt: Date,
    updatedAt: Date,
}

const userSchema: Schema = new Schema<IUser>({
    username: {
        type: String,
        required: true
    },
    // department: {
    //     type: String,
    //     enum: ["AssignmentDesk", "ProductionLine", "BillingStation"],
    //     required: true
    // },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
}, { timestamps: true });

const User = mongoose.model<IUser>("User", userSchema);

export default User;