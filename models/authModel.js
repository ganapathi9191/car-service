import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true, sparse: true },
  mobile: { type: String, required: true, unique: true },

  code: { type: String, unique: true },
  referredBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  points: { type: Number, default: 0 },
  profileImage: { type: String, default: null },

  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] },
  },

 documents: {
  aadharFront: {
    url: String,
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    code: { type: String, default: "AADHAR_FRONT" },
    uploadedAt: Date
  },
  aadharBack: {
    url: String,
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    code: { type: String, default: "AADHAR_BACK" },
    uploadedAt: Date
  },
  licenseFront: {
    url: String,
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    code: { type: String, default: "LICENSE_FRONT" },
    uploadedAt: Date
  },
  licenseBack: {
    url: String,
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    code: { type: String, default: "LICENSE_BACK" },
    uploadedAt: Date
  }
},

  notifications: [
    {
      _id: { type: Schema.Types.ObjectId, auto: true },
      message: String,
      type: String,
      date: { type: Date, default: Date.now },
    },
  ],

  myBookings: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
  ],

  wallet: [
    {
      amount: { type: Number, required: true },
      type: { type: String, enum: ['credit', 'debit'], required: true },
      message: { type: String, default: '' },
      date: { type: Date, default: Date.now },
    },
  ],

  totalWalletAmount: { type: Number, default: 0 },
}, { timestamps: true });

userSchema.index({ location: "2dsphere" });

export default mongoose.model("User", userSchema);
