import mongoose from "mongoose";

const { Schema } = mongoose;

const carSchema = new Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },

  carName: { type: String },
  model: { type: String },
  year: { type: Number },
  pricePerHour: { type: Number },
  pricePerDay: { type: Number },
  delayPerHour: { type: Number },
  delayPerDay: { type: Number },

  extendedPrice: {
    perHour: Number,
    perDay: Number
  },

  description: { type: String },

  availabilityStatus: {
    type: Boolean,
    default: true
  },

  vehicleNumber: { type: String },

  availability: [
    {
      date: String,
      timeSlots: [String],
    },
  ],

  carImage: { type: [String], default: [] },
  carDocs: { type: [String], default: [] },

  runningStatus: {
    type: String,
    enum: ["Available", "Booked"],
    default: "Available"
  },

  location: { type: String },
  carType: { type: String },
  fuel: { type: String },
  seats: { type: Number },
  type: { type: String },

  branch: {
    name: { type: String },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: { type: [Number] }
    }
  },

  status: {
    type: String,
    enum: ["active", "onHold"],
    default: "active"
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

carSchema.index({ "branch.location": "2dsphere" });

const Car = mongoose.model("Car", carSchema);
export default Car;
