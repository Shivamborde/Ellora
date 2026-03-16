const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/payment');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// 1. Create Order
router.post('/create-order', async (req, res) => {
    try {
        const { amount, bookingDetails } = req.body;

        const options = {
            amount: amount * 100, // Razorpay uses paise
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: bookingDetails
        };

        const order = await razorpay.orders.create(options);

        // Save order in DB
        const payment = new Payment({
            razorpayOrderId: order.id,
            amount: amount,
            customerName: bookingDetails.fullName,
            customerEmail: bookingDetails.email,
            customerPhone: bookingDetails.phoneNumber,
            bookingType: bookingDetails.bookingType,
            status: 'created'
        });
        await payment.save();

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            keyId: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('Order creation failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Verify Payment
router.post('/verify-payment', async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            bookingDetails
        } = req.body;

        // Generate signature for verification
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Update payment record
            const payment = await Payment.findOneAndUpdate(
                { razorpayOrderId: razorpay_order_id },
                {
                    razorpayPaymentId: razorpay_payment_id,
                    razorpaySignature: razorpay_signature,
                    status: 'paid',
                    paidAt: new Date()
                },
                { new: true }
            );

            // Here you can also save the booking to your main collection
            // You already have a similar structure in your server.js

            res.json({
                success: true,
                message: 'Payment verified successfully',
                paymentId: payment?._id
            });
        } else {
            res.status(400).json({ success: false, error: 'Invalid signature' });
        }
    } catch (error) {
        console.error('Verification failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;