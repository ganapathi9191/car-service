import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true, sparse: true },
  mobile: { type: String, required: true, unique: true },



  // Referral system
  code: { type: String, unique: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  points: { type: Number, default: 0 },

  // Profile image
  profileImage: { type: String, default: null },

  // GeoJSON location
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] },
  },

  // Documents
  documents: {
    aadharCard: {
      url: String,
      uploadedAt: Date,
      _id:false,
      status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    },
    drivingLicense: {
      url: String,
      uploadedAt: Date,
      _id:false,
      status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    },
  },
}, { timestamps: true });

userSchema.index({ location: "2dsphere" });

export default mongoose.model("User", userSchema);
