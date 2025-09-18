import 'dotenv/config'
// Test MongoDB Connection
import { connectToDatabase } from './lib/database/mongodb.js'

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...')
    const { db, client } = await connectToDatabase()
    
    // Test basic operations
    const collections = await db.listCollections().toArray()
    console.log('✅ Connected to MongoDB successfully!')
    console.log('📊 Available collections:', collections.map(c => c.name))
    
    // Test user collection
    const users = db.collection('users')
    const userCount = await users.countDocuments()
    console.log(`👥 Users in database: ${userCount}`)
    
    await client.close()
    console.log('🔌 Connection closed')
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    console.log('\n🔧 Troubleshooting steps:')
    console.log('1. Check your MONGODB_URI in .env.local')
    console.log('2. Verify your MongoDB Atlas cluster is running')
    console.log('3. Ensure your IP is whitelisted in Network Access')
    console.log('4. Check your database user credentials')
  }
}

testConnection()
