import express from "express";
import {
  registerUser,
  registerAdmin,
  loginUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();


router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/admin/register", registerAdmin);

router.post(
  "/forgot-password",
  forgotPassword
);

router.post(
  "/verify-otp",
  verifyOtp
);

router.post(
  "/reset-password",
  resetPassword
);


export default router;