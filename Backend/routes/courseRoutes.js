import express from 'express';
const router = express.Router();

// Import JWT auth middleware
import { protect, adminOnly } from '../middleware/authMiddleware.js';

// Import course controller functions
import {
  createCourse,
  editCourse,
  publishCourse,
} from '../controllers/courseController.js';

// Route: Create a new course
router.post('/', protect, adminOnly, createCourse);

// Route: Edit an existing course by ID
router.put('/:id', protect, adminOnly, editCourse);

// Route: Publish a course (partial update to status)
router.patch('/:id/publish', protect, adminOnly, publishCourse);

export default router;