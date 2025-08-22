# Dashboard Implementation Plan

## Overview
This document outlines the implementation plan for the multi-website dashboard system that will allow users to configure and manage AI agents for different CRM systems, starting with HubSpot.

## Core Requirements
- **Multi-website support**: Dashboard to manage multiple websites/CRMs (HubSpot first)
- **Screenshot management**: Upload and annotate screenshots with text descriptions
- **Dynamic agent links**: Generate URLs like `/agent-demo?website=hubspot`
- **System prompt integration**: Combine base prompts with website-specific content
- **Storage strategy**: S3 for large content, PostgreSQL for metadata

## Architecture Overview

### 1. Database Schema (PostgreSQL)
```sql
-- Websites table
CREATE TABLE websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Screenshots table
CREATE TABLE screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  s3_key VARCHAR(500) NOT NULL,
  description TEXT,
  annotation TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- System prompts table
CREATE TABLE system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  s3_key VARCHAR(500) NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. S3 Bucket Structure
```
/agent-configs/
├── {website-slug}/
│   ├── screenshots/
│   │   ├── screenshot1.png
│   │   ├── screenshot2.png
│   │   └── ...
│   ├── prompts/
│   │   ├── base-prompt.md
│   │   ├── variant1.md
│   │   └── variant2.md
│   └── config.json
└── shared/
    └── base-prompts/
        └── default-agent-instructions.md
```

### 3. API Endpoints

#### Dashboard APIs
- `GET /api/websites` - List all websites
- `POST /api/websites` - Create new website
- `GET /api/websites/{slug}` - Get website details
- `POST /api/screenshots/upload` - Upload screenshot
- `PUT /api/screenshots/{id}/annotation` - Update annotation
- `GET /api/system-prompts/{website-slug}` - Get active prompt
- `POST /api/system-prompts` - Upload/update prompt
- `POST /api/agent-link` - Generate agent demo link

#### Agent Demo API
- `GET /api/agent-config/{website-slug}` - Get combined config for agent

### 4. UI Components Structure

#### Dashboard Pages
```
/dashboard
├── layout.tsx (main dashboard layout)
├── page.tsx (website overview)
├── websites/
│   ├── page.tsx (list all websites)
│   ├── [slug]/
│   │   ├── page.tsx (website detail)
│   │   ├── screenshots/
│   │   │   └── page.tsx (manage screenshots)
│   │   └── prompts/
│   │       └── page.tsx (manage system prompts)
└── components/
    ├── WebsiteCard.tsx
    ├── ScreenshotManager.tsx
    ├── PromptEditor.tsx
    └── LinkGenerator.tsx
```

#### Agent Demo Pages
```
/agent-demo
├── page.tsx (main demo page with website selection)
└── components/
    ├── AgentLoader.tsx
    ├── ConfigLoader.tsx
    └── ScreenshotViewer.tsx
```

## Implementation Phases

### Phase 1: Database & Infrastructure Setup
1. Set up PostgreSQL database with migrations
2. Configure AWS S3 bucket with proper permissions
3. Create database connection utilities
4. Set up file upload handling

### Phase 2: Core Dashboard UI
1. Create dashboard layout and navigation
2. Implement website CRUD operations
3. Build screenshot upload component
4. Create annotation editor
5. Implement system prompt management

### Phase 3: Agent Integration
1. Modify existing realtime agent to support dynamic configs
2. Create agent config loader that fetches from S3/PostgreSQL
3. Implement dynamic prompt stitching
4. Add loading states for configuration

### Phase 4: Link Generation & Demo
1. Create link generation system
2. Build agent demo page with website parameter
3. Implement configuration loading on agent startup
4. Add copy-to-clipboard functionality

### Phase 5: Polish & Testing
1. Add error handling and validation
2. Implement loading states and progress indicators
3. Add responsive design
4. Test end-to-end flow

## Technical Implementation Details

### Screenshot Management
- Upload to S3 with website-specific folder structure
- Store metadata in PostgreSQL
- Display as grid with annotation text areas
- Real-time save of annotations

### System Prompt Combination
```typescript
// Example of how prompts will be combined
const buildCombinedPrompt = async (websiteSlug: string) => {
  // 1. Load base prompt from S3
  const basePrompt = await s3.getObject(`shared/base-prompts/default-agent-instructions.md`);

  // 2. Load website-specific prompt
  const websitePrompt = await s3.getObject(`agent-configs/${websiteSlug}/prompts/active.md`);

  // 3. Load screenshot annotations
  const screenshots = await db.screenshots.findMany({
    where: { website: { slug: websiteSlug } }
  });

  // 4. Combine into final prompt
  const screenshotSection = screenshots
    .map(s => `Screenshot: ${s.filename}\nDescription: ${s.annotation}\n`)
    .join('\n');

  return `${basePrompt}\n\nWEBSITE-SPECIFIC CONFIGURATION:\n${websitePrompt}\n\nSCREENSHOTS:\n${screenshotSection}`;
};
```

### Agent Demo Flow
1. User accesses `/agent-demo?website=hubspot`
2. Page loads and shows loading screen
3. ConfigLoader fetches combined prompt and screenshot URLs
4. RealtimeVoiceAgent initializes with dynamic configuration
5. Agent becomes ready for interaction

### Security Considerations
- Validate file uploads (type, size, malware scan)
- Use signed URLs for S3 access
- Rate limiting on uploads
- Input sanitization for annotations and prompts

## Next Steps
1. Review and approve database schema
2. Set up S3 and PostgreSQL credentials
3. Begin Phase 1 implementation
4. Create detailed component specifications
