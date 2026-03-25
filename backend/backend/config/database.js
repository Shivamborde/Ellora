// const mongoose = require('mongoose');

// const connectDB = async () => {
//     try {
//         // Get MongoDB URI from environment
//         const mongoURI = process.env.MONGODB_URI;
        
//         if (!mongoURI) {
//             throw new Error('MONGODB_URI is not defined in .env file');
//         }
        
//         console.log('🔗 Connecting to MongoDB Atlas...');
        
//         // MongoDB Atlas connection options
//         const options = {
//             useNewUrlParser: true,
//             useUnifiedTopology: true,
//             serverSelectionTimeoutMS: 10000, // Increase timeout to 10 seconds
//             socketTimeoutMS: 45000,
//             maxPoolSize: 10, // Maintain up to 10 socket connections
//         };
        
//         // Connect to MongoDB Atlas
//         const conn = await mongoose.connect(mongoURI, options);
        
//         console.log(`✅ MongoDB Atlas Connected Successfully!`);
//         console.log(`   Host: ${conn.connection.host}`);
//         console.log(`   Database: ${conn.connection.name}`);
//         console.log(`   Port: ${conn.connection.port}`);
        
//         // Connection event listeners
//         mongoose.connection.on('connected', () => {
//             console.log('🔗 Mongoose connected to MongoDB Atlas');
//         });
        
//         mongoose.connection.on('error', (err) => {
//             console.error(`❌ Mongoose connection error: ${err.message}`);
//         });
        
//         mongoose.connection.on('disconnected', () => {
//             console.log('🔌 Mongoose disconnected from MongoDB Atlas');
//         });
        
//         // Graceful shutdown
//         process.on('SIGINT', async () => {
//             await mongoose.connection.close();
//             console.log('👋 MongoDB connection closed through app termination');
//             process.exit(0);
//         });
        
//     } catch (error) {
//         console.error(`❌ MongoDB Atlas connection failed: ${error.message}`);
//         console.log('\n💡 Troubleshooting Steps:');
//         console.log('   1. Check if MONGODB_URI is set in .env file');
//         console.log('   2. Verify MongoDB Atlas connection string format');
//         console.log('   3. Make sure your IP is whitelisted in MongoDB Atlas');
//         console.log('   4. Check your internet connection');
//         console.log('\n📝 Example MONGODB_URI format:');
//         console.log('   mongodb+srv://username:password@cluster0.xxx.mongodb.net/dbname?retryWrites=true&w=majority');
        
//         // Try local MongoDB as fallback
//         console.log('\n🔄 Trying local MongoDB as fallback...');
//         try {
//             const localConn = await mongoose.connect('mongodb://localhost:27017/ellora-tours', {
//                 useNewUrlParser: true,
//                 useUnifiedTopology: true,
//             });
//             console.log('✅ Connected to local MongoDB');
//         } catch (localError) {
//             console.error('❌ Local MongoDB also failed:', localError.message);
//             console.log('💡 Install MongoDB locally or fix Atlas connection');
//         }
        
//         process.exit(1);
//     }
// };

// module.exports = connectDB;