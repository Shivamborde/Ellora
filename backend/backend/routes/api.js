// backend/routes/api.js
const express = require('express');
const router = express.Router();
const Enquiry = require('../models/Enquiry');
const { sendConfirmationSMS } = require('../utils/smsService');

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is running',
        timestamp: new Date()
    });
});

// Enquiry endpoint - THIS IS THE ONE YOUR FORM USES
router.post('/enquiry', async (req, res) => {
    try {
        const { fullName, phoneNumber, email, subject, message } = req.body;
        
        console.log('📥 Received enquiry:', { fullName, phoneNumber, email, subject });
        
        // Basic validation
        if (!fullName || !phoneNumber || !email || !subject) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        // 1. Save enquiry to database
        const newEnquiry = new Enquiry({
            fullName,
            phoneNumber,
            email,
            subject,
            message: message || 'No message provided'
        });
        
        const savedEnquiry = await newEnquiry.save();
        console.log('✅ Enquiry saved to database with ID:', savedEnquiry._id);
        
        // 2. Send confirmation SMS to customer
        console.log('📤 Attempting to send SMS to:', phoneNumber);
        const smsResult = await sendConfirmationSMS(phoneNumber, fullName, subject);
        
        // 3. Update enquiry with SMS status
        savedEnquiry.smsSent = smsResult.success;
        savedEnquiry.smsStatus = smsResult.success ? 'sent' : 'failed';
        await savedEnquiry.save();
        
        // 4. Send response back to frontend
        res.json({
            success: true,
            message: 'Enquiry saved successfully',
            enquiryId: savedEnquiry._id,
            smsSent: smsResult.success,
            smsDetails: smsResult.success ? 'Confirmation SMS sent to your mobile' : 'SMS could not be sent'
        });
        
    } catch (error) {
        console.error('❌ Enquiry submission error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process enquiry',
            details: error.message
        });
    }
});

// Get all enquiries (optional - for admin)
router.get('/enquiries', async (req, res) => {
    try {
        const enquiries = await Enquiry.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            data: enquiries
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch enquiries'
        });
    }
});

module.exports = router;