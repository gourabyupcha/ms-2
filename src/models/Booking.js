const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  buyerId: { type: String, required: true },
  sellerId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'confirmed', 'payment_failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
