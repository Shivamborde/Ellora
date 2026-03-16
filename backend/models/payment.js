const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    // Razorpay Details
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    // Booking Reference (connects to your existing booking)
    bookingType: { type: String, enum: ['tour', 'vehicle'], required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, refPath: 'bookingType' },

    // Customer Details
    customerName: String,
    customerEmail: String,
    customerPhone: String,

    // Payment Info
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
        type: String,
        enum: ['created', 'attempted', 'paid', 'failed'],
        default: 'created'
    },

    createdAt: { type: Date, default: Date.now },
    paidAt: Date
});

module.exports = mongoose.model('Payment', paymentSchema);