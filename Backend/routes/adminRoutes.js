import express from "express";

import { protect, authorize } from "../middleware/authMiddleware.js";

import {
  getSystemStats,
  getAllCourses,
  getCourseDetails,
  unpublishCourse,
  getAllUsers,
} from "../controllers/adminController.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/stats", getSystemStats);

router.get("/courses", getAllCourses);
router.get("/courses/:courseId", getCourseDetails);
router.patch("/courses/:courseId/unpublish", unpublishCourse);
router.get("/users", getAllUsers);

export default router;
