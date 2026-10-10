import express from "express";

import { protect, authorize } from "../middleware/authMiddleware.js";

import {
  browseCourses,
  enrolInCourse,
  getCourseContent,
  markLessonComplete,
  getDashboard,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/", protect, browseCourses);

router.get("/dashboard", protect, authorize("learner"), getDashboard);

router.post("/:courseId/enrol", protect, authorize("learner"), enrolInCourse);

router.get("/:courseId/learn", protect, authorize("learner"), getCourseContent);

router.post(
  "/:courseId/lessons/:lessonId/complete",
  protect,
  authorize("learner"),
  markLessonComplete
);

export default router;
