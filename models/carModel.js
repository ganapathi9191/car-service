import mongoose from "mongoose";

const carSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    logo: { type: String, required: true },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    cartype: {
      type: String,
      enum: ["manual", "automatic", "semi-automatic"],
      required: true,
    },
    carseat: { type: Number, required: true, min: 1 },
    carnumber: { type: String, required: true, unique: true, trim: true },
    carfuel: {
      type: String,
      enum: ["petrol", "diesel", "electric", "hybrid", "cng"],
      required: true,
    },
    perHrCost: { type: Number, required: true, min: 0 },
    perDayCost: { type: Number, required: true, min: 0 },
    delayCost: { type: Number, required: true, min: 0 },
    carImage: { type: String, required: true },

    // ✅ New Field (Category Relation)
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    liveLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
  },
  { timestamps: true }
);

carSchema.index({ "liveLocation.coordinates": "2dsphere" });
export default mongoose.model("Car", carSchema);
