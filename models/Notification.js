// models/Notification.js

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  message: { type: String },
  type: { type: String, default: 'booking' },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;