
import mongoose from "mongoose";
import Course from "../models/course.js";
import Enrolment from "../models/enrolment.js";


export const browseCourses = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 12 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);

    const filter = { status: "published" };

    if (search.trim()) {
      filter.title = { $regex: search.trim(), $options: "i" };
    }

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .select("title description instructor createdAt")
        .populate("instructor", "name email")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Course.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: courses,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error("browseCourses error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch courses at this time.",
    });
  }
};


export const enrolInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const learnerId = req.user && req.user.id;
    const role = req.user && req.user.role;

    if (!learnerId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    if (role !== "learner") {
      return res.status(403).json({
        success: false,
        message: "Only learners can enrol in courses.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid course id." });
    }

    const course = await Course.findById(courseId).lean();

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    if (course.status !== "published") {
      return res.status(400).json({
        success: false,
        message: "This course is not currently available for enrolment.",
      });
    }

    const existingEnrolment = await Enrolment.findOne({
      learner: learnerId,
      course: courseId,
    });

    if (existingEnrolment) {
      return res.status(409).json({
        success: false,
        message: "You are already enrolled in this course.",
        data: existingEnrolment,
      });
    }

    const enrolment = await Enrolment.create({
      learner: learnerId,
      course: courseId,
      enrolledAt: new Date(),
      progress: {
        completedLessons: [],
        status: "in-progress",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Enrolled successfully.",
      data: enrolment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You are already enrolled in this course.",
      });
    }

    console.error("enrolInCourse error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to complete enrolment at this time.",
    });
  }
};
