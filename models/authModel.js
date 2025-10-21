import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  name: { type: String },
  email: { type: String ,unique: true},
  profileImage: { type: String }, // Cloudinary URL
  isVerified: { type: Boolean, default: false },
  kyc: {
    aadhaar: { type: String },  // Cloudinary URL
    drivingLicense: { type: String }, // Cloudinary URL
    isValid: { type: Boolean, default: false }
  }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
