import Course from '../models/course.js';

export const createCourse = async (req, res) => {
  try {
    const {
      name,
      description,
      level,
      image,
      status,
    } = req.body;

    if (!name || !description || !level) {
      return res.status(400).json({
        success: false,
        message:
          "Name, description and level are required",
      });
    }

    const course = await Course.create({
      name,
      description,
      level,
      image,
      instructor: req.user.id,
      status
    });

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      course,
    });

  } catch (error) {
    console.error("Create Course Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while creating course",
    });
  }
};


export const editCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to edit this course",
      });
    }

    const {
      name,
      description,
      level,
      image,
    } = req.body;

    if (name) course.name = name;
    if (description) course.description = description;
    if (level) course.level = level;
    if (image) course.image = image;

    await course.save();

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      course,
    });

  } catch (error) {
    console.error("Edit Course Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while updating course",
    });
  }
};


export const publishCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to publish this course",
      });
    }

    course.status = "published";

    await course.save();

    res.status(200).json({
      success: true,
      message: "Course published successfully",
      course,
    });

  } catch (error) {
    console.error("Publish Course Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while publishing course",
    });
  }
};

export const addLesson = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this course",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video file is required",
      });
    }

    const { title } = req.body;

    const newLesson = {
      title,
      videoUrl: req.file.path,
    };

    course.lessons.push(newLesson);

    await course.save();

    res.status(201).json({
      success: true,
      message: "Lesson added successfully",
      course,
    });

  } catch (error) {
    console.error("Add Lesson Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while adding lesson",
    });
  }
};


export const addResource = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this course",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "PDF file is required",
      });
    }

    const { title } = req.body;

    const newResource = {
      title,
      fileUrl: req.file.path,
    };

    course.resources.push(newResource);

    await course.save();

    res.status(201).json({
      success: true,
      message: "Resource added successfully",
      course,
    });

  } catch (error) {
    console.error("Add Resource Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while adding resource",
    });
  }
};

export const addAssessment = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this course",
      });
    }

    const { title, link } = req.body;

    if (!req.file && !link) {
      return res.status(400).json({
        success: false,
        message: "Provide either a file or a link for the assessment",
      });
    }

    const newAssessment = {
      title,
      fileUrl: req.file ? req.file.path : undefined,
      link: link || undefined,
    };

    course.assessments.push(newAssessment);

    await course.save();

    res.status(201).json({
      success: true,
      message: "Assessment added successfully",
      course,
    });

  } catch (error) {
    console.error("Add Assessment Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while adding assessment",
    });
  }
};