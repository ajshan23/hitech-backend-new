import mongoose from "mongoose";

export const dbConnect = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGODB_URL!);
    console.log("Connected to mongodb ", connect.connection.host);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
