
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
      filter.name = { $regex: search.trim(), $options: "i" };
    }

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .select("name description level image instructor createdAt")
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

const buildProgress = (course, completedLessonIds) => {
  const lessonIds = (course.lessons || [])
    .filter((lesson) => lesson._id)
    .map((lesson) => String(lesson._id));

  const completedSet = new Set(
    (completedLessonIds || []).map((id) => String(id))
  );

  const completedIds = lessonIds.filter((id) => completedSet.has(id));

  const totalLessons = lessonIds.length;
  const completedCount = completedIds.length;

  const percentage =
    totalLessons === 0
      ? 0
      : Math.round((completedCount / totalLessons) * 100);

  const status =
    totalLessons > 0 && completedCount === totalLessons
      ? "completed"
      : "in-progress";

  return { totalLessons, completedCount, percentage, status, completedIds };
};

export const getCourseContent = async (req, res) => {
  try {
    const { courseId } = req.params;
    const learnerId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid course id." });
    }

    const enrolment = await Enrolment.findOne({
      learner: learnerId,
      course: courseId,
    }).lean();

    if (!enrolment) {
      return res.status(403).json({
        success: false,
        message: "You must enrol in this course to view its lessons.",
      });
    }

    const course = await Course.findById(courseId)
      .populate("instructor", "name email")
      .lean();

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const progress = buildProgress(course, enrolment.progress.completedLessons);
    const completedSet = new Set(progress.completedIds);

    const lessons = (course.lessons || []).map((lesson) => ({
      _id: lesson._id,
      title: lesson.title,
      videoUrl: lesson.videoUrl,
      completed: completedSet.has(String(lesson._id)),
    }));

    return res.status(200).json({
      success: true,
      data: {
        course: {
          _id: course._id,
          name: course.name,
          description: course.description,
          level: course.level,
          image: course.image,
          instructor: course.instructor,
        },
        lessons,
        resources: course.resources || [],
        assessments: course.assessments || [],
        progress: {
          totalLessons: progress.totalLessons,
          completedLessons: progress.completedCount,
          percentage: progress.percentage,
          status: progress.status,
        },
      },
    });
  } catch (error) {
    console.error("getCourseContent error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load course content at this time.",
    });
  }
};

export const markLessonComplete = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const learnerId = req.user.id;

    if (
      !mongoose.Types.ObjectId.isValid(courseId) ||
      !mongoose.Types.ObjectId.isValid(lessonId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid course id or lesson id.",
      });
    }

    const course = await Course.findById(courseId).select("lessons").lean();

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const lessonExists = (course.lessons || []).some(
      (lesson) => lesson._id && String(lesson._id) === String(lessonId)
    );

    if (!lessonExists) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found in this course.",
      });
    }

    const enrolment = await Enrolment.findOne({
      learner: learnerId,
      course: courseId,
    });

    if (!enrolment) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course.",
      });
    }

    const alreadyDone = enrolment.progress.completedLessons.some(
      (id) => String(id) === String(lessonId)
    );

    if (!alreadyDone) {
      enrolment.progress.completedLessons.push(lessonId);
    }

    const progress = buildProgress(course, enrolment.progress.completedLessons);
    enrolment.progress.status = progress.status;

    await enrolment.save();

    return res.status(200).json({
      success: true,
      message: alreadyDone
        ? "Lesson was already marked as complete."
        : "Lesson marked as complete.",
      data: {
        courseId,
        lessonId,
        totalLessons: progress.totalLessons,
        completedLessons: progress.completedCount,
        percentage: progress.percentage,
        status: progress.status,
      },
    });
  } catch (error) {
    console.error("markLessonComplete error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update lesson progress at this time.",
    });
  }
};

export const getDashboard = async (req, res) => {
  try {
    const learnerId = req.user.id;

    const enrolments = await Enrolment.find({ learner: learnerId })
      .populate({
        path: "course",
        select: "name description level image instructor lessons",
        populate: { path: "instructor", select: "name" },
      })
      .sort({ enrolledAt: -1 })
      .lean();

    const courses = enrolments
      .filter((enrolment) => enrolment.course) // skip if a course no longer exists
      .map((enrolment) => {
        const course = enrolment.course;
        const progress = buildProgress(course, enrolment.progress.completedLessons);

        return {
          enrolmentId: enrolment._id,
          enrolledAt: enrolment.enrolledAt,
          course: {
            _id: course._id,
            name: course.name,
            description: course.description,
            level: course.level,
            image: course.image,
            instructor: course.instructor,
          },
          totalLessons: progress.totalLessons,
          completedLessons: progress.completedCount,
          percentage: progress.percentage,
          status: progress.status,
        };
      });

    const completedCourses = courses.filter((c) => c.status === "completed").length;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCourses: courses.length,
          completedCourses,
          inProgressCourses: courses.length - completedCourses,
        },
        courses,
      },
    });
  } catch (error) {
    console.error("getDashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load your dashboard at this time.",
    });
  }
};
