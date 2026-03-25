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

// ========================
// CREATE ORDER ENDPOINT
// ========================
router.post('/create-order', async (req, res) => {
    try {
        const { amount, bookingDetails } = req.body;
        
        console.log('📦 Creating Razorpay order for amount:', amount);

        const options = {
            amount: amount * 100, // Convert to paise
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: bookingDetails
        };

        const order = await razorpay.orders.create(options);
        console.log('✅ Order created:', order.id);

        // Save payment record in database
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
        console.error('❌ Order creation failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ========================
// VERIFY PAYMENT ENDPOINT
// ========================
router.post('/verify-payment', async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            bookingDetails
        } = req.body;

        console.log('🔍 Verifying payment:', razorpay_order_id);

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

            console.log('✅ Payment verified successfully');

            res.json({ 
                success: true, 
                message: 'Payment verified successfully',
                paymentId: payment?._id
            });
        } else {
            console.error('❌ Invalid signature');
            res.status(400).json({ 
                success: false, 
                error: 'Invalid signature' 
            });
        }
    } catch (error) {
        console.error('❌ Verification failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ========================
// GET PAYMENT STATUS
// ========================
router.get('/payment-status/:orderId', async (req, res) => {
    try {
        const payment = await Payment.findOne({ 
            razorpayOrderId: req.params.orderId 
        });
        
        if (payment) {
            res.json({
                success: true,
                status: payment.status,
                payment: payment
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Payment not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;