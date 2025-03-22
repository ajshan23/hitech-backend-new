import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiHandlerHelpers";
import { ApiResponse } from "../utils/apiHandlerHelpers";
import { OnSiteJob } from "../models/onSiteModel";
import Worker from "../models/workerModel";

// Create OnSite complaint
export const createOnSiteComplaint = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      customerName,
      customerAddress,
      complaintNumber,
      phoneNumbers,
      make,
      dealerName,
      warrantyStatus,
      reportedComplaint,
    } = req.body;

    // Validate required fields
    if (!customerName || !customerAddress || !phoneNumbers) {
      throw new ApiError(
        400,
        "customerName, customerAddress, and phoneNumbers are required"
      );
    }

    // Check if complaint number already exists (if provided)
    if (complaintNumber) {
      const existingComplaint = await OnSiteJob.findOne({ complaintNumber });
      if (existingComplaint) {
        throw new ApiError(400, "Complaint number already exists");
      }
    }

    // Create new complaint
    const newComplaint = await OnSiteJob.create({
      customerName,
      customerAddress,
      complaintNumber: complaintNumber || null, // Optional
      phoneNumbers,
      make: make || null, // Optional
      dealerName: dealerName || null, // Optional
      warrantyStatus: warrantyStatus || "Non-Warranty", // Default to "Non-Warranty" if not provided
      reportedComplaint: reportedComplaint || null, // Optional
      complaintStatus: "Pending", // Default status
      paymentStatus: "Pending", // Default payment status
    });

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          newComplaint,
          "On-site complaint created successfully"
        )
      );
  }
);
export const editOnSiteComplaint = asyncHandler(
  async (req: Request, res: Response) => {
    const complaintId = req.params.id;
    const {
      customerName,
      customerAddress,
      phoneNumbers,
      make,
      reportedComplaint,
      dealerName,
      warrantyStatus,
      complaintDetails,
    } = req.body;

    // Validate required fields
    if (!customerName || !customerAddress || !phoneNumbers) {
      throw new ApiError(
        400,
        "customerName, customerAddress, and phoneNumbers are required"
      );
    }

    // Find and update complaint
    const complaint = await OnSiteJob.findById(complaintId);
    if (!complaint) {
      throw new ApiError(404, "Complaint not found");
    }

    // Update fields
    complaint.customerName = customerName;
    complaint.customerAddress = customerAddress;
    complaint.phoneNumbers = phoneNumbers;
    complaint.make = make || complaint.make; // Optional
    complaint.reportedComplaint =
      reportedComplaint || complaint.reportedComplaint; // Optional
    complaint.dealerName = dealerName || complaint.dealerName; // Optional
    complaint.warrantyStatus = warrantyStatus || complaint.warrantyStatus; // Optional
    complaint.complaintDetails = complaintDetails || complaint.complaintDetails; // Optional

    await complaint.save();

    res
      .status(200)
      .json(new ApiResponse(200, complaint, "Complaint updated successfully"));
  }
);
export const getOnSiteComplaintById = asyncHandler(
  async (req: Request, res: Response) => {
    const complaintId = req.params.id;

    // Validate complaint ID
    if (!complaintId) {
      throw new ApiError(400, "Complaint ID is required");
    }

    // Find the complaint by ID and populate the attendedPerson field
    const complaint = await OnSiteJob.findById(complaintId).populate({
      path: "attendedPerson",
      select: "workerName workerImage", // Populate worker details
    });

    // Check if complaint exists
    if (!complaint) {
      throw new ApiError(404, "Complaint not found");
    }

    // Send the response
    res
      .status(200)
      .json(new ApiResponse(200, complaint, "Complaint fetched successfully"));
  }
);

// Assign Worker to OnSite complaint
export const assignWorkerToComplaint = asyncHandler(
  async (req: Request, res: Response) => {
    const { workerId } = req.body;
    const complaintId = req.params.id;

    // Validate workerId
    if (!workerId) {
      throw new ApiError(400, "Worker ID is required");
    }

    // Check if worker exists
    const worker = await Worker.findById(workerId);
    if (!worker) {
      throw new ApiError(404, "Worker not found");
    }

    // Find and update complaint
    const complaint = await OnSiteJob.findById(complaintId);
    if (!complaint) {
      throw new ApiError(404, "Complaint not found");
    }

    complaint.attendedPerson = workerId;
    await complaint.save();

    res
      .status(200)
      .json(new ApiResponse(200, complaint, "Worker assigned successfully"));
  }
);

// Update Complaint Status
export const updateComplaintStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const complaintId = req.params.id;
    const { complaintStatus } = req.body;

    // Validate complaint status
    if (!["Pending", "Closed", "Sent to Workshop"].includes(complaintStatus)) {
      throw new ApiError(400, "Invalid complaint status");
    }

    // Find and update complaint
    const complaint = await OnSiteJob.findById(complaintId);
    if (!complaint) {
      throw new ApiError(404, "Complaint not found");
    }

    complaint.complaintStatus = complaintStatus;
    await complaint.save();

    res
      .status(200)
      .json(
        new ApiResponse(200, complaint, "Complaint status updated successfully")
      );
  }
);

// Update Payment Status
export const updatePaymentStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const complaintId = req.params.id;
    const { paymentStatus } = req.body;

    // Validate payment status
    if (!["Pending", "Paid"].includes(paymentStatus)) {
      throw new ApiError(400, "Invalid payment status");
    }

    // Find and update complaint
    const complaint = await OnSiteJob.findById(complaintId);
    if (!complaint) {
      throw new ApiError(404, "Complaint not found");
    }

    complaint.paymentStatus = paymentStatus;
    await complaint.save();

    res
      .status(200)
      .json(
        new ApiResponse(200, complaint, "Payment status updated successfully")
      );
  }
);

export const searchOnSiteComplaints = asyncHandler(
  async (req: Request, res: Response) => {
    let { page, limit, warrantyStatus, searchTerm, complaintStatus } =
      req.query;

    console.log("Request Query:", req.query); // Log the incoming query

    // Ensure searchTerm is a string
    if (searchTerm && typeof searchTerm !== "string") {
      searchTerm = String(searchTerm);
    }

    const search = searchTerm ? searchTerm : "";
    const pageNo: number = parseInt(page as string) || 1;
    const limitOf: number = parseInt(limit as string) || 10;

    // Validate page and limit
    if (isNaN(pageNo) || isNaN(limitOf) || pageNo < 1 || limitOf < 1) {
      throw new ApiError(400, "Invalid page or limit value");
    }

    const skip: number = (pageNo - 1) * limitOf;

    // Build the query
    const query: any = {};
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { customerAddress: { $regex: search, $options: "i" } },
        { complaintNumber: { $regex: search, $options: "i" } },
        { make: { $regex: search, $options: "i" } },
        { dealerName: { $regex: search, $options: "i" } },
        { reportedComplaint: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by warrantyStatus
    if (warrantyStatus !== undefined) {
      if (warrantyStatus === "true") {
        // Include only warranty complaints
        query.warrantyStatus = "Warranty";
      } else if (warrantyStatus === "false") {
        // Include both warranty and non-warranty complaints
        // Do not add any warrantyStatus filter
      }
    }

    // Filter by complaint status
    if (complaintStatus) {
      query.complaintStatus = complaintStatus;
    }

    console.log("Final Query:", query); // Log the final query

    // Fetch complaints with pagination
    const complaints = await OnSiteJob.find(query)
      .sort({ createdAt: -1 }) // Sort by creation date (newest first)
      .populate({
        path: "attendedPerson",
        select: "workerName workerImage", // Populate worker details
      })
      .skip(skip)
      .limit(limitOf)
      .lean();

    // Count total documents for pagination
    const countOfDocuments = await OnSiteJob.countDocuments(query);
    const totalPages = Math.ceil(countOfDocuments / limitOf);

    // Send response
    res.status(200).json(
      new ApiResponse(
        200,
        {
          data: complaints,
          countOfDocuments,
          totalPages,
          currentPage: pageNo,
        },
        "Successfully fetched complaints"
      )
    );
  }
);
