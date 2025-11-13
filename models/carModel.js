import mongoose from 'mongoose';

const { Schema } = mongoose;

const carSchema = new Schema({
  carName: {
    type: String,
  },
  model: {
    type: String,
  },
  year: {
    type: Number,
  },
  pricePerHour: {
    type: Number,
  },
  pricePerDay: {
    type: Number, // ✅ New field
  },
  extendedPrice: {
    perHour: {
      type: Number, // ✅ Extended price per hour
    },
    perDay: {
      type: Number, // ✅ Extended price per day
    },
  },
  description: {
    type: String,
  },
  availabilityStatus: {
    type: Boolean,
    default: true,
  },
  delayPerHour: { type: Number },
delayPerDay: { type: Number },
vehicleNumber: { type: String },
  availability: [
    {
      date: {
        type: String,
      },
      timeSlots: [
        {
          type: String,
        },
      ],
    },
  ],
  carImage: {
    type: [String],
    default: [],
  },
  carDocs: {
  type: [String],
  default: [],
},
   runningStatus: {
    type: String,
    enum: ['Available', 'Booked'],
    default: 'Available'
  },
  location: {
    type: String,
  },
  carType: {
    type: String,
  },
  fuel: {
    type: String,
  },
   // <-- Branch Info -->
  branch: {
    name: { type: String,}, // branch name like "Gachibowli"
    location: {                            // GeoJSON Point for branch coords
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: { type: [Number], }, // [lng, lat]
    },
  },
  seats: {
    type: Number,
  },
  type: {
    type: String,
  },
   status: {
    type: String,
    enum: ['active', 'onHold'],  // ✅ Enum values
    default: 'active',          // ✅ Default value
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});


carSchema.index({ "branch.location": "2dsphere" });


const Car = mongoose.model('Car', carSchema);
export default Car;