import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiHandlerHelpers";
import { ApiResponse } from "../utils/apiHandlerHelpers";
import { JobCard, Counter } from "../models/jobCardModel";

import { deleteFileFromS3, handleMultipleFileUploads } from "../utils/uploader";
import { validateJobCardInput } from "../helpers/validation";
import { JobCardImage } from "../models/jobCardImage";
import { Types } from "mongoose";
import { buildSearchQuery } from "../helpers/queryBuilder";

export const createJobCardWithImages = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      console.log("Request Body:", req.body);
      console.log("Request Files:", req.files);

      // Validate required fields
      if (!req.body.customerName) {
        throw new ApiError(400, "Missing required field: customerName");
      }

      if (!req.body.customerAddress) {
        throw new ApiError(400, "Missing required field: customerAddress");
      }

      if (!req.body.phoneNumbers || req.body.phoneNumbers.length === 0) {
        throw new ApiError(400, "Missing or empty required field: phoneNumber");
      }

      // Parse phoneNumber as an array of strings
      const phoneNumber = Array.isArray(req.body.phoneNumbers)
        ? req.body.phoneNumbers
        : [req.body.phoneNumbers]; // Convert single string to array

      // Parse attachments as an array of strings
      const attachments = req.body.attachments || [];

      // Convert numeric fields to numbers (if provided)
      const HP = req.body.HP ? parseInt(req.body.HP) : undefined;
      const KVA = req.body.KVA ? parseInt(req.body.KVA) : undefined;
      const RPM = req.body.RPM ? parseInt(req.body.RPM) : undefined;

      // Prepare the job card data
      const jobCardData = {
        ...req.body,
        phoneNumber, // Array of strings
        HP: isNaN(HP!) ? undefined : HP,
        KVA: isNaN(KVA!) ? undefined : KVA,
        RPM: isNaN(RPM!) ? undefined : RPM,
        warranty: req.body.warranty === "true",
        attachments: attachments,
        Frame: req.body.Frame || undefined,
      };

      // Generate job card number
      const counter = await Counter.findOneAndUpdate(
        { _id: "jobCardNumber" },
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
      );
      const currentYear = new Date().getFullYear().toString().slice(-2);
      const jobCardNumber = `${counter.sequence_value}/${currentYear}`;

      // Create the job card
      const jobCard = new JobCard({
        ...jobCardData,
        jobCardNumber,
        jobCardStatus: "Pending",
      });

      // Handle file uploads (if any)
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        console.log("Files received:", req.files);
        const uploadResult = await handleMultipleFileUploads(req, req.files);
        if (!uploadResult.success || !uploadResult.uploadData) {
          throw new ApiError(400, "File upload failed");
        }
        console.log(uploadResult);

        const imageIds = [];
        for (const file of uploadResult.uploadData) {
          const fileType = file.mimetype.startsWith("image/") ? "image" : "pdf";
          const image = await JobCardImage.create({
            image: file.url,
            key: file.key,
            jobCardId: jobCard._id,
            fileType: fileType,
          });
          imageIds.push(new Types.ObjectId(image._id));
        }

        jobCard.images = imageIds;
      } else {
        console.log("No files uploaded.");
      }

      // Save the job card to the database
      await jobCard.save();

      // Send success response
      res
        .status(201)
        .json(new ApiResponse(201, jobCard, "Job card created successfully"));
    } catch (error) {
      console.error("Error creating job card:", error);
      res.status(500).json(new ApiResponse(500, null, "Internal Server Error"));
    }
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
        select: "image fileType", // Only fetch the image URL
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
export const pendingJobcard = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.query;

    // Check if ID is provided
    if (!id) {
      throw new ApiError(400, "ID is required");
    }

    // Ensure id is a string
    if (typeof id !== "string") {
      throw new ApiError(400, "ID must be a string");
    }

    // Validate if the ID is a valid MongoDB ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid ID format");
    }

    // Find the job card by ID
    const jobTask = await JobCard.findById(id);
    if (!jobTask) {
      throw new ApiError(404, "Job card not found");
    }

    // Update the job card status to "Pending"
    jobTask.jobCardStatus = "Pending";
    await jobTask.save();

    // Send success response
    res
      .status(200)
      .json(
        new ApiResponse(200, null, "Job card marked as pending successfully")
      );
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

export const editJobCard = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { invoiceNumber, removedImages, ...updatedData } = req.body;
  console.log("hitting this ");

  // Debugging: Log removedImages
  console.log("removedImages received:", removedImages);

  // Debugging: Log req.files
  console.log("Files received:", req.files);

  // Check if job card exists
  const jobCard = await JobCard.findById(id).populate("images");
  if (!jobCard) {
    throw new ApiError(404, "Job card not found");
  }

  // Parse phoneNumber as an array of strings
  if (updatedData.phoneNumber) {
    updatedData.phoneNumber = Array.isArray(updatedData.phoneNumber)
      ? updatedData.phoneNumber
      : [updatedData.phoneNumber]; // Convert single string to array
  }

  // Handle new file uploads (images/PDFs)
  if (req.files && Array.isArray(req.files)) {
    console.log("Uploading new files..."); // Debugging: Log file upload start
    const uploadResult = await handleMultipleFileUploads(req, req.files);
    console.log("Upload Result:", uploadResult); // Debugging: Log upload result

    if (!uploadResult.success || !uploadResult.uploadData) {
      throw new ApiError(400, "File upload failed");
    }

    // Save new images/PDFs to the database
    const newImageIds = [];
    for (const file of uploadResult.uploadData) {
      const fileType = file.mimetype.startsWith("image/") ? "image" : "pdf";
      const image = await JobCardImage.create({
        image: file.url,
        key: file.key,
        jobCardId: jobCard._id,
        fileType: fileType,
      });
      newImageIds.push(new Types.ObjectId(image._id));
    }
    console.log("New Image IDs:", newImageIds); // Debugging: Log new image IDs

    // Append new images/PDFs to the existing ones
    updatedData.images = [
      ...jobCard.images.map((img) => img._id),
      ...newImageIds,
    ];
  }

  // Handle removed images/PDFs
  if (removedImages && removedImages.length > 0) {
    console.log("Removing images/PDFs:", removedImages); // Debugging: Log removed files

    // Delete each removed image/PDF from S3 and the database
    for (const imageId of removedImages) {
      const image = await JobCardImage.findById(imageId);
      if (image) {
        await deleteFileFromS3(image.key); // Delete from S3
        await JobCardImage.findByIdAndDelete(imageId); // Delete from the database
      }
    }

    // Update the images array in the job card by filtering out removed IDs
    updatedData.images = updatedData.images.filter(
      (imgId: Types.ObjectId) => !removedImages.includes(imgId.toString())
    );
  }

  // Update the job card
  const updatedJobCard = await JobCard.findByIdAndUpdate(id, updatedData, {
    new: true,
  }).populate("images");

  if (!updatedJobCard) {
    throw new ApiError(500, "Failed to update job card");
  }

  // Send success response
  res
    .status(200)
    .json(
      new ApiResponse(200, updatedJobCard, "Job card updated successfully")
    );
});
