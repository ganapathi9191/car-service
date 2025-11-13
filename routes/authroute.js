import express from 'express';
import upload from "../utils/multer.js";
import {
  registerUser,
  loginUser,
  resendOTP,
  verifyOtp,
  getUser,
  createProfile,
  editProfileImage,
  getProfile,
  createBooking,
  payForBooking,
  getUserBookings,
  getBookingSummary,
  getRecentBooking,
  extendBooking,
  addToWallet,
  getWalletTransactions,
  uploadUserDocuments,
  getUserDocuments,
  getReferralCode,
  updateUserLocation,
  getNearestBranch,
  deleteAccount,
} from '../controllers/authcontroller.js';

const router = express.Router();

// Auth routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/resend-otp', resendOTP);
router.post('/verify-otp', verifyOtp);

// User profile routes
router.get('/user/:userId', getUser);
router.post('/profile/:userId', createProfile);
router.put('/profile/:userId/edit', editProfileImage);
router.get('/profile/:id', getProfile);

// Booking routes
router.post('/booking', createBooking);
router.post('/booking/:userId/:bookingId/pay', payForBooking);
router.get('/bookings/:userId', getUserBookings);
router.get('/booking/:userId/:bookingId/summary', getBookingSummary);
router.get('/booking/:userId/recent', getRecentBooking);
router.put('/booking/:userId/:bookingId/extend', extendBooking);

// Wallet routes
router.post('/wallet/:userId/add', addToWallet);
router.get('/wallet/:userId/transactions', getWalletTransactions);

// Document routes
router.post("/:userId/upload", upload.any(), uploadUserDocuments);
router.get('/documents/:userId', getUserDocuments);

// Referral route
router.get('/referral/:userId', getReferralCode);

// Location routes
router.post('/location/update', updateUserLocation);
router.get('/location/:userId/nearest-branch', getNearestBranch);

// Account deletion
router.post('/account/:userId/delete', deleteAccount);

export default router;