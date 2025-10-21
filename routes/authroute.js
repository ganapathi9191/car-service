import express from "express";
import { sendOTP, verifyOTP, uploadKYC,updateProfile } from "../controllers/authcontroller.js";
import upload from "../utils/multer.js"; // Import the Cloudinary upload config

const router = express.Router();

router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);

// Use the Cloudinary storage upload instead of local temp storage
router.post("/upload-kyc/:userId", upload.fields([
  { name: "aadhaar", maxCount: 1 },
  { name: "drivingLicense", maxCount: 1 }
]), uploadKYC);

router.put("/update-profile/:userId", upload.single("profileImage"), updateProfile);

export default router;