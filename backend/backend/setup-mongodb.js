const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔧 MongoDB Atlas Setup\n');

console.log('📝 Follow these steps:');
console.log('1. Go to https://cloud.mongodb.com');
console.log('2. Create free cluster (M0 Sandbox)');
console.log('3. Create database user');
console.log('4. Add IP address (0.0.0.0/0)');
console.log('5. Get connection string\n');

rl.question('Enter your MongoDB Atlas connection string: ', (mongoURI) => {
    mongoURI = mongoURI.trim();
    
    // Ensure it has database name
    if (mongoURI.includes('?retryWrites=')) {
        mongoURI = mongoURI.replace('?retryWrites=', '/ellora-tours?retryWrites=');
    }
    
    // Read current .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add MONGODB_URI
    if (envContent.includes('MONGODB_URI=')) {
        envContent = envContent.replace(/MONGODB_URI=.*/m, `MONGODB_URI=${mongoURI}`);
    } else {
        envContent = `MONGODB_URI=${mongoURI}\n` + envContent;
    }
    
    // Write back
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ Updated .env file with MongoDB URI');
    console.log('\n🔗 Testing connection...');
    
    // Simple test
    const mongoose = require('mongoose');
    
    mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
    })
    .then(() => {
        console.log('✅ MongoDB connection successful!');
        console.log(`   Database: ${mongoose.connection.name}`);
        return mongoose.connection.close();
    })
    .catch(error => {
        console.error('❌ Connection failed:', error.message);
        console.log('\n💡 Check:');
        console.log('   1. Password is correct');
        console.log('   2. IP is whitelisted (0.0.0.0/0)');
        console.log('   3. Cluster is running');
    })
    .finally(() => {
        rl.close();
        console.log('\n🚀 Start server: npm run dev');
    });
});