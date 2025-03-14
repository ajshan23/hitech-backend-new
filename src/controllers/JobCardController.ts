import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiHandlerHelpers";
import { ApiResponse } from "../utils/apiHandlerHelpers";
import { JobCard, Counter } from "../models/jobCardModel";

import { handleMultipleFileUploads } from "../utils/uploader";
import { validateJobCardInput } from "../helpers/validation";
import { JobCardImage } from "../models/jobCardImage";
import { Types } from "mongoose";
import { buildSearchQuery } from "../helpers/queryBuilder";

export const createJobCardWithImages = asyncHandler(
  async (req: Request, res: Response) => {
    // Parse attachments and other fields
    let attachments: string[] = [];
    if (req.body.attachments) {
      if (typeof req.body.attachments === "string") {
        if (
          req.body.attachments.startsWith("[") &&
          req.body.attachments.endsWith("]")
        ) {
          try {
            attachments = JSON.parse(req.body.attachments);
          } catch (error) {
            console.error("Error parsing attachments JSON:", error);
            // Handle parsing error, e.g., set attachments to an empty array
            attachments = [];
          }
        } else {
          attachments = req.body.attachments.split(",");
        }
      } else if (Array.isArray(req.body.attachments)) {
        attachments = req.body.attachments;
      } else {
        attachments = [];
      }
    }

    const HP = req.body.HP ? parseInt(req.body.HP) : undefined;
    const KVA = req.body.KVA ? parseInt(req.body.KVA) : undefined;
    const RPM = req.body.RPM ? parseInt(req.body.RPM) : undefined;

    const convertedBody = {
      ...req.body,
      HP: isNaN(HP!) ? undefined : HP,
      KVA: isNaN(KVA!) ? undefined : KVA,
      RPM: isNaN(RPM!) ? undefined : RPM,
      warranty: req.body.warranty === "true",
      attachments: attachments,
    };

    // Validate job card input
    const { error, value } = validateJobCardInput(convertedBody);
    if (error) throw new ApiError(400, error.details[0].message);

    // ... (rest of the code remains the same)
    // Generate job card number, create jobCard, handle file uploads, save jobCard, send response
    const counter = await Counter.findOneAndUpdate(
      { _id: "jobCardNumber" },
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
    );
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const jobCardNumber = `${counter.sequence_value}/${currentYear}`;

    const jobCard = new JobCard({
      ...value,
      jobCardNumber,
      jobCardStatus: "Pending",
    });

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const uploadResult = await handleMultipleFileUploads(req, req.files);
      if (!uploadResult.success || !uploadResult.uploadData) {
        throw new ApiError(400, "File upload failed");
      }

      const imageIds = [];
      for (const file of uploadResult.uploadData) {
        const image = await JobCardImage.create({
          image: file.url,
          key: file.key,
          jobCardId: jobCard._id,
        });
        imageIds.push(new Types.ObjectId(image._id));
      }

      jobCard.images = imageIds;
    }

    await jobCard.save();

    res
      .status(201)
      .json(new ApiResponse(201, jobCard, "Job card created successfully"));
  }
);

export const addImagesToJobCard = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if job card exists
    const jobCard = await JobCard.findById(id);
    if (!jobCard) throw new ApiError(404, "Job card not found");

    // Check if job card status is "Billed"
    if (jobCard.jobCardStatus === "Billed") {
      throw new ApiError(400, "Cannot add images to a billed job card");
    }

    // Handle file uploads
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new ApiError(400, "No files provided");
    }

    const uploadResult = await handleMultipleFileUploads(req, req.files);
    if (!uploadResult.success || !uploadResult.uploadData) {
      throw new ApiError(400, "File upload failed");
    }

    // Save uploaded images and associate them with the job card
    const imageIds: Types.ObjectId[] = [];
    for (const file of uploadResult.uploadData) {
      const image = await JobCardImage.create({
        image: file.url,
        key: file.key,
        jobCardId: jobCard._id,
      });
      imageIds.push(new Types.ObjectId(image._id)); // Convert string to ObjectId
    }

    jobCard.images = [...jobCard.images, ...imageIds]; // Now imageIds is Types.ObjectId[]
    await jobCard.save();

    res
      .status(200)
      .json(new ApiResponse(200, jobCard, "Images added successfully"));
  }
);

export const getSingleJobCard = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate job card ID
    if (!id) {
      throw new ApiError(400, "Job card ID is required");
    }

    // Find the job card by ID and populate related fields
    const jobCard = await JobCard.findById(id)
      .populate({
        path: "images",
        select: "image", // Only fetch the image URL
      })
      .populate({
        path: "worker",
        select: "workerName workerImage", // Only fetch worker name and image
      });

    if (!jobCard) {
      throw new ApiError(404, "Job card not found");
    }

    // Send the job card data as a response
    res
      .status(200)
      .json(new ApiResponse(200, jobCard, "Job card fetched successfully"));
  }
);

export const SearchJobCard = asyncHandler(
  async (req: Request, res: Response) => {
    let {
      page,
      limit,
      warranty,
      searchTerm,
      returned,
      pending,
      completed,
      billed,
    } = req.query;

    if (searchTerm && typeof searchTerm !== "string") {
      searchTerm = String(searchTerm); // Ensure searchTerm is a string
    }

    const search = searchTerm ? searchTerm : "";
    const pageNo: number = parseInt(page as string) || 1;
    const limitOf: number = parseInt(limit as string) || 10;

    if (isNaN(pageNo) || isNaN(limitOf) || pageNo < 1 || limitOf < 1) {
      throw new ApiError(400, "Invalid page or limit value");
    }

    const skip: number = (pageNo - 1) * limitOf;

    const query: any = {
      $or: [
        { customerName: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { jobCardNumber: { $regex: search, $options: "i" } },
        { DealerName: { $regex: search, $options: "i" } },
        { Make: { $regex: search, $options: "i" } },
        { SrNo: { $regex: search, $options: "i" } },
      ],
    };

    if (!isNaN(Number(search))) {
      const searchValue = Number(search);
      query.$or.push({ HP: searchValue });
      query.$or.push({ KVA: searchValue });
      query.$or.push({ RPM: searchValue });
    }

    if (warranty !== undefined) {
      query.warranty = warranty === "true";
    }

    if (returned !== undefined) {
      query.jobCardStatus = "Returned";
    }

    if (pending !== undefined) {
      query.jobCardStatus = "Pending";
    }

    if (completed !== undefined) {
      query.jobCardStatus = "Completed";
    }

    if (billed !== undefined) {
      query.jobCardStatus = "Billed";
    }

    const jobCards = await JobCard.find(query)
      .sort({ createdAt: -1 })
      .populate([
        { path: "images", select: "image" },
        { path: "worker", select: "workerName workerImage" },
      ])
      .skip(skip)
      .limit(limitOf)
      .lean();

    const processedJobCards = jobCards.map((jobCard) => ({
      ...jobCard,
      images: jobCard.images || null,
    }));

    const countOfDocuments = await JobCard.countDocuments(query);
    const totalPages = Math.ceil(countOfDocuments / limitOf);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          data: processedJobCards,
          countOfDocuments,
          totalPages,
          currentPage: pageNo,
        },
        "Successfully fetched"
      )
    );
  }
);

export const returnJobcard = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.query;

    // Check if ID is provided
    if (!id) {
      throw new ApiError(400, "ID is required");
    }

    // Find the job card by ID
    const jobTask = await JobCard.findById(id);
    if (!jobTask) {
      throw new ApiError(404, "Job card not found");
    }

    // Update the job card status to "Returned"
    jobTask.jobCardStatus = "Returned";
    await jobTask.save();

    // Send success response
    res
      .status(200)
      .json(new ApiResponse(200, null, "Job card returned successfully"));
  }
);

export const workDoneJobcard = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.query;

    // Check if ID is provided
    if (!id) {
      throw new ApiError(400, "ID is required");
    }

    // Find the job card by ID
    const jobTask = await JobCard.findById(id);
    if (!jobTask) {
      throw new ApiError(404, "Job card not found");
    }

    // Update the job card status to "Completed" and set the OutDate
    jobTask.jobCardStatus = "Completed";
    jobTask.OutDate = new Date(Date.now());
    await jobTask.save();

    // Send success response
    res
      .status(200)
      .json(new ApiResponse(200, null, "Job card work finished successfully"));
  }
);

export const billJobCard = asyncHandler(async (req: Request, res: Response) => {
  const { id, invoiceNumber } = req.query;

  // Check if ID and invoiceNumber are provided
  if (!id || !invoiceNumber) {
    throw new ApiError(400, "ID and invoice number are required");
  }

  // Find the job card by ID
  const jobTask = await JobCard.findById(id);
  if (!jobTask) {
    throw new ApiError(404, "Job card not found");
  }

  // Update the job card status to "Billed" and set invoice details
  jobTask.jobCardStatus = "Billed";
  jobTask.invoiceDate = new Date(Date.now());
  jobTask.invoiceNumber = invoiceNumber as string;
  await jobTask.save();

  // Send success response
  res
    .status(200)
    .json(new ApiResponse(200, null, "Job card billed successfully"));
});

export const reports = asyncHandler(async (req: Request, res: Response) => {
  // Define all possible statuses
  const allStatuses = ["Created", "Pending", "Returned", "Completed"];

  // Use aggregation to get counts for existing statuses
  const statusCounts = await JobCard.aggregate([
    {
      $group: {
        _id: "$jobCardStatus", // Group by jobCardStatus
        count: { $sum: 1 }, // Count the number of documents
      },
    },
  ]);

  // Transform the aggregation result into an object for easier merging
  const countsMap: Record<string, number> = statusCounts.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {} as Record<string, number>); // Initialize with an empty object

  // Ensure all statuses are included, defaulting to 0 for missing ones
  const finalCounts = allStatuses.map((status) => ({
    status,
    count: countsMap[status] || 0,
  }));

  // Send the counts as a response
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        finalCounts,
        "Job card status counts fetched successfully"
      )
    );
});
