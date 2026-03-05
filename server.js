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
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://ellora-tours.netlify.app'  // ← YOUR NETLIFY URL HERE
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Handle preflight requests (important for browsers)
app.options('*', cors(corsOptions));

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
        // Test database connection
        await mongoose.connection.db.command({ ping: 1 });
        
        // Count enquiries
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
        
        // Log received data
        console.log('📋 CLIENT DATA:');
        console.log(`   👤 Name: ${formData.fullName}`);
        console.log(`   📞 Phone: ${formData.phoneNumber}`);
        console.log(`   📧 Email: ${formData.email}`);
        
        // Validate MongoDB connection
        if (mongoose.connection.readyState !== 1) {
            throw new Error('MongoDB Atlas is not connected. Cannot save data.');
        }
        
        // Add metadata
        formData.ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        formData.userAgent = req.headers['user-agent'];
        formData.source = 'website';
        
        // Validation
        if (!formData.fullName || !formData.phoneNumber || !formData.email || !formData.message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, phone, email, and message are required'
            });
        }
        
        console.log('\n💾 SAVING TO MONGODB ATLAS...');
        
        // Create enquiry (WITHOUT SMS fields initially)
        const enquiry = new Enquiry(formData);
        const savedEnquiry = await enquiry.save();
        
        console.log('✅ Enquiry saved to MongoDB');
        
        // =============================================
        // 🆕 ADD THIS SECTION - SEND SMS (5 lines only)
        // =============================================
        let smsResult = { success: false };
        try {
            const { sendConfirmationSMS } = require('./utils/smsService');
            smsResult = await sendConfirmationSMS(
                formData.phoneNumber,
                formData.fullName,
                formData.enquiryType || 'General Enquiry'
            );
            
            // Update enquiry with SMS status
            savedEnquiry.smsSent = smsResult.success;
            savedEnquiry.smsStatus = smsResult.success ? 'sent' : 'failed';
            await savedEnquiry.save();
            
            console.log(`📱 SMS Status: ${smsResult.success ? '✅ Sent' : '❌ Failed'}`);
        } catch (smsError) {
            console.error('SMS Error:', smsError.message);
        }
        // =============================================
        
        // Send success response (add smsSent to response)
        res.json({
            success: true,
            message: '✅ Enquiry saved successfully to MongoDB Atlas database!',
            smsSent: smsResult.success, // 🆕 ADD THIS LINE
            data: {
                enquiryId: savedEnquiry._id,
                reference: `ENQ-${Date.now().toString().slice(-8)}`,
                name: savedEnquiry.fullName,
                email: savedEnquiry.email,
                type: savedEnquiry.enquiryType,
                status: savedEnquiry.status,
                createdAt: savedEnquiry.createdAt,
                smsStatus: smsResult.success ? 'sent' : 'failed', // 🆕 ADD THIS LINE
                storage: {
                    type: 'MongoDB Atlas',
                    database: 'ellora-tours',
                    collection: 'enquiries',
                    cloud: true
                }
            }
        });
        
    } catch (error) {
        // ... your existing error handling (keep as is) ...
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
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin - Ellora Tours</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        </head>
        <body class="bg-gray-100 p-8">
            <div class="max-w-6xl mx-auto">
                <h1 class="text-3xl font-bold text-gray-800 mb-6">📊 MongoDB Atlas Data Viewer</h1>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-white p-6 rounded-lg shadow">
                        <h3 class="text-lg font-semibold mb-2">🔗 MongoDB Status</h3>
                        <div id="dbStatus" class="text-2xl font-bold text-green-600">Checking...</div>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow">
                        <h3 class="text-lg font-semibold mb-2">📝 Total Enquiries</h3>
                        <div id="enquiryCount" class="text-2xl font-bold text-blue-600">0</div>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow">
                        <h3 class="text-lg font-semibold mb-2">🌐 View Online</h3>
                        <a href="https://cloud.mongodb.com" target="_blank" 
                           class="inline-block mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                            Open MongoDB Atlas
                        </a>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <div class="p-4 border-b">
                        <h2 class="text-xl font-bold">Enquiries in MongoDB Atlas</h2>
                        <button onclick="loadEnquiries()" class="mt-2 bg-green-500 text-white px-4 py-2 rounded">
                            <i class="fas fa-sync-alt mr-2"></i>Refresh Data
                        </button>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                    <th class="px6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                </tr>
                            </thead>
                            <tbody id="enquiryTable" class="divide-y divide-gray-200">
                                <!-- Data will load here -->
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="mt-8 p-4 bg-blue-50 rounded-lg">
                    <h3 class="font-bold text-blue-800 mb-2">📋 How to View Data in MongoDB Atlas:</h3>
                    <ol class="list-decimal pl-5 text-blue-700">
                        <li>Go to <a href="https://cloud.mongodb.com" target="_blank" class="underline">MongoDB Atlas</a></li>
                        <li>Login with your credentials</li>
                        <li>Click on your cluster (cluster0)</li>
                        <li>Click "Browse Collections"</li>
                        <li>Click "enquiries" collection</li>
                        <li>See all your data in cloud database!</li>
                    </ol>
                </div>
            </div>
            
            <script>
                async function loadEnquiries() {
                    try {
                        const response = await fetch('/api/enquiries');
                        const result = await response.json();
                        
                        if (result.success) {
                            // Update count
                            document.getElementById('enquiryCount').textContent = result.count;
                            
                            // Update table
                            const tbody = document.getElementById('enquiryTable');
                            tbody.innerHTML = result.data.map(enquiry => \`
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap">\${new Date(enquiry.createdAt).toLocaleDateString()}</td>
                                    <td class="px-6 py-4 whitespace-nowrap font-medium">\${enquiry.fullName}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">\${enquiry.phoneNumber}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">\${enquiry.email}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                            \${enquiry.enquiryType}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                            \${enquiry.status}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        \${enquiry._id.substring(0, 8)}...
                                    </td>
                                </tr>
                            \`).join('');
                        }
                    } catch (error) {
                        console.error('Error loading enquiries:', error);
                    }
                }
                
                // Check database status
                async function checkDBStatus() {
                    try {
                        const response = await fetch('/api/health');
                        const result = await response.json();
                        const statusEl = document.getElementById('dbStatus');
                        
                        if (result.database.includes('CONNECTED')) {
                            statusEl.textContent = '✅ Connected';
                            statusEl.className = 'text-2xl font-bold text-green-600';
                        } else {
                            statusEl.textContent = '❌ Disconnected';
                            statusEl.className = 'text-2xl font-bold text-red-600';
                        }
                    } catch (error) {
                        document.getElementById('dbStatus').textContent = '❌ Error';
                    }
                }
                
                // Load data on page load
                document.addEventListener('DOMContentLoaded', () => {
                    checkDBStatus();
                    loadEnquiries();
                });
            </script>
        </body>
        </html>
    `);
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

