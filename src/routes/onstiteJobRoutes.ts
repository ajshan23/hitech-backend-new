import { Router } from "express";
import {
  createOnSiteComplaint,
  editOnSiteComplaint,
  assignWorkerToComplaint,
  updateComplaintStatus,
  updatePaymentStatus,
  searchOnSiteComplaints,
  getOnSiteComplaintById,
} from "../controllers/onSiteJobController";

const router = Router();

// Create OnSite complaint
router.post("/", createOnSiteComplaint);

// Search OnSite complaints
router.get("/", searchOnSiteComplaints);

// Assign worker to OnSite complaint
router.put("/:id/assign-worker", assignWorkerToComplaint);

// Update complaint status
router.put("/:id/status", updateComplaintStatus);

// Update payment status
router.put("/:id/payment-status", updatePaymentStatus);

// Get OnSite complaint by ID
router.get("/:id", getOnSiteComplaintById);

// Edit OnSite complaint
router.put("/:id", editOnSiteComplaint);

export default router;
