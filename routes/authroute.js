import express from "express";
import * as user from "../controllers/authcontroller.js";
import upload from "../utils/multer.js";


const router = express.Router();

// Auth routes
router.post("/register", user.registerUser);
router.post("/login", user.loginUser);
router.post("/resend-otp",user.resendOTP);
router.post("/verify-otp", user.verifyOtp);

// Documents
router.post("/upload-docs/:userId",upload.any(), user.uploadUserDocuments);
router.get("/get-docs/:userId", user.getUserDocuments);

// Referral
router.get("/referral/:userId", user.getReferralCode);

// Location
router.post("/update-location", user.updateUserLocation);


// Update profile (with optional profile image)
router.put("/profile-update/:userId", upload.single("profileImage"), user.updateUserProfile);
router.get("/grt-profile/:userId", user.getUserProfile);
router.delete("/delete-profile/:userId", user.deleteUserProfile);



// Upload multiple banner images
router.post("/upload-banner", upload.array("images"), user.uploadBannerImages);
router.get("/get-banners", user.getAllBanners);
router.get("/get-banner/:id", user.getBannerById);
router.put("/update-banner/:id", upload.array("images"), user.updateBannerImages);
router.delete("/delete-banner/:id", user.deleteBanner);






export default router;
