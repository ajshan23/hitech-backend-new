import { Router } from "express";
import {
  createWorker,
  workerList,
  getASpecificWorker,
  editAWorker,
  changeStatus,
  listAvailableWorkers,
  assignWorker,
  editWorkerImage,
} from "../controllers/workerController";
import upload from "../helpers/MulterConfig";

const router = Router();

// Create Worker
router.post("", upload.single("image"), createWorker);

// Get Worker List
router.get("", workerList);

// Get a Specific Worker
router.get("/specific", getASpecificWorker);

router.put("/edit", upload.single("image"), editAWorker);

// Change Worker Status
router.put("/change-status", changeStatus);

// List Available Workers
router.get("/available", listAvailableWorkers);

// Assign Worker to Job Card
router.put("/assign", assignWorker);

// Edit Worker Image
router.put("/:id/image", upload.single("image"), editWorkerImage);

export default router;
