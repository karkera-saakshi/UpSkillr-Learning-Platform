import express from 'express';
const router = express.Router();

// Import JWT auth middleware
import { protect, adminOnly } from '../middleware/authMiddleware.js';

// Import file upload middleware
import { upload } from '../middleware/uploadMiddleware.js';

// Import course controller functions
import {
  createCourse,
  editCourse,
  publishCourse,
  addLesson,
  addResource,
  addAssessment,
} from '../controllers/courseController.js';

// Route: Create a new course
router.post('/', protect, adminOnly, createCourse);

// Route: Edit an existing course by ID
router.put('/:id', protect, adminOnly, editCourse);

// Route: Publish a course (partial update to status)
router.patch('/:id/publish', protect, adminOnly, publishCourse);

// Route: Add a lesson to a course
router.post(
  '/:id/lessons',
  protect,
  adminOnly,
  upload.single('video'),
  addLesson
);

// Route: Add a resource to a course
router.post(
  '/:id/resources',
  protect,
  adminOnly,
  upload.single('file'),
  addResource
);

// Route: Add an assessment to a course
router.post(
  '/:id/assessments',
  protect,
  adminOnly,
  upload.single('file'),
  addAssessment
);

export default router;