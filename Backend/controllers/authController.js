import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import generateToken from "../utils/generateToken.js";
import generateOtp from "../utils/generateOtp.js";

export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      password,
    } = req.body;

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, mobile and password are required",
      });
    }

    const existingEmail = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const existingMobile = await User.findOne({
      mobile,
    });

    if (existingMobile) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      mobile,
      password: hashedPassword,
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "Registration successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Register Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};


export const loginUser = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Login Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};


export const forgotPassword = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    const user = await User.findOne({
      mobile,
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this mobile number, an OTP has been sent.",
      });
    }

    const otp = generateOtp();

    const expiry = new Date(
      Date.now() + 5 * 60 * 1000
    );

    user.resetOtp = await bcrypt.hash(otp, 10);
    user.resetOtpExpiry = expiry;
    user.resetOtpAttempts = 0;
    user.resetVerified = false;

    await user.save();

    console.log(
      `Password Reset OTP for ${mobile}: ${otp}`
    );

    res.status(200).json({
      success: true,
      message:
        "If an account exists with this mobile number, an OTP has been sent.",
    });

  } catch (error) {
    console.error(
      "Forgot Password Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while requesting password reset",
    });
  }
};


export const verifyOtp = async (req, res) => {
  try {
    const {
      mobile,
      otp,
    } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Mobile number and OTP are required",
      });
    }

    const user = await User.findOne({
      mobile,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (user.resetOtpAttempts >= 5) {
      return res.status(429).json({
        success: false,
        message:
          "Too many OTP attempts. Please request a new OTP.",
      });
    }

    if (
      !user.resetOtp ||
      !user.resetOtpExpiry
    ) {
      return res.status(400).json({
        success: false,
        message:
          "OTP not found. Please request a new OTP.",
      });
    }

    if (
      new Date() >
      user.resetOtpExpiry
    ) {
      user.resetOtp = null;
      user.resetOtpExpiry = null;
      user.resetOtpAttempts = 0;

      await user.save();

      return res.status(400).json({
        success: false,
        message:
          "OTP has expired. Please request a new OTP.",
      });
    }

    user.resetOtpAttempts += 1;

    const otpMatch = await bcrypt.compare(
      otp,
      user.resetOtp
    );

    if (!otpMatch) {
      await user.save();

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.resetVerified = true;
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    user.resetOtpAttempts = 0;

    await user.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });

  } catch (error) {
    console.error(
      "Verify OTP Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while verifying OTP",
    });
  }
};


export const resetPassword = async (req, res) => {
  try {
    const {
      mobile,
      newPassword,
    } = req.body;

    if (!mobile || !newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Mobile number and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long",
      });
    }

    const user = await User.findOne({
      mobile,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Unable to reset password",
      });
    }

    if (!user.resetVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Please verify OTP before resetting password",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        10
      );

    user.password = hashedPassword;

    user.resetVerified = false;
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    user.resetOtpAttempts = 0;

    await user.save();

    res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now login.",
    });

  } catch (error) {
    console.error(
      "Reset Password Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while resetting password",
    });
  }
};

export const registerAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      password,
      adminKey,
    } = req.body;

    if (
      !name ||
      !email ||
      !mobile ||
      !password ||
      !adminKey
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, mobile, password and admin key are required",
      });
    }

    if (
      adminKey !==
      process.env.ADMIN_REGISTRATION_KEY
    ) {
      return res.status(403).json({
        success: false,
        message: "Invalid admin registration key",
      });
    }

    const existingEmail = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const existingMobile = await User.findOne({
      mobile,
    });

    if (existingMobile) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already registered",
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      mobile,
      password: hashedPassword,
      role: "admin",
    });

    const token = generateToken(admin);

    res.status(201).json({
      success: true,
      message: "Admin registration successful",

      token,

      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        mobile: admin.mobile,
        role: admin.role,
      },
    });

  } catch (error) {
    console.error(
      "Admin Register Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error during admin registration",
    });
  }
};