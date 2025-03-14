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
      attendedPerson,
    } = req.body;

    // Validate required fields
    if (
      !customerName ||
      !customerAddress ||
      !complaintNumber ||
      !phoneNumbers ||
      !make ||
      !warrantyStatus ||
      !reportedComplaint ||
      !attendedPerson
    ) {
      throw new ApiError(400, "All fields are required");
    }

    // Check if complaint number already exists
    const existingComplaint = await OnSiteJob.findOne({ complaintNumber });
    if (existingComplaint) {
      throw new ApiError(400, "Complaint number already exists");
    }

    // Create new complaint
    const newComplaint = await OnSiteJob.create({
      customerName,
      customerAddress,
      complaintNumber,
      phoneNumbers,
      make,
      dealerName,
      warrantyStatus,
      reportedComplaint,
      complaintStatus: "Pending", // Default status
      paymentStatus: "Pending", // Default payment status
      attendedPerson,
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

// Edit OnSite complaint
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
    if (
      !customerName ||
      !customerAddress ||
      !phoneNumbers ||
      !make ||
      !reportedComplaint ||
      !warrantyStatus
    ) {
      throw new ApiError(400, "Missing required fields");
    }

    // Find and update complaint
    const complaint = await OnSiteJob.findById(complaintId);
    if (!complaint) {
      throw new ApiError(404, "Complaint not found");
    }

    complaint.customerName = customerName;
    complaint.customerAddress = customerAddress;
    complaint.phoneNumbers = phoneNumbers;
    complaint.make = make;
    complaint.reportedComplaint = reportedComplaint;
    complaint.dealerName = dealerName;
    complaint.warrantyStatus = warrantyStatus;
    complaint.complaintDetails = complaintDetails;

    await complaint.save();

    res
      .status(200)
      .json(new ApiResponse(200, complaint, "Complaint updated successfully"));
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
