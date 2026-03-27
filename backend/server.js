const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('\n' + '='.repeat(70));
console.log('🚀 ELLORA TOURS & TRAVELS - PRODUCTION SERVER');
console.log('📊 DATABASE: MONGODB ATLAS (CLOUD) ONLY');
console.log('='.repeat(70));

const app = express();

// Middleware
// ========================
// CORS CONFIGURATION - FIX FOR NETLIFY
// ========================
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://ellora-tours.netlify.app',  // Your Netlify URL
    /\.netlify\.app$/                    // Allow all netlify.app subdomains
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.some(allowed => 
            allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
        )) {
            callback(null, true);
        } else {
            console.log('❌ CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ========================
// MONGODB ATLAS CONNECTION - NO FALLBACK
// ========================

console.log('\n🔗 INITIALIZING MONGODB ATLAS CONNECTION...');

// Your MongoDB Atlas URI (from .env)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ellorataxi001:ellorataxi0101@cluster0.ncqb61r.mongodb.net/ellora-tours?retryWrites=true&w=majority';

// Connect to MongoDB Atlas - BLOCKING CONNECTION
mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
})
.then(() => {
    console.log('✅ MONGODB ATLAS CONNECTED SUCCESSFULLY!');
    console.log(`   📍 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`   🌐 Host: ${mongoose.connection.host}`);
    console.log(`   🔗 Connection State: ${mongoose.connection.readyState === 1 ? 'READY' : 'NOT READY'}`);
    
    // List collections to verify
    mongoose.connection.db.listCollections().toArray()
        .then(collections => {
            console.log(`   📁 Collections: ${collections.map(c => c.name).join(', ') || 'Will be created on first save'}`);
        })
        .catch(err => {
            console.log('   📁 Collections: Could not list (will be created automatically)');
        });
    
    console.log('\n🎯 READY TO ACCEPT ENQUIRIES - ALL DATA GOES TO MONGODB ATLAS');
    console.log('='.repeat(70));
})
.catch(err => {
    console.error('\n❌ CRITICAL ERROR: MONGODB ATLAS CONNECTION FAILED!');
    console.error(`   Error: ${err.message}`);
    console.error('\n💡 FIX THESE ISSUES:');
    console.error('   1. Check MONGODB_URI in .env file');
    console.error('   2. Verify username/password are correct');
    console.error('   3. Add IP 0.0.0.0/0 to Network Access in MongoDB Atlas');
    console.error('   4. Make sure cluster is running (not paused)');
    console.error('\n🚫 SERVER WILL NOT START WITHOUT MONGODB CONNECTION');
    process.exit(1); // Stop the server completely
});

// ========================
// ENQUIRY MODEL (MONGODB SCHEMA)
// ========================

const enquirySchema = new mongoose.Schema({
    // Personal Information
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true
    },
    
    // Enquiry Details
    enquiryType: {
        type: String,
        required: [true, 'Enquiry type is required'],
        enum: ['tour', 'vehicle', 'hotel', 'package', 'general', 'corporate', 'other'],
        default: 'general'
    },
    
    // Travel Details
    destination: String,
    travelDate: Date,
    numberOfDays: Number,
    numberOfPersons: {
        type: Number,
        default: 1,
        min: 1
    },
    
    // Vehicle Details
    vehicleType: String,
    vehicleModel: String,
    
    // Package Details
    tourPackage: String,
    packageType: String,
    
    // Hotel Details
    hotelCategory: String,
    roomType: String,
    
    // Other Details
    budgetRange: String,
    pickupLocation: String,
    dropLocation: String,
    specialRequirements: String,
    
    // Message
    message: {
        type: String,
        required: [true, 'Message is required']
    },
    
    // Status
    status: {
        type: String,
        enum: ['new', 'contacted', 'followup', 'converted', 'rejected'],
        default: 'new'
    },
    
    // Metadata
    source: {
        type: String,
        default: 'website'
    },
    ipAddress: String,
    userAgent: String,
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Create model
const Enquiry = mongoose.model('Enquiry', enquirySchema);

// ========================
// PAYMENT MODEL - ADD THIS
// ========================
const paymentSchema = new mongoose.Schema({
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    customerName: String,
    customerEmail: String,
    customerPhone: String,
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
        type: String,
        enum: ['created', 'attempted', 'paid', 'failed'],
        default: 'created'
    },
    bookingType: String,
    createdAt: { type: Date, default: Date.now },
    paidAt: Date
});

const Payment = mongoose.model('Payment', paymentSchema);

// ========================
// SERVE FRONTEND FILES
// ========================

const frontendPath = path.join(__dirname, '..');
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    console.log(`\n📁 Serving frontend from: ${frontendPath}`);
} else {
    console.log(`\n⚠️ Frontend folder not found: ${frontendPath}`);
}

// ========================
// PAYMENT ROUTES - ADD THIS SECTION
// ========================
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Order Endpoint
app.post('/api/create-order', async (req, res) => {
    try {
        const { amount, bookingDetails } = req.body;
        
        console.log('📦 Creating Razorpay order for amount:', amount);

        const options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: bookingDetails
        };

        const order = await razorpay.orders.create(options);
        console.log('✅ Order created:', order.id);

        // Save payment record
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

// Verify Payment Endpoint
app.post('/api/verify-payment', async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            bookingDetails
        } = req.body;

        console.log('🔍 Verifying payment:', razorpay_order_id);

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
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

// Get Payment Status
app.get('/api/payment-status/:orderId', async (req, res) => {
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

// ========================
// API ENDPOINTS - MONGODB ONLY
// ========================

// Health Check
app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState;
    
    res.json({
        success: true,
        message: 'Ellora Tours Backend - MongoDB Atlas',
        timestamp: new Date().toISOString(),
        database: dbStatus === 1 ? 'CONNECTED to MongoDB Atlas' : 'DISCONNECTED',
        connection: {
            state: dbStatus,
            host: mongoose.connection.host,
            name: mongoose.connection.name
        },
        storage: 'MONGODB ATLAS ONLY - No local storage'
    });
});

// Test MongoDB Connection
app.get('/api/test-db', async (req, res) => {
    try {
        await mongoose.connection.db.command({ ping: 1 });
        const count = await Enquiry.countDocuments();
        
        res.json({
            success: true,
            message: 'MongoDB Atlas is working!',
            database: mongoose.connection.db.databaseName,
            enquiriesCount: count,
            connection: 'Active'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'MongoDB connection failed',
            message: error.message
        });
    }
});

// ========================
// SAVE ENQUIRY TO MONGODB ATLAS
// ========================

app.post('/api/enquiry', async (req, res) => {
    console.log('\n' + '='.repeat(70));
    console.log('📝 INCOMING ENQUIRY - SAVING TO MONGODB ATLAS');
    console.log('='.repeat(70));
    
    try {
        const formData = req.body;
        
        console.log('📋 CLIENT DATA:');
        console.log(`   👤 Name: ${formData.fullName}`);
        console.log(`   📞 Phone: ${formData.phoneNumber}`);
        console.log(`   📧 Email: ${formData.email}`);
        
        if (mongoose.connection.readyState !== 1) {
            throw new Error('MongoDB Atlas is not connected. Cannot save data.');
        }
        
        formData.ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        formData.userAgent = req.headers['user-agent'];
        formData.source = 'website';
        
        if (!formData.fullName || !formData.phoneNumber || !formData.email || !formData.message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, phone, email, and message are required'
            });
        }
        
        console.log('\n💾 SAVING TO MONGODB ATLAS...');
        
        const enquiry = new Enquiry(formData);
        const savedEnquiry = await enquiry.save();
        
        console.log('✅ Enquiry saved to MongoDB');
        
        let smsResult = { success: false };
        try {
            const { sendConfirmationSMS } = require('./utils/smsService');
            smsResult = await sendConfirmationSMS(
                formData.phoneNumber,
                formData.fullName,
                formData.enquiryType || 'General Enquiry'
            );
            
            savedEnquiry.smsSent = smsResult.success;
            savedEnquiry.smsStatus = smsResult.success ? 'sent' : 'failed';
            await savedEnquiry.save();
            
            console.log(`📱 SMS Status: ${smsResult.success ? '✅ Sent' : '❌ Failed'}`);
        } catch (smsError) {
            console.error('SMS Error:', smsError.message);
        }
        
        res.json({
            success: true,
            message: '✅ Enquiry saved successfully to MongoDB Atlas database!',
            smsSent: smsResult.success,
            data: {
                enquiryId: savedEnquiry._id,
                reference: `ENQ-${Date.now().toString().slice(-8)}`,
                name: savedEnquiry.fullName,
                email: savedEnquiry.email,
                type: savedEnquiry.enquiryType,
                status: savedEnquiry.status,
                createdAt: savedEnquiry.createdAt,
                smsStatus: smsResult.success ? 'sent' : 'failed',
                storage: {
                    type: 'MongoDB Atlas',
                    database: 'ellora-tours',
                    collection: 'enquiries',
                    cloud: true
                }
            }
        });
        
    } catch (error) {
        console.error('\n❌ MONGODB SAVE FAILED:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Database Save Failed',
            message: 'Could not save to MongoDB Atlas. Please try again.'
        });
    }
});

// ========================
// GET ENQUIRIES FROM MONGODB
// ========================

app.get('/api/enquiries', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                error: 'MongoDB Atlas not connected'
            });
        }
        
        const enquiries = await Enquiry.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        
        const count = await Enquiry.countDocuments();
        
        res.json({
            success: true,
            message: `Found ${count} enquiries in MongoDB Atlas`,
            data: enquiries,
            count: count,
            source: 'MongoDB Atlas Cloud Database',
            database: mongoose.connection.db.databaseName
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch from MongoDB',
            message: error.message
        });
    }
});

// ========================
// HTML ROUTES
// ========================

app.get('/', (req, res) => {
    const homePath = path.join(frontendPath, 'home.html');
    if (fs.existsSync(homePath)) {
        res.sendFile(homePath);
    } else {
        res.send(`
            <h1>Ellora Tours & Travels</h1>
            <p>✅ Backend is running with MongoDB Atlas</p>
            <p>📊 Database: MongoDB Cloud Connected</p>
            <p><a href="/api/health">Check API Health</a></p>
            <p><a href="/api/enquiries">View Enquiries (MongoDB)</a></p>
        `);
    }
});

// Other pages
['contact', 'tour-packages', 'photogallery', 'booking-payment'].forEach(page => {
    app.get(`/${page}`, (req, res) => {
        const pagePath = path.join(frontendPath, `${page}.html`);
        if (fs.existsSync(pagePath)) {
            res.sendFile(pagePath);
        } else {
            res.redirect('/');
        }
    });
});

// Admin page to view data
app.get('/admin', (req, res) => {
    res.send(`...`); // Your existing admin HTML (kept as is)
});

// ========================
// START SERVER
// ========================

const PORT = process.env.PORT || 3000;

// Wait for MongoDB connection before starting server
mongoose.connection.once('open', () => {
    app.listen(PORT, () => {
        console.log('\n' + '='.repeat(70));
        console.log(`🚀 SERVER STARTED: http://localhost:${PORT}`);
        console.log(`📊 DATABASE: MONGODB ATLAS (CLOUD)`);
        console.log(`💾 STORAGE: NO LOCAL STORAGE - ALL DATA TO MONGODB`);
        console.log('='.repeat(70));
        
        console.log('\n🌐 AVAILABLE ENDPOINTS:');
        console.log(`   📍 GET  /                    - Home page`);
        console.log(`   📍 GET  /admin               - View MongoDB data`);
        console.log(`   🔧 GET  /api/health          - Check MongoDB status`);
        console.log(`   🔧 GET  /api/test-db         - Test MongoDB connection`);
        console.log(`   📝 POST /api/enquiry         - Save enquiry to MongoDB Atlas`);
        console.log(`   📊 GET  /api/enquiries       - Get all enquiries from MongoDB`);
        console.log(`   💰 POST /api/create-order    - Create Razorpay order`);
        console.log(`   💰 POST /api/verify-payment  - Verify Razorpay payment`);
        console.log(`   💰 GET  /api/payment-status  - Get payment status`);
        console.log('\n🔗 VIEW DATA IN MONGODB ATLAS:');
        console.log('   https://cloud.mongodb.com → Cluster → Browse Collections');
        console.log('='.repeat(70));
    });
});

// Handle MongoDB errors
mongoose.connection.on('error', (err) => {
    console.error('\n❌ MONGODB ERROR:', err.message);
});

// Handle server shutdown
process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down server...');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
});