// test-email.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ Connection Error:', error);
  } else {
    console.log('✅ Server is ready to send emails');
  }
});

// Send test email
async function sendTestEmail() {
  try {
    const info = await transporter.sendMail({
      from: `"Test" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL, // Send to yourself for testing
      subject: "✅ Nodemailer Test Success",
      html: `
        <h1>Test Email</h1>
        <p>If you're seeing this, Nodemailer is working correctly!</p>
        <p>Time: ${new Date().toLocaleString()}</p>
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📨 Preview URL:', nodemailer.getTestMessageUrl(info));
    
  } catch (error) {
    console.log('❌ Failed to send email:');
    console.log('Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔐 Authentication Error! Check your EMAIL_PASS');
    }
  }
}

// Run the test
sendTestEmail();