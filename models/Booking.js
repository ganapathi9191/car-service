import mongoose from 'mongoose';

const { Schema } = mongoose;

const bookingSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User', 
  },
  carId: {
    type: Schema.Types.ObjectId,
    ref: 'Car',
  },
  rentalStartDate: {
    type: String,  // Store as string "YYYY-MM-DD"
  },
  rentalEndDate: {
    type: String,  // Store as string "YYYY-MM-DD"
  },
  from: {
    type: String,  // Store time in "hh:mm AM/PM" format
  },
  to: {
    type: String,  // Store time in "hh:mm AM/PM" format
  },
  deliveryDate: {
    type: String, // Store as string (e.g., "2025-09-01")
  },
  deliveryTime: {
    type: String, // Store time as string (e.g., "8:00 PM")
  },
  totalPrice: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'active'],
    default: 'pending',
  },
  deposit: {
  type: String,
  default: '',  // empty string by default
},

depositeProof: [
  {
    url: { type: String, required: true },
    label: { type: String, enum: ['depositeFront', 'depositeBack'], required: true },
  }
],

carImagesBeforePickup: [
  {
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }
],

carReturnImages: [
  {
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }
],


 returnDetails: [
  {
    name: { type: String },
    email: { type: String },
    mobile: { type: String },
    alternativeMobile: { type: String },
    returnTime: { type: String },
    returnDate: { type: Date },
    delayTime: { type: Number },
    delayDay: { type: Number },
    returnOTP: { type: String }, // ✅ Added this
    createdAt: { type: Date, default: Date.now }
  }
],

extensions: [
  {
    extendDeliveryDate: String,
    extendDeliveryTime: String,
    hours: Number,
    amount: Number,
    transactionId: String,
    extendedAt: {
      type: Date,
      default: Date.now
    }
  }
],

  paymentStatus: {
    type: String,
    enum: ['pending', 'Paid', 'unpaid'],
    default: 'pending',
  },
  delayedPaymentProof: {
  url: String,
  uploadedAt: Date
},
  depositPDF: {
  type: String,
  default: null,
},
finalBookingPDF: {
  type: String,
  default: null
},
  pickupLocation: {
    type: {
      address: { type: String },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
  },
  dropLocation: {
    type: {
      address: { type: String },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
  },
  otp: {
    type: Number,
  },
   amount: {
    type: Number,
  },
  returnOTP: {
  type: String,
  default: null,
},
transactionId: {
  type: String,
},
advancePaidStatus: {
    type: Boolean,
    default: false, // Default to false, i.e., not paid
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

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;