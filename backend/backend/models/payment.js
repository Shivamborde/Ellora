const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    // Razorpay Details
    razorpayOrderId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    razorpayPaymentId: { 
        type: String 
    },
    razorpaySignature: { 
        type: String 
    },

    // Customer Details
    customerName: String,
    customerEmail: String,
    customerPhone: String,

    // Payment Info
    amount: { 
        type: Number, 
        required: true 
    },
    currency: { 
        type: String, 
        default: 'INR' 
    },
    
    // Status
    status: {
        type: String,
        enum: ['created', 'attempted', 'paid', 'failed'],
        default: 'created'
    },

    // Booking Reference
    bookingType: String,

    // Timestamps
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    paidAt: Date
});

module.exports = mongoose.model('Payment', paymentSchema);