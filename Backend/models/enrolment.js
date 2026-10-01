import mongoose from "mongoose";

const enrolmentSchema = new mongoose.Schema(
  {
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    progress: {
      completedLessons: {
        type: [mongoose.Schema.Types.ObjectId],
        default: [],
      },
      status: {
        type: String,
        enum: ["in-progress", "completed"],
        default: "in-progress",
      },
    },
  },
  { timestamps: true }
);

// A learner can enrol in a given course only once
enrolmentSchema.index({ learner: 1, course: 1 }, { unique: true });

const Enrolment = mongoose.model("Enrolment", enrolmentSchema);

export default Enrolment;