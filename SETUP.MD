# FlowCare Setup Guide

## Prerequisites
- Node.js 18+ installed
- MongoDB database (local or cloud)
- Git

## Installation Steps

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Environment Variables
Create a `.env.local` file in the root directory:

\`\`\`env
# Database
MONGODB_URI=mongodb://localhost:27017/flowcare
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/flowcare

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key

# Optional: Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
\`\`\`

### 3. Database Setup
Run the database setup script:
\`\`\`bash
npm run setup-db
\`\`\`

This will:
- Connect to MongoDB
- Create necessary collections
- Set up indexes
- Add sample data (optional)

### 4. Start Development Server
\`\`\`bash
npm run dev
\`\`\`

Visit `http://localhost:3000` to see your application.

## Project Structure

\`\`\`
flowcare/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── auth/          # Authentication endpoints
│   ├── auth/              # Auth pages (login, register)
│   ├── dashboard/         # Dashboard pages
│   └── globals.css        # Global styles
├── components/            # React components
│   └── ui/               # UI components (shadcn/ui)
├── lib/                  # Utility libraries
│   ├── auth/             # Authentication logic
│   ├── database/         # Database operations
│   └── hooks/            # Custom React hooks
└── scripts/              # Database scripts
\`\`\`

## Key Features

- **Authentication**: JWT-based auth with bcrypt password hashing
- **Database**: MongoDB with connection pooling
- **UI**: Modern UI with Tailwind CSS and shadcn/ui components
- **TypeScript**: Full type safety
- **Responsive**: Mobile-first design

## Troubleshooting

### Common Issues

1. **Import Errors**: Make sure all dependencies are installed with `npm install`

2. **Database Connection**: Verify your `MONGODB_URI` in `.env.local`

3. **Port Already in Use**: Change the port with `npm run dev -- -p 3001`

4. **PostCSS Errors**: Clear `.next` folder and restart: `rm -rf .next && npm run dev`

### Development Commands

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Setup database
npm run setup-db
\`\`\`

## Environment Setup Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` file created with required variables
- [ ] MongoDB running (local or cloud connection working)
- [ ] Database setup script executed
- [ ] Development server starts without errors
- [ ] All pages load correctly
- [ ] Authentication flow works (register/login)

## Next Steps

1. Customize the UI components in `components/ui/`
2. Add your business logic in `lib/`
3. Configure your database schema in `scripts/`
4. Set up deployment on Vercel or your preferred platform

For support, check the documentation or create an issue in the repository.
