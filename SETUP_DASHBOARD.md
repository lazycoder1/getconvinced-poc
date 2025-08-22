# Dashboard Setup Guide

This guide will help you set up the S3 and PostgreSQL infrastructure for the multi-website dashboard.

## Prerequisites

1. **AWS Account** with S3 access
2. **PostgreSQL Database** (local or cloud)
3. **Node.js** and **npm** installed
4. **Environment variables** ready

## Step 1: Environment Configuration

Add the following variables to your `.env.local` file:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/dashboard_db"

# AWS S3 Configuration
AWS_ACCESS_KEY_ID="your-access-key-here"
AWS_SECRET_ACCESS_KEY="your-secret-key-here"
AWS_S3_BUCKET="your-bucket-name-here"
AWS_REGION="us-east-1"

# Dashboard Configuration
NEXT_PUBLIC_DASHBOARD_ENABLED=true
```

### Getting AWS Credentials

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **IAM** > **Users**
3. Create a new user with **S3 Full Access** policy
4. Generate access keys and add them to your `.env.local`

### Setting up S3 Bucket

1. Go to **S3** in AWS Console
2. Create a new bucket (e.g., `your-project-dashboard`)
3. Enable **Block all public access** (we'll use signed URLs)
4. Add CORS policy:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["http://localhost:3001"],
        "ExposeHeaders": [],
        "MaxAgeSeconds": 3000
    }
]
```

### PostgreSQL Setup

**Option 1: Local PostgreSQL**
```bash
# Install PostgreSQL (macOS)
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Create database
createdb dashboard_db
```

**Option 2: Cloud PostgreSQL** (Recommended)
- **Supabase**: Free tier available
- **Neon**: Serverless PostgreSQL
- **Railway**: Includes PostgreSQL
- **ElephantSQL**: Managed PostgreSQL

## Step 2: Database Setup

1. **Install Prisma Client**
```bash
npx prisma generate
```

2. **Run Database Setup**
```bash
node scripts/setup-dashboard.js
```

This will:
- ✅ Connect to your database
- ✅ Create the HubSpot website entry
- ✅ Add existing screenshots to database
- ✅ Create sample system prompt

## Step 3: Upload Assets to S3

1. **Upload Screenshots**
```bash
node scripts/upload-screenshots.js
```

2. **Upload System Prompts**
```bash
node scripts/upload-prompts.js
```

## Step 4: Test Connections

Create a test file to verify everything works:

```javascript
// test-connections.js
const { testDatabaseConnection } = require('./src/lib/database');
const { s3Client } = require('./src/lib/s3');
const { buildCombinedPrompt } = require('./src/lib/prompt-builder');

async function testConnections() {
  console.log('🧪 Testing connections...');

  // Test database
  const dbConnected = await testDatabaseConnection();
  console.log(dbConnected ? '✅ Database OK' : '❌ Database failed');

  // Test S3
  try {
    await s3Client.send(new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET
    }));
    console.log('✅ S3 OK');
  } catch (error) {
    console.log('❌ S3 failed:', error.message);
  }

  // Test prompt building
  try {
    const prompt = await buildCombinedPrompt('hubspot');
    console.log('✅ Prompt building OK (length:', prompt.length, ')');
  } catch (error) {
    console.log('❌ Prompt building failed:', error.message);
  }
}

testConnections();
```

Run the test:
```bash
node test-connections.js
```

## Step 5: Start Development Server

```bash
npm run dev
```

Visit:
- **Main App**: http://localhost:3001
- **Dashboard**: http://localhost:3001/dashboard
- **Agent Demo**: http://localhost:3001/agent-demo?website=hubspot

## Troubleshooting

### Database Connection Issues

**Error**: `password authentication failed`
- Check your `DATABASE_URL` format
- Verify database user and password
- Ensure database exists: `createdb dashboard_db`

**Error**: `relation does not exist`
- Run: `npx prisma db push`
- Or: `npx prisma migrate dev`

### S3 Issues

**Error**: `InvalidAccessKeyId`
- Check your AWS credentials
- Ensure the IAM user has S3 permissions
- Verify the bucket exists and is accessible

**Error**: `AccessDenied`
- Check bucket permissions
- Verify CORS policy is set
- Ensure bucket is not public

### Common Issues

1. **Environment Variables Not Loaded**
   - Restart your development server
   - Check `.env.local` file exists and is properly formatted

2. **Prisma Client Not Generated**
   ```bash
   npx prisma generate
   ```

3. **Database Schema Out of Sync**
   ```bash
   npx prisma db push
   ```

## Next Steps

1. ✅ **Infrastructure Setup** (Completed)
2. 🔄 **Dashboard UI Development** (Next)
3. 📤 **Screenshot Management**
4. 📝 **System Prompt Editor**
5. 🤖 **Agent Integration**
6. 🔗 **Link Generation**

## File Structure Created

```
├── src/lib/
│   ├── database.ts          # Database connection utilities
│   ├── s3.ts                # S3 upload/download utilities
│   └── prompt-builder.ts    # Prompt combination logic
├── prisma/
│   └── schema.prisma        # Database schema
├── scripts/
│   ├── setup-dashboard.js   # Initial database setup
│   ├── upload-screenshots.js # S3 screenshot upload
│   └── upload-prompts.js    # S3 prompt upload
└── SETUP_DASHBOARD.md       # This setup guide
```

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all environment variables are set
3. Test individual components (database, S3, prompts)
4. Check browser console for errors

Ready to start building the dashboard UI? Let me know when your infrastructure is set up!
