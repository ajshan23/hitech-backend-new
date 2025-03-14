import { Router } from "express";
import {
  createJobCardWithImages,
  addImagesToJobCard,
  SearchJobCard,
  returnJobcard,
  billJobCard,
  workDoneJobcard,
  reports,
  getSingleJobCard,
} from "../controllers/JobCardController";
import upload from "../helpers/MulterConfig"; // Multer middleware for file uploads

const router = Router();

// Create job card with images
router.post("/", upload.array("images", 5), createJobCardWithImages);

// Add images to an existing job card
router.post("/:id/images", upload.array("images", 5), addImagesToJobCard);

router.get("/:id", getSingleJobCard);

// Search job cards with filters and pagination
router.get("/", SearchJobCard);

router.put("/return", returnJobcard);

// Mark a job card as work done
router.put("/work-done", workDoneJobcard);

// Bill a job card
router.put("/bill", billJobCard);

// Get job card status counts for reports
router.get("/reports", reports);

export default router;
