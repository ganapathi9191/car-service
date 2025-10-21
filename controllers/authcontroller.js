import User from "../models/authModel.js";
import { generateToken, verifyToken } from "../utils/jwt.js";
import cloudinary from "../config/cloudinary.js";

// ✅ Step 1: Send OTP
export const sendOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber)
      return res.status(400).json({ success: false, message: "Phone number required" });

    let otp = "1234"; // static for demo
    let user = await User.findOne({ phoneNumber });

    if (!user) user = await User.create({ phoneNumber, otp });
    else user.otp = otp;

    await user.save();

    // generate temporary token
    const token = generateToken({ phoneNumber });

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      otp, // for testing purpose (remove in production)
      token
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Step 2: Verify OTP using token
export const verifyOTP = async (req, res) => {
  try {
    const { otp, token } = req.body;

    if (!otp || !token)
      return res.status(400).json({
        success: false,
        message: "Both OTP and token are required"
      });

    // Verify the token
    const decoded = verifyToken(token);
    const phoneNumber = decoded.phoneNumber;

    const user = await User.findOne({ phoneNumber });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (user.otp !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    // Mark verified and clear OTP
    user.isVerified = true;
    await user.save();

    // Generate long-term token (e.g., 7 days)
    const accessToken = generateToken({ phoneNumber, verified: true }, "7d");

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      accessToken
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Upload KYC Documents
export const uploadKYC = async (req, res) => {
   try {
    const { userId } = req.params;

    if (!req.files || !req.files.aadhaar || !req.files.drivingLicense) {
      return res.status(400).json({ success: false, message: "Both Aadhaar and Driving License are required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.kyc = {
      aadhaar: req.files.aadhaar[0].path,
      drivingLicense: req.files.drivingLicense[0].path,
      verified: false
    };

    await user.save();

    res.status(200).json({ success: true, message: "KYC uploaded successfully", kyc: user.kyc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Update User Profile
export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, phoneNumber } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;

    // Upload profile image if exists
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, { folder: "profile_images" });
      user.profileImage = result.secure_url;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};