# MongoDB Atlas Database Setup Guide

## Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for a free account
3. Create a new cluster (choose the free tier)

## Step 2: Configure Database Access
1. In your Atlas dashboard, go to "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and password (save these!)
5. Set privileges to "Atlas admin" or "Read and write to any database"

## Step 3: Configure Network Access
1. Go to "Network Access" in your Atlas dashboard
2. Click "Add IP Address"
3. Choose "Allow access from anywhere" (0.0.0.0/0) for development
4. Click "Confirm"

## Step 4: Get Connection String
1. Go to "Clusters" in your Atlas dashboard
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" as driver
5. Copy the connection string

## Step 5: Update Environment Variables
Update your `.env.local` file with your actual MongoDB connection string:

```env
# Replace with your actual MongoDB connection string
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.cao86th.mongodb.net/symmuse?retryWrites=true&w=majority

# JWT Secret for authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Next.js Environment
NODE_ENV=development
```

## Step 6: Test Connection
Run the following command to test your database connection:

```bash
npm run dev
```

## Database Collections
The application will automatically create these collections:
- `users` - User accounts and profiles
- `periods` - Period tracking data
- `mood_tracking` - Mood and symptom tracking
- `community_posts` - Community forum posts
- `consultations` - Doctor consultations
- `notifications` - User notifications

## Troubleshooting
- Make sure your IP address is whitelisted in Network Access
- Verify your username and password are correct
- Check that your cluster is running (not paused)
- Ensure the database name in the connection string is "symmuse"
