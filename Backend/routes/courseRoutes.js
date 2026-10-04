import express from 'express';
const router = express.Router();
import { protect, authorize } from '../middleware/authMiddleware.js';

import { upload } from '../middleware/uploadMiddleware.js';

import {
  createCourse,
  editCourse,
  publishCourse,
  addLesson,
  addResource,
  addAssessment,
} from '../controllers/courseController.js';

router.post('/', protect, authorize('instructor'), createCourse);

router.put('/:id', protect, authorize('instructor'), editCourse);

router.patch('/:id/publish', protect, authorize('instructor'), publishCourse);

router.post(
  '/:id/lessons',
  protect,
  authorize('instructor'),
  upload.single('video'),
  addLesson
);

router.post(
  '/:id/resources',
  protect,
  authorize('instructor'),
  upload.single('file'),
  addResource
);

router.post(
  '/:id/assessments',
  protect,
  authorize('instructor'),
  upload.single('file'),
  addAssessment
);

export default router;