// Simple email service - will be enhanced later
console.log('📧 Email service loaded (simplified version)');

exports.sendEnquiryConfirmation = async (enquiryData) => {
    try {
        console.log(`📤 [Email Simulation] Sending enquiry confirmation to: ${enquiryData.email}`);
        console.log(`   Subject: Thank You for Your Enquiry - Ellora Taxi`);
        console.log(`   Name: ${enquiryData.fullName}`);
        
        // Simulate email sending
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('✅ [Email Simulation] Email would be sent successfully');
        return true;
    } catch (error) {
        console.log('⚠️ [Email Simulation] Email not configured yet');
        return false;
    }
};

exports.sendBookingConfirmation = async (bookingData) => {
    try {
        console.log(`📤 [Email Simulation] Sending booking confirmation to: ${bookingData.email}`);
        console.log(`   Subject: Booking Confirmation - ${bookingData.itemName}`);
        console.log(`   Name: ${bookingData.fullName}`);
        
        // Simulate email sending
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('✅ [Email Simulation] Email would be sent successfully');
        return true;
    } catch (error) {
        console.log('⚠️ [Email Simulation] Email not configured yet');
        return false;
    }
};

// Test function
exports.testEmailConfig = async () => {
    console.log('📧 Email service: Simplified mode');
    console.log('💡 To enable real emails:');
    console.log('   1. Set EMAIL_USER and EMAIL_PASS in .env');
    console.log('   2. Enable 2FA in Google account');
    console.log('   3. Generate App Password from Google');
    return false;
};