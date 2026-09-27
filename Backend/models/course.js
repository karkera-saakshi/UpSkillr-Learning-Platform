import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Course description is required'],
      trim: true,
    },
    level: {
      type: String,
      required: [true, 'Course level is required'],
      enum: {
        values: ['Beginner', 'Intermediate', 'Advanced'],
        message: '{VALUE} is not a valid level',
      },
    },
    image: {
      type: String,
      default: '',
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor is required'],
    },
    status: {
      type: String,
      required: [true, 'Course status is required'],
      enum: {
        values: ['draft', 'published'],
        message: '{VALUE} is not a valid status',
      },
      default: 'draft',
    },
    lessons: {
      type: [Object],
      default: [],
    },
    resources: {
      type: [Object],
      default: [],
    },
    assessments: {
      type: [Object],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Course = mongoose.model('Course', courseSchema);

export default Course;