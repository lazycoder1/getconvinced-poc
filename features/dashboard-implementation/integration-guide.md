# Integration Guide

## Overview
This guide outlines how the new dashboard system will integrate with the existing HubSpot Playwright MCP application.

## Existing System Analysis

### Current Components
- **RealtimeVoiceAgent**: Main voice agent component
- **PlaywrightController**: Browser automation
- **DebugPanel**: Debugging interface
- **ScreenshotViewer**: Static screenshot display

### Current Data Flow
1. Static screenshots loaded from `/public/screenshots/`
2. Hardcoded prompts from `/public/prompts/`
3. Agent initializes with predefined configuration

## Integration Points

### 1. RealtimeVoiceAgent Modifications

#### Current Structure
```typescript
// Current: Static configuration
const defaultInstructions = isScreenshotMode
  ? `SCREENSHOT_MODE`
  : `You are a tool expert...`;
```

#### New Structure
```typescript
// New: Dynamic configuration
const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);

useEffect(() => {
  const loadConfig = async () => {
    const websiteSlug = new URLSearchParams(window.location.search).get('website');
    if (websiteSlug) {
      const response = await fetch(`/api/agent/config/${websiteSlug}`);
      const config = await response.json();
      setAgentConfig(config);
    }
  };
  loadConfig();
}, []);

// Use dynamic config
const instructionsToUse = agentConfig?.system_prompt || defaultInstructions;
```

### 2. Screenshot Integration

#### Current Implementation
```typescript
// Static screenshot loading
import { SCREENSHOT_VIEWS } from "@/lib/screenshot-views";
```

#### New Implementation
```typescript
// Dynamic screenshot loading
const [screenshots, setScreenshots] = useState<Screenshot[]>([]);

useEffect(() => {
  if (agentConfig?.screenshots) {
    // Convert dynamic screenshots to existing format
    const dynamicScreenshots = agentConfig.screenshots.map(s => ({
      name: s.filename,
      title: s.description || s.filename,
      filename: s.filename,
      s3_url: s.s3_url, // New field for S3 URLs
      description: s.annotation
    }));
    setScreenshots(dynamicScreenshots);
  }
}, [agentConfig]);
```

### 3. API Route Modifications

#### New API Routes to Add
```
src/app/api/
├── dashboard/
│   ├── websites/
│   │   ├── route.ts (GET, POST)
│   │   └── [slug]/
│   │       └── route.ts (GET, PUT, DELETE)
│   ├── screenshots/
│   │   ├── upload/
│   │   │   └── route.ts (POST)
│   │   └── [id]/
│   │       └── annotation/
│   │           └── route.ts (PUT)
│   └── prompts/
│       ├── upload/
│       │   └── route.ts (POST)
│       └── [website-slug]/
│           └── route.ts (GET)
├── agent/
│   └── config/
│       └── [website-slug]/
│           └── route.ts (GET)
└── agent-demo/
    └── route.ts (GET - main demo page)
```

### 4. Database Integration

#### Database Connection
```typescript
// lib/db.ts (new file)
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

#### Environment Variables
```env
# Add to .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/dashboard_db"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="your-bucket-name"
AWS_REGION="us-east-1"
```

### 5. S3 Integration

#### S3 Client Setup
```typescript
// lib/s3.ts (new file)
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export { s3Client, PutObjectCommand, GetObjectCommand, getSignedUrl };
```

#### File Upload Handler
```typescript
// lib/upload.ts (new file)
export async function uploadToS3(file: File, key: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  });

  await s3Client.send(command);
  return key;
}
```

### 6. Prompt Combination Logic

#### Prompt Builder
```typescript
// lib/prompt-builder.ts (new file)
export async function buildCombinedPrompt(websiteSlug: string): Promise<string> {
  // 1. Load base prompt from S3
  const basePrompt = await loadPromptFromS3('shared/base-prompts/default-agent-instructions.md');

  // 2. Load website-specific prompt
  const websitePrompt = await loadPromptFromS3(`agent-configs/${websiteSlug}/prompts/active.md`);

  // 3. Load screenshot annotations from database
  const screenshots = await prisma.screenshot.findMany({
    where: {
      website: { slug: websiteSlug },
      is_active: true
    },
    orderBy: { sort_order: 'asc' }
  });

  // 4. Combine into final prompt
  const screenshotSection = screenshots
    .map(s => `Screenshot: ${s.filename}\nDescription: ${s.annotation || 'No description'}\n`)
    .join('\n');

  return `${basePrompt}\n\n---\n\nWEBSITE-SPECIFIC CONFIGURATION:\n${websitePrompt}\n\n---\n\nSCREENSHOTS:\n${screenshotSection}`;
}

async function loadPromptFromS3(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
  });

  const response = await s3Client.send(command);
  return response.Body?.transformToString() || '';
}
```

### 7. URL Structure Changes

#### Current URLs
- `/` - Main page
- Demo functionality embedded in main page

#### New URLs
- `/` - Main page
- `/dashboard` - Dashboard homepage
- `/dashboard/websites` - Website management
- `/dashboard/websites/{slug}` - Website detail
- `/dashboard/websites/{slug}/screenshots` - Screenshot management
- `/dashboard/websites/{slug}/prompts` - Prompt management
- `/agent-demo?website={slug}` - Agent demo with specific website

### 8. Component Modifications

#### RealtimeVoiceAgent Updates
```typescript
// Add props for dynamic configuration
interface RealtimeVoiceAgentProps {
  // ... existing props
  agentConfig?: AgentConfig;
  onConfigLoading?: (loading: boolean) => void;
  onConfigError?: (error: string) => void;
}
```

#### PlaywrightController Updates
```typescript
// Update to handle dynamic screenshots
interface PlaywrightControllerProps {
  // ... existing props
  screenshots?: Screenshot[];
  screenshotUrls?: string[]; // New: S3 URLs for screenshots
}
```

### 9. Data Migration

#### Existing Data Migration
1. Move existing screenshots to S3
2. Create database entries for existing screenshots
3. Migrate existing prompts to S3
4. Create HubSpot website entry

#### Migration Script
```typescript
// scripts/migrate-existing-data.ts
async function migrateExistingData() {
  // 1. Create HubSpot website
  const hubspot = await prisma.website.create({
    data: {
      name: 'HubSpot',
      slug: 'hubspot',
      description: 'HubSpot CRM system'
    }
  });

  // 2. Upload existing screenshots to S3
  const existingScreenshots = SCREENSHOT_VIEWS;
  for (const screenshot of existingScreenshots) {
    const filePath = path.join(process.cwd(), 'public', 'screenshots', screenshot.filename);
    const fileBuffer = fs.readFileSync(filePath);

    // Upload to S3
    const s3Key = `agent-configs/hubspot/screenshots/${screenshot.filename}`;
    await uploadToS3(fileBuffer, s3Key);

    // Create database entry
    await prisma.screenshot.create({
      data: {
        website_id: hubspot.id,
        filename: screenshot.filename,
        s3_key: s3Key,
        s3_bucket: process.env.AWS_S3_BUCKET!,
        description: screenshot.title,
        annotation: screenshot.description,
        sort_order: existingScreenshots.indexOf(screenshot)
      }
    });
  }
}
```

### 10. Testing Strategy

#### Integration Tests
1. Test agent demo loading with different websites
2. Test prompt combination functionality
3. Test screenshot loading from S3
4. Test database queries and relationships

#### End-to-End Tests
1. Create website → Upload screenshots → Generate agent link → Test agent demo
2. Test annotation updates and prompt changes
3. Test error scenarios (missing website, invalid files)

## Deployment Considerations

### Environment Setup
1. Set up separate database for testing
2. Configure S3 bucket with proper permissions
3. Set up environment variables
4. Configure domain and SSL

### Database Migration
1. Run schema migrations
2. Execute data migration scripts
3. Verify data integrity
4. Create database backups

### Monitoring
1. Set up database monitoring
2. Monitor S3 usage and costs
3. Add error tracking
4. Set up performance monitoring

## Rollback Plan

### Database Rollback
- Keep database backups before migration
- Create rollback scripts for schema changes
- Test rollback procedures

### Code Rollback
- Keep existing code functional
- Use feature flags for new functionality
- Maintain backward compatibility

## Next Steps

1. **Immediate**: Set up database and S3 infrastructure
2. **Week 1**: Implement dashboard layout and website CRUD
3. **Week 2**: Build screenshot upload and annotation system
4. **Week 3**: Implement prompt management and S3 integration
5. **Week 4**: Modify agent for dynamic configuration
6. **Week 5**: Create agent demo page and link generation
7. **Week 6**: Testing, polishing, and production deployment

This integration maintains compatibility with the existing system while adding the new dynamic functionality. The existing static functionality will continue to work while the new dashboard provides enhanced capabilities.
