import User from "../models/User.js";


export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -resetOtp -resetOtpExpiry -resetOtpAttempts -resetVerified"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });

  } catch (error) {
    console.error("Get Profile Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
    });
  }
};



export const updateProfile = async (req, res) => {
  try {
    const {
      name,
      mobile,
      interests,
      careerGoal,
    } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name !== undefined) {
      user.name = name;
    }

    if (mobile !== undefined) {
      const existingMobile = await User.findOne({
        mobile,
        _id: { $ne: user._id },
      });

      if (existingMobile) {
        return res.status(409).json({
          success: false,
          message: "Mobile number already in use",
        });
      }

      user.mobile = mobile;
    }

    if (interests !== undefined) {
      user.interests = interests;
    }

    if (careerGoal !== undefined) {
      user.careerGoal = careerGoal;
    }

    await user.save();

    const updatedUser = await User.findById(
      user._id
    ).select(
      "-password -resetOtp -resetOtpExpiry -resetOtpAttempts -resetVerified"
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });

  } catch (error) {
    console.error(
      "Update Profile Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error while updating profile",
    });
  }
};