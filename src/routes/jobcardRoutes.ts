// routes/JobCardRoutes.ts
import { Router } from "express";
import {
  createJobCardWithImages,
  addImagesToJobCard,
  SearchJobCard,
  returnJobcard,
  billJobCard,
  workDoneJobcard,
  pendingJobcard, // Add this import
  reports,
  getSingleJobCard,
  editJobCard,
} from "../controllers/JobCardController";
import upload from "../helpers/MulterConfig";

const router = Router();

// Create job card with images
router.post("/", upload.array("files", 5), createJobCardWithImages);

// Add images to an existing job card
router.post("/:id/images", upload.array("files", 5), addImagesToJobCard);

// Search job cards with filters and pagination
router.get("/", SearchJobCard);

// Get job card status counts for reports
router.get("/reports", reports);

// Mark a job card as work done
router.put("/work-done", workDoneJobcard);

// Mark a job card as pending
router.put("/pending", pendingJobcard); // Add this route

// Bill a job card
router.put("/bill", billJobCard);

// Return a job card
router.put("/return", returnJobcard);

// Get a single job card by ID
router.get("/:id", getSingleJobCard);

// Edit a job card by ID
router.put("/:id", upload.array("files", 5), editJobCard);

export default router;