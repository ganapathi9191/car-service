import User from "../models/authModel.js";
import { generateToken, verifyToken  } from "../utils/jwt.js";
import cloudinary from "../config/cloudinary.js";
import Banner from "../models/bannerModel.js";
import jwt from "jsonwebtoken";

// Helper: Generate referral code
const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// 📌 REGISTER USER
export const registerUser = async (req, res) => {
  try {
    const { name, email, mobile, code } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser)
      return res.status(400).json({ message: "User already exists!" });

    const referralCode = generateReferralCode();

    const newUser = new User({
      name,
      email,
      mobile,
      code: referralCode,
    });

    // Referral logic
    if (code) {
      const referrer = await User.findOne({ code });
      if (referrer) {
        newUser.referredBy = referrer._id;
        newUser.points = 50;
        referrer.points += 50;
        await referrer.save();
      }
    }

    await newUser.save();

    return res.status(201).json({
      message: "Registration successful",
      user: newUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// 📲 LOGIN (Send OTP)
export const loginUser = async (req, res) => {
  try {
    const { mobile } = req.body;

    const user = await User.findOne({ mobile });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = "1234";
    const otpExpires = Date.now() + 60 * 1000; // 1 minute

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const token = generateToken({ id: user._id });

    return res.status(200).json({
      message: "OTP sent successfully",
      otp, // for testing
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending OTP" });
  }
};

// 🔄 RESEND OTP
export const resendOTP = async (req, res) => {
  try {
    const { mobile } = req.body;
    const user = await User.findOne({ mobile });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = "1234";
    const otpExpires = Date.now() + 60 * 1000;

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const token = generateToken({ id: user._id });

    return res.status(200).json({
      message: "OTP resent successfully",
      otp,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error resending OTP" });
  }
};

// ✅ VERIFY OTP
export const verifyOtp = async (req, res) => {
   try {
    const { otp, token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    // Decode JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare OTP
    if (otp !== "1234") {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Mark verified
    user.isVerified = true;
    await user.save();

    res.status(200).json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📍 UPDATE LOCATION
export const updateUserLocation = async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;

    if (!userId || latitude === undefined || longitude === undefined)
      return res.status(400).json({ message: "Missing location fields" });

    const updated = await User.findByIdAndUpdate(
      userId,
      { location: { type: "Point", coordinates: [longitude, latitude] } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Location updated", location: updated.location });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating location" });
  }
};

// 🧾 GET REFERRAL CODE
export const getReferralCode = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("code name email");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: "Referral code fetched",
      referralCode: user.code,
      user: { name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching referral code" });
  }
};

// 📤 UPLOAD USER DOCUMENTS
export const uploadUserDocuments = async (req, res) => {
   try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Upload at least one document" });
    }

    const updatedDocs = {};

    // Iterate over all uploaded files
    req.files.forEach((file) => {
      const status = (file.fieldname === "aadharCard" || file.fieldname === "drivingLicense") 
                      ? "approved" 
                      : "pending";

      // Initialize array if it doesn't exist
      if (!updatedDocs[`documents.${file.fieldname}`]) {
        updatedDocs[`documents.${file.fieldname}`] = [];
      }

      updatedDocs[`documents.${file.fieldname}`].push({
        url: file.path || file.location,
        uploadedAt: new Date(),
        status: status
      });
    });

    await User.updateOne({ _id: userId }, { $set: updatedDocs });
    const updatedUser = await User.findById(userId);

    res.status(200).json({ message: "Documents uploaded", documents: updatedUser.documents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error uploading documents", error: err.message });
  }
};
// 📂 GET USER DOCUMENTS
export const getUserDocuments = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Documents fetched", documents: user.documents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching documents" });
  }
};


// 📌 UPDATE USER PROFILE
export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, mobile } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (mobile) updateData.mobile = mobile;

    // Upload profile image if exists
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "profile_images",
      });
      updateData.profileImage = result.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true, // return updated document
      runValidators: true, // optional: validate only updated fields
    });

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating profile", error: err.message });
  }
};

// 🔍 GET: Get user profile by ID
export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching user", error: err.message });
  }
};

// 🗑️ DELETE: Delete user profile by ID
export const deleteUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Optional: delete profile image from Cloudinary if exists
    if (user.profileImage) {
      const publicId = user.profileImage.split("/").pop().split(".")[0]; // extract public_id
      await cloudinary.uploader.destroy(`profile_images/${publicId}`);
    }

    await user.remove();
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting user", error: err.message });
  }
};


// 📤 Upload Banner Images
export const uploadBannerImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Upload at least one image" });
    }

    // Collect uploaded image URLs
    const imageUrls = req.files.map((file) => file.path || file.location);

    // Save to database
    const newBanner = new Banner({ images: imageUrls });
    await newBanner.save();

    res.status(201).json({ message: "Banner images uploaded successfully", banner: newBanner });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error uploading banner images", error: err.message });
  }
};


// 🔍 READ: Get All Banners
export const getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 }); // latest first
    res.status(200).json({ banners });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching banners", error: err.message });
  }
};

// 🔍 READ: Get Single Banner by ID
export const getBannerById = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: "Banner not found" });
    res.status(200).json({ banner });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching banner", error: err.message });
  }
};

// ✏️ UPDATE: Update Banner Images
export const updateBannerImages = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: "Banner not found" });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Upload at least one image to update" });
    }

    // Replace old images with new ones
    const imageUrls = req.files.map((file) => file.path || file.location);
    banner.images = imageUrls;
    await banner.save();

    res.status(200).json({ message: "Banner updated successfully", banner });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating banner", error: err.message });
  }
};

// 🗑️ DELETE: Delete Banner
export const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: "Banner not found" });

    await banner.remove();
    res.status(200).json({ message: "Banner deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting banner", error: err.message });
  }
};