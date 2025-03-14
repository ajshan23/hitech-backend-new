import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiHandlerHelpers";
import { ApiResponse } from "../utils/apiHandlerHelpers";
import {
  handleSingleFileUpload,
  handleMultipleFileUploads,
} from "../utils/uploader";
import Worker, { IWorker } from "../models/workerModel";
import mongoose from "mongoose";
import { JobCard } from "../models/jobCardModel";

// Create Worker
export const createWorker = asyncHandler(
  async (req: Request, res: Response) => {
    const { workerName, phoneNumber } = req.body;

    // Validate required fields
    if (!workerName?.trim() || !phoneNumber?.trim()) {
      throw new ApiError(400, "All fields are required");
    }

    // Validate file upload
    if (!req.file) {
      throw new ApiError(400, "No file provided");
    }

    // Upload worker image
    const uploadResult = await handleSingleFileUpload(req, req.file);
    if (!uploadResult.success || !uploadResult.uploadData) {
      throw new ApiError(400, "File upload failed");
    }

    // Create worker
    const worker = await Worker.create({
      workerName,
      phoneNumber,
      workerImage: uploadResult.uploadData.url,
      key: uploadResult.uploadData.key,
    });

    res
      .status(201)
      .json(new ApiResponse(201, worker, "Worker created successfully"));
  }
);

// Get Worker List with Pagination
export const workerList = asyncHandler(async (req: Request, res: Response) => {
  const pageNo: number = parseInt(req.query.page as string) || 1; // Default to page 1
  const limitOf: number = parseInt(req.query.limit as string) || 10; // Default to limit 10

  // Validate pagination parameters
  if (isNaN(pageNo) || isNaN(limitOf) || pageNo < 1 || limitOf < 1) {
    throw new ApiError(400, "Invalid page or limit value");
  }

  const skip: number = (pageNo - 1) * limitOf; // Calculate the number of documents to skip

  // Fetch workers with pagination
  const workers = await Worker.find().skip(skip).limit(limitOf);
  const countOfDocuments = await Worker.countDocuments();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        workers,
        totalPages: Math.ceil(countOfDocuments / limitOf),
        currentPage: pageNo,
      },
      "Workers fetched successfully"
    )
  );
});

// Get a Specific Worker
export const getASpecificWorker = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.query;

    // Validate worker ID
    if (!id) {
      throw new ApiError(400, "Worker ID is required");
    }

    // Find worker by ID
    const worker = await Worker.findById(id);
    if (!worker) {
      throw new ApiError(404, "Worker not found");
    }

    res
      .status(200)
      .json(new ApiResponse(200, worker, "Worker fetched successfully"));
  }
);

// Edit Worker Details
export const editAWorker = asyncHandler(async (req: Request, res: Response) => {
  const { id, workerName, phoneNumber } = req.body;

  // Validate worker ID
  if (!id) {
    throw new ApiError(400, "Worker ID is required");
  }

  // Find and update worker
  const worker = await Worker.findById(id);
  if (!worker) {
    throw new ApiError(404, "Worker not found");
  }

  if (workerName) worker.workerName = workerName;
  if (phoneNumber) worker.phoneNumber = phoneNumber;

  await worker.save();

  res
    .status(200)
    .json(new ApiResponse(200, worker, "Worker updated successfully"));
});

// Change Worker Status
export const changeStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.query;

    // Validate worker ID
    if (!id) {
      throw new ApiError(400, "Worker ID is required");
    }

    // Find and update worker status
    const worker = await Worker.findById(id);
    if (!worker) {
      throw new ApiError(404, "Worker not found");
    }

    worker.status = !worker.status;
    await worker.save();

    res
      .status(200)
      .json(new ApiResponse(200, worker, "Worker status updated successfully"));
  }
);

// List Available Workers
export const listAvailableWorkers = asyncHandler(
  async (req: Request, res: Response) => {
    const workers = await Worker.find({ status: true });

    res
      .status(200)
      .json(
        new ApiResponse(200, workers, "Available workers fetched successfully")
      );
  }
);

// Assign Worker to Job Card
export const assignWorker = asyncHandler(
  async (req: Request, res: Response) => {
    const { workerId, jobcardId } = req.body;

    // Validate worker and job card IDs
    if (!workerId || !jobcardId) {
      throw new ApiError(400, "Worker ID and Job Card ID are required");
    }

    if (
      !mongoose.isValidObjectId(workerId) ||
      !mongoose.isValidObjectId(jobcardId)
    ) {
      throw new ApiError(400, "Invalid Worker ID or Job Card ID");
    }

    // Find worker and job card
    const worker = await Worker.findById(workerId);
    if (!worker) {
      throw new ApiError(404, "Worker not found");
    }

    const jobcard = await JobCard.findById(jobcardId);
    if (!jobcard) {
      throw new ApiError(404, "Job card not found");
    }

    // Assign worker to job card
    jobcard.worker = new mongoose.Types.ObjectId(workerId);
    await jobcard.save();

    res
      .status(200)
      .json(new ApiResponse(200, null, "Worker assigned successfully"));
  }
);

// Edit Worker Image
export const editWorkerImage = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate worker ID
    if (!id) {
      throw new ApiError(400, "Worker ID is required");
    }

    // Validate file upload
    if (!req.file) {
      throw new ApiError(400, "No file provided");
    }

    // Upload new worker image
    const uploadResult = await handleSingleFileUpload(req, req.file);
    if (!uploadResult.success || !uploadResult.uploadData) {
      throw new ApiError(400, "File upload failed");
    }

    // Find and update worker image
    const worker = await Worker.findById(id);
    if (!worker) {
      throw new ApiError(404, "Worker not found");
    }

    worker.workerImage = uploadResult.uploadData.url;
    worker.key = uploadResult.uploadData.key;
    await worker.save();

    res
      .status(200)
      .json(new ApiResponse(200, worker, "Worker image updated successfully"));
  }
);
