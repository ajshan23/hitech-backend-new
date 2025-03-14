import { Router } from "express";
import {
  createOnSiteComplaint,
  editOnSiteComplaint,
  assignWorkerToComplaint,
  updateComplaintStatus,
  updatePaymentStatus,
} from "../controllers/onSiteJobController";

const router = Router();

// Create OnSite complaint
router.post("", createOnSiteComplaint);

// Edit OnSite complaint
router.put("/:id", editOnSiteComplaint);

// Assign worker to OnSite complaint
router.put("/:id/assign-worker", assignWorkerToComplaint);

// Update complaint status
router.put("/:id/status", updateComplaintStatus);

// Update payment status
router.put("/:id/payment-status", updatePaymentStatus);

export default router;
