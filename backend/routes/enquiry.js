const express = require('express');
const router = express.Router();
const Enquiry = require('../models/Enquiry');
const { sendEmail, getUserEmailTemplate, getAdminEmailTemplate } = require('../services/emailService');

console.log('📧 Email service loaded in enquiry.js');

// POST /api/enquiry
router.post('/', async (req, res) => {
  console.log('📝 Form submission received');
  console.log('📨 Request body:', req.body);
  
  try {
    const { fullName, phoneNumber, email, enquiryType, message } = req.body;
    
    console.log('👤 Processing for:', fullName, email);
    
    // Validate required fields
    if (!fullName || !phoneNumber || !email) {
      console.log('❌ Validation failed: missing fields');
      return res.status(400).json({
        success: false,
        message: 'Name, phone and email are required fields'
      });
    }
    
    // Save to database
    console.log('💾 Saving to database...');
    const newEnquiry = new Enquiry({
      fullName,
      phoneNumber,
      email,
      enquiryType: enquiryType || 'general',
      message
    });
    
    const savedEnquiry = await newEnquiry.save();
    console.log('✅ Enquiry saved to database:', savedEnquiry._id);
    
    // Send emails
    console.log('📧 Attempting to send emails...');
    console.log('📧 User email:', email);
    console.log('📧 Admin email:', process.env.ADMIN_EMAIL);
    
    const emailPromises = [
      // Send confirmation to user
      sendEmail({
        to: email,
        subject: 'Thank You for Contacting Ellora Tours & Travels',
        html: getUserEmailTemplate(fullName)
      }),
      
      // Send notification to admin
      sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `New Enquiry from ${fullName}`,
        html: getAdminEmailTemplate({ fullName, phoneNumber, email, enquiryType, message })
      })
    ];
    
    console.log('📧 Waiting for email results...');
    
    Promise.all(emailPromises)
      .then(results => {
        console.log('📧 Email results details:');
        results.forEach((result, index) => {
          console.log(`   Email ${index + 1}:`, result);
        });
      })
      .catch(err => {
        console.error('📧 Email error caught:', err);
      })
      .finally(() => {
        console.log('📧 Email processing complete');
      });
    
    console.log('📧 Email promises started (non-blocking)');
    
    // Return success response
    res.status(201).json({
      success: true,
      message: '✅ Enquiry saved successfully to MongoDB Atlas database!',
      data: {
        enquiryId: savedEnquiry._id,
        name: savedEnquiry.fullName,
        email: savedEnquiry.email,
        type: savedEnquiry.enquiryType
      }
    });
    
    console.log('✅ Response sent to client');
    
  } catch (error) {
    console.error('❌ Error saving enquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving enquiry',
      error: error.message
    });
  }
});

module.exports = router;