import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/authModel.js';
import Booking from '../models/Booking.js';
import Car from '../models/carModel.js';
import cloudinary from '../config/cloudinary.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';

dotenv.config();

// Helper: Generate referral code
const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// 📌 REGISTER USER
export const registerUser = async (req, res) => {
   try {
    const { name, email, mobile, code } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser) {
      return res.status(400).json({ message: "User with email or mobile already exists!" });
    }

    const referralCode = generateReferralCode();

    const newUser = new User({
      name,
      email,
      mobile,
      code: referralCode,
      points: 0
    });

    // Referral linking
    if (code) {
      const referrer = await User.findOne({ code: code.toUpperCase() });
      if (referrer) {
        newUser.referredBy = referrer._id;
        newUser.points = 50;

        referrer.points = (referrer.points || 0) + 50;
        await referrer.save();
      }
    }

    await newUser.save();

    return res.status(201).json({
      message: "Registration successful",
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile,
        code: newUser.code,
        referredBy: newUser.referredBy,
        points: newUser.points,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      }
    });

  } catch (error) {
    console.error("❌ Registration Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
// 📲 LOGIN (Send OTP)
export const loginUser = async (req, res) => {
 try {
    const { mobile } = req.body;

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = "1234";
    const otpExpires = Date.now() + 60 * 1000;

    // Save OTP
    await User.updateOne(
      { _id: user._id },
      { $set: { otp, otpExpires } }
    );

    // Login token before final verification
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "10m"
    });

    return res.status(200).json({
      message: "OTP sent successfully",
      otp,
      token,
      mobile: user.mobile,
      name: user.name,
      email: user.email
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Error sending OTP" });
  }
};

// 🔄 RESEND OTP
export const resendOTP = async (req, res) => {
  try {
    const { mobile } = req.body;

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = "1234";
    const otpExpires = Date.now() + 60 * 1000;

    await User.updateOne(
      { _id: user._id },
      { $set: { otp, otpExpires } }
    );

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "10m"
    });

    return res.status(200).json({
      message: "OTP resent successfully",
      otp,
      token
    });

  } catch (err) {
    console.error("RESEND OTP ERROR:", err);
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

    if (!otp) {
      return res.status(400).json({ message: "OTP is required" });
    }

    // Decode JWT only to identify user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ⭐ FIXED: Only check default OTP 1234 — ignore DB
    if (otp !== "1234") {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Mark verified
    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Generate final session token
    const finalToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      token: finalToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        code: user.code,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error("OTP VERIFY ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
export const getUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId).populate({
      path: "myBookings",
      model: "Booking"
    });

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const userDetails = {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      otp: user.otp,
      wallet: user.wallet,
      totalWalletAmount: user.totalWalletAmount,
      referredBy: user.referredBy,
      points: user.points,
      code: user.code,
      profileImage: user.profileImage || "default-profile-image.jpg",
      documents: user.documents,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      myBookings: user.myBookings,
    };

    return res.status(200).json({
      message: "User details retrieved successfully!",
      user: userDetails,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found!' });
    }

    // multer gives file in req.file, not req.files
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded!' });
    }

    // Upload to cloudinary
    const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
      folder: "poster",
    });

    existingUser.profileImage = uploadedImage.secure_url;
    await existingUser.save();

    return res.status(200).json({
      message: "Profile image uploaded successfully!",
      user: {
        id: existingUser._id,
        profileImage: existingUser.profileImage,
      },
    });

  } catch (error) {
    console.error("Profile upload error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const editProfileImage = async (req, res) => {
  try {
    const { userId } = req.params;

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found!" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No new file uploaded!" });
    }

    const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
      folder: "poster",
    });

    existingUser.profileImage = uploadedImage.secure_url;
    await existingUser.save();

    return res.status(200).json({
      message: "Profile image updated successfully!",
      user: {
        id: existingUser._id,
        profileImage: existingUser.profileImage,
      },
    });

  } catch (error) {
    console.error("Error updating profile image:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    return res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      profileImage: user.profileImage,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const createBooking = async (req, res) => {
  try {
    const {
      userId,
      carId,
      rentalStartDate,
      rentalEndDate,
      from,
      to,
      deposit,
      amount,
      transactionId
    } = req.body;

    const car = await Car.findById(carId);
    if (!car) return res.status(404).json({ message: 'Car not found' });
    if (car.runningStatus === 'Booked') {
      return res.status(409).json({ message: 'Car already booked' });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);

    const newBooking = new Booking({
      userId,
      carId,
      rentalStartDate,
      rentalEndDate,
      from,
      to,
      deposit: deposit || '',
      totalPrice: amount,
      amount,
      otp,
      transactionId,
      paymentStatus: 'Paid',
      deliveryDate: rentalEndDate,
      deliveryTime: to,
      status: 'confirmed'
    });

    await newBooking.save();

    car.runningStatus = 'Booked';
    car.bookingDetails = {
      rentalStartDate,
      rentalEndDate
    };
    await car.save();

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.myBookings.push(newBooking._id);
    await user.save();

    const message = `🚗 ${car.carName || car.model} booked by ${user.name} at ${new Date().toLocaleString()}`;
    const notification = new Notification({
      message,
      type: "booking"
    });

    await notification.save();

    return res.status(201).json({
      message: "Booking confirmed",
      booking: newBooking
    });
  } catch (err) {
    console.error("❌ Error in createBooking:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const payForBooking = async (req, res) => {
  const { userId, bookingId } = req.params;

  if (!userId || !bookingId) {
    return res.status(400).json({ message: 'User ID and Booking ID are required' });
  }

  try {
    const user = await User.findById(userId);
    const booking = await Booking.findById(bookingId).populate('carId');

    if (!user || !booking) {
      return res.status(404).json({ message: 'User or booking not found' });
    }

    if (booking.paymentStatus === 'Paid') {
      return res.status(400).json({ message: 'Booking already paid' });
    }

    const totalWalletBalance = user.wallet.reduce((acc, txn) =>
      txn.type === 'credit' ? acc + txn.amount : acc - txn.amount, 0);

    if (totalWalletBalance < booking.totalPrice) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    const txn = {
      amount: booking.totalPrice,
      type: 'debit',
      message: `Payment for booking of car: ${booking.carId?.carName || 'N/A'}`,
      totalWalletAmount: totalWalletBalance - booking.totalPrice
    };

    user.wallet.push(txn);
    booking.paymentStatus = 'Paid';

    await user.save();
    await booking.save();

    return res.status(200).json({
      message: 'Payment successful',
      walletTransaction: txn,
      updatedBooking: booking
    });
  } catch (error) {
    console.error('Error in payForBooking:', error);
    return res.status(500).json({ message: 'Payment failed', error: error.message });
  }
};

export const getUserBookings = async (req, res) => {
  const { userId } = req.params;
  const { status } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const query = { userId };

    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('carId')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: 'Bookings fetched successfully',
      bookings
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching bookings', error: error.message });
  }
};

export const getBookingSummary = async (req, res) => {
  const { userId, bookingId } = req.params;

  if (!userId || !bookingId) {
    return res.status(400).json({ message: 'User ID and Booking ID are required' });
  }

  try {
    const booking = await Booking.findOne({ _id: bookingId, userId })
      .populate('carId')
      .populate('userId', 'name email mobile')
      .exec();

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const formattedStart = new Date(booking.rentalStartDate).toLocaleString('en-US');
    const formattedEnd = new Date(booking.rentalEndDate).toLocaleString('en-US');

    const car = booking.carId;

    return res.status(200).json({
      message: 'Booking summary fetched successfully',
      booking: {
        _id: booking._id,
        userId: booking.userId,
        carId: booking.carId._id,
        rentalStartDate: formattedStart,
        rentalEndDate: formattedEnd,
        totalPrice: booking.totalPrice,
        amount: booking.amount,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        delayedPaymentProof: booking.delayedPaymentProof,
        otp: booking.otp,
        deliveryDate: booking.deliveryDate,
        deliveryTime: booking.deliveryTime,
        pickupLocation: car.location || null,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt
      },
      car: {
        _id: car._id,
        carName: car.carName,
        brand: car.brand,
        model: car.model,
        pricePerHour: car.pricePerHour,
        location: car.location,
        carImage: car.carImage,
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Error fetching booking summary',
      error: error.message
    });
  }
};

export const getRecentBooking = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const booking = await Booking.findOne({ userId })
      .populate('carId')
      .sort({ createdAt: -1 })
      .exec();

    if (!booking) {
      return res.status(404).json({ message: 'No recent booking found' });
    }

    return res.status(200).json({
      message: 'Recent booking fetched successfully',
      booking
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Error fetching recent booking',
      error: error.message
    });
  }
};

export const extendBooking = async (req, res) => {
  try {
    const { userId, bookingId } = req.params;
    const {
      extendDeliveryDate,
      extendDeliveryTime,
      hours,
      amount,
      transactionId
    } = req.body;

    const booking = await Booking.findById(bookingId).populate('carId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const [tPart, period] = booking.to.split(' ');
    let [hr, min] = tPart.split(':').map(p => parseInt(p));
    if (period === 'PM' && hr !== 12) hr += 12;
    if (period === 'AM' && hr === 12) hr = 0;
    const oldEndTime = new Date(`${booking.rentalEndDate}T${hr.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`);

    let newEndTime;
    if (hours && !isNaN(hours)) {
      newEndTime = new Date(oldEndTime.getTime() + Number(hours) * 60 * 60 * 1000);
    } else if (extendDeliveryDate && extendDeliveryTime) {
      const [etPart, ePeriod] = extendDeliveryTime.split(' ');
      let [ehr, emin] = etPart.split(':').map(p => parseInt(p));
      if (ePeriod === 'PM' && ehr !== 12) ehr += 12;
      if (ePeriod === 'AM' && ehr === 12) ehr = 0;
      newEndTime = new Date(`${extendDeliveryDate}T${ehr.toString().padStart(2, '0')}:${emin.toString().padStart(2, '0')}:00`);
    } else {
      return res.status(400).json({ message: 'Provide either hours or extendDeliveryDate + extendDeliveryTime' });
    }

    if (newEndTime <= oldEndTime) {
      return res.status(400).json({ message: 'New time must be after current end time' });
    }

    const extraCost = Number(amount);
    if (isNaN(extraCost) || extraCost <= 0) {
      return res.status(400).json({ message: 'Invalid amount provided' });
    }

    const currentTotal = Number(booking.totalPrice);

    const newDateStr = newEndTime.toISOString().split('T')[0];
    const newTimeStr = newEndTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    booking.rentalEndDate = newDateStr;
    booking.to = newTimeStr;
    booking.totalPrice = currentTotal + extraCost;
    booking.transactionId = transactionId;

    booking.extensions = booking.extensions || [];
    booking.extensions.push({
      extendDeliveryDate,
      extendDeliveryTime,
      hours,
      amount: extraCost,
      transactionId
    });

    await booking.save();

    return res.status(200).json({
      message: 'Booking extended successfully',
      extension: {
        extendDeliveryDate,
        extendDeliveryTime,
        hours,
        amount: extraCost,
        transactionId
      }
    });
  } catch (err) {
    console.error('Extend Booking Error:', err);
    return res.status(500).json({ message: 'Error extending booking' });
  }
};

export const addToWallet = async (req, res) => {
  const { userId } = req.params;
  const { amount } = req.body;

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newTotalWalletAmount = user.totalWalletAmount + Number(amount);

    const newTransaction = {
      amount: Number(amount),
      type: 'credit',
      message: 'Paid To Wallet',
      date: new Date()
    };

    user.wallet.push(newTransaction);
    user.totalWalletAmount = newTotalWalletAmount;

    await user.save();

    res.json({
      message: 'Amount added to wallet',
      totalWalletAmount: user.totalWalletAmount,
      wallet: user.wallet
    });
  } catch (err) {
    console.error('Error in adding to wallet:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getWalletTransactions = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.status(200).json({
      message: 'Wallet transactions fetched successfully.',
      totalWalletAmount: user.totalWalletAmount,
      wallet: user.wallet
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

export const uploadUserDocuments = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // req.files is an array when using upload.any()
    const files = req.files || [];

    // Convert array to object for easier access
    const filesObj = files.reduce((acc, file) => {
      acc[file.fieldname] = file;
      return acc;
    }, {});

    // REQUIRED FILES (All 4 mandatory)
    const requiredFiles = ["aadharFront", "aadharBack", "licenseFront", "licenseBack"];

    const missing = requiredFiles.filter((f) => !filesObj[f]);

    if (missing.length > 0) {
      return res.status(400).json({
        message: `Missing required documents: ${missing.join(", ")}`,
      });
    }

    const docFields = {
      aadharFront: { code: "AADHAR_FRONT" },
      aadharBack: { code: "AADHAR_BACK" },
      licenseFront: { code: "LICENSE_FRONT" },
      licenseBack: { code: "LICENSE_BACK" }
    };

    const uploadedDocs = {};

    for (const [key, config] of Object.entries(docFields)) {
      const file = filesObj[key];

      // File is already uploaded to Cloudinary by multer-storage-cloudinary
      // Just use the path from multer
      uploadedDocs[`documents.${key}`] = {
        url: file.path, // Cloudinary URL
        status: "pending",
        code: config.code,
        uploadedAt: new Date(),
      };
    }

    // Also update the combined aadharCard and drivingLicense status
    uploadedDocs["documents.aadharCard"] = {
      status: "pending",
      uploadedAt: new Date(),
    };

    uploadedDocs["documents.drivingLicense"] = {
      status: "pending",
      uploadedAt: new Date(),
    };

    await User.updateOne({ _id: userId }, { $set: uploadedDocs });

    const updatedUser = await User.findById(userId);

    return res.status(200).json({
      message: "All documents uploaded successfully",
      documents: updatedUser.documents
    });

  } catch (error) {
    console.error("Upload Error:", error);
    return res.status(500).json({
      message: "Error uploading documents",
      error: error.message
    });
  }
};


export const getUserDocuments = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.documents || (Object.keys(user.documents).length === 0)) {
      return res.status(404).json({ message: 'No documents uploaded' });
    }

    return res.status(200).json({
      message: 'User documents fetched successfully',
      documents: user.documents
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Error fetching documents',
      error: error.message
    });
  }
};

export const getReferralCode = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).select('code name email');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Referral code fetched successfully',
      referralCode: user.code,
      user: {
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error fetching referral code:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateUserLocation = async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;

    if (!userId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'userId, latitude, and longitude are required' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        location: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'User location stored successfully',
      location: updatedUser.location,
    });
  } catch (error) {
    console.error('Error storing user location:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const getNearestBranch = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user || !user.location || !Array.isArray(user.location.coordinates)) {
      return res.status(404).json({ message: 'User or location not found' });
    }

    const userCoords = user.location.coordinates;

    const nearestCar = await Car.findOne({
      status: 'active',
      runningStatus: 'Available',
      'branch.location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: userCoords,
          },
          $minDistance: 0,
          $maxDistance: 50000,
        }
      }
    });

    if (!nearestCar) {
      return res.status(404).json({ message: 'No nearby branch found' });
    }

    return res.status(200).json({
      message: 'Nearest branch with available car found successfully',
      branch: nearestCar.branch,
      car: {
        _id: nearestCar._id,
        carName: nearestCar.carName,
        model: nearestCar.model,
        year: nearestCar.year,
        pricePerHour: nearestCar.pricePerHour,
        pricePerDay: nearestCar.pricePerDay,
        extendedPrice: nearestCar.extendedPrice,
        delayPerHour: nearestCar.delayPerHour,
        delayPerDay: nearestCar.delayPerDay,
        vehicleNumber: nearestCar.vehicleNumber,
        carImage: nearestCar.carImage,
        carType: nearestCar.carType,
        fuel: nearestCar.fuel,
        seats: nearestCar.seats,
        type: nearestCar.type,
        description: nearestCar.description,
        location: nearestCar.location,
      }
    });
  } catch (error) {
    console.error('Error finding nearest branch:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteAccount = async (req, res) => {
  const { email, reason } = req.body;
  const { userId } = req.params;

  if (!email || !reason || !userId) {
    return res.status(400).json({ message: 'User ID, email, and reason are required' });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Invalid user ID format' });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.email !== email) {
      return res.status(400).json({ message: 'Email does not match the user account' });
    }

    // Account deletion request received (no email sent)
    return res.status(200).json({
      message: 'Account deletion request has been processed.',
    });
  } catch (err) {
    console.error('❌ Error in deleteAccount:', err);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};    ``