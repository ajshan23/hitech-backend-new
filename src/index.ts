import express, {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import compression from "compression";
import { dbConnect } from "./db/dbConfig";
import { ApiError } from "./utils/apiHandlerHelpers";
import { errorHandler } from "./utils/errorHandler";
import jobcardRouter from "./routes/jobcardRoutes";
import onsiteRouter from "./routes/onstiteJobRoutes";
import workerRouter from "./routes/workerRoutes";

dotenv.config();

const app = express();

app.use(cors());

// app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(express.static("/var/www/kmcc-frontend/dist/"));
app.use(morgan("dev")); // Logging
app.use(helmet()); // Security
app.use(compression({ threshold: 1024 }));

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, Secure and Logged World!");
});

app.use("/api/jobcards", jobcardRouter);
app.use("/api/onsite", onsiteRouter);
app.use("/api/worker", workerRouter);

app.use((req: Request, res: Response, next: NextFunction) => {
  throw new ApiError(404, "Route not found");
});

// Error-handling middleware
app.use(errorHandler as ErrorRequestHandler);
app.get("*", (req, res) => {
  // res.sendFile("/var/www/kmcc-frontend/dist/index.html");
});
// Function to start the server

// Gracefully handle Prisma shutdown on app termination
dbConnect().then(() => {
  app.listen(9037, () => {
    console.log("Server is running on port 9037");
  });
});
