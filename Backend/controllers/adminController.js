
import mongoose from "mongoose";
import User from "../models/user.js";
import Course from "../models/course.js";
import Enrolment from "../models/enrolment.js";

// Fields that must never be sent back when listing users.
const HIDDEN_USER_FIELDS =
  "-password -resetOtp -resetOtpExpiry -resetOtpAttempts -resetVerified";

const parsePaging = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 12, 1), 50);
  return { page, limit };
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getSystemStats = async (req, res) => {
  try {
    const [
      totalUsers,
      learners,
      instructors,
      admins,
      totalCourses,
      publishedCourses,
      draftCourses,
      totalEnrolments,
      completedEnrolments,
      recentUsers,
      recentCourses,
      recentEnrolments,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "learner" }),
      User.countDocuments({ role: "instructor" }),
      User.countDocuments({ role: "admin" }),
      Course.countDocuments(),
      Course.countDocuments({ status: "published" }),
      Course.countDocuments({ status: "draft" }),
      Enrolment.countDocuments(),
      Enrolment.countDocuments({ "progress.status": "completed" }),
      User.find()
        .select("name email role createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Course.find()
        .select("name status instructor createdAt")
        .populate("instructor", "name")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Enrolment.find()
        .populate("learner", "name")
        .populate("course", "name")
        .sort({ enrolledAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          learners,
          instructors,
          admins,
        },
        courses: {
          total: totalCourses,
          published: publishedCourses,
          draft: draftCourses,
        },
        enrolments: {
          total: totalEnrolments,
          completed: completedEnrolments,
          inProgress: totalEnrolments - completedEnrolments,
        },
        recentActivity: {
          newUsers: recentUsers,
          newCourses: recentCourses,
          newEnrolments: recentEnrolments.map((enrolment) => ({
            _id: enrolment._id,
            learner: enrolment.learner ? enrolment.learner.name : null,
            course: enrolment.course ? enrolment.course.name : null,
            enrolledAt: enrolment.enrolledAt,
            status: enrolment.progress ? enrolment.progress.status : null,
          })),
        },
      },
    });
  } catch (error) {
    console.error("getSystemStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load system statistics at this time.",
    });
  }
};

export const getAllCourses = async (req, res) => {
  try {
    const { status = "", search = "" } = req.query;
    const { page, limit } = parsePaging(req.query);

    const filter = {};

    if (status) {
      if (!["draft", "published"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be either draft or published.",
        });
      }
      filter.status = status;
    }

    if (search.trim()) {
      filter.name = { $regex: escapeRegex(search.trim()), $options: "i" };
    }

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .select(
          "name description level image status instructor lessons resources assessments createdAt"
        )
        .populate("instructor", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Course.countDocuments(filter),
    ]);

    const enrolmentCounts = await Promise.all(
      courses.map((course) => Enrolment.countDocuments({ course: course._id }))
    );

    const data = courses.map((course, index) => ({
      _id: course._id,
      name: course.name,
      description: course.description,
      level: course.level,
      image: course.image,
      status: course.status,
      instructor: course.instructor,
      createdAt: course.createdAt,
      lessonsCount: (course.lessons || []).length,
      resourcesCount: (course.resources || []).length,
      assessmentsCount: (course.assessments || []).length,
      enrolmentCount: enrolmentCounts[index],
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("getAllCourses error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch courses at this time.",
    });
  }
};

export const getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid course id." });
    }

    const course = await Course.findById(courseId)
      .populate("instructor", "name email")
      .lean();

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const [enrolmentCount, completedCount] = await Promise.all([
      Enrolment.countDocuments({ course: courseId }),
      Enrolment.countDocuments({ course: courseId, "progress.status": "completed" }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ...course,
        enrolmentCount,
        completedCount,
      },
    });
  } catch (error) {
    console.error("getCourseDetails error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch the course at this time.",
    });
  }
};

export const unpublishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid course id." });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    if (course.status !== "published") {
      return res.status(400).json({
        success: false,
        message: "This course is already unpublished (draft).",
      });
    }

    course.status = "draft";
    await course.save();

    return res.status(200).json({
      success: true,
      message: "Course unpublished successfully.",
      data: { _id: course._id, name: course.name, status: course.status },
    });
  } catch (error) {
    console.error("unpublishCourse error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to unpublish the course at this time.",
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { role = "", search = "" } = req.query;
    const { page, limit } = parsePaging(req.query);

    const filter = {};

    if (role) {
      if (!["learner", "instructor", "admin"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Role must be learner, instructor or admin.",
        });
      }
      filter.role = role;
    }

    if (search.trim()) {
      const pattern = { $regex: escapeRegex(search.trim()), $options: "i" };
      filter.$or = [{ name: pattern }, { email: pattern }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(HIDDEN_USER_FIELDS)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("getAllUsers error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch users at this time.",
    });
  }
};
