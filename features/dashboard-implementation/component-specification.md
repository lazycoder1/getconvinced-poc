# Component Specification

## Overview
This document outlines the React components needed for the dashboard and agent demo functionality.

## Dashboard Components

### Layout Components

#### `DashboardLayout.tsx`
- **Purpose**: Main dashboard layout with navigation
- **Props**:
  - `children`: React.ReactNode
- **Features**:
  - Sidebar navigation
  - Header with breadcrumbs
  - Responsive design
  - Loading states

#### `WebsiteCard.tsx`
- **Purpose**: Display website in list/grid view
- **Props**:
  - `website`: Website object
  - `onEdit`: () => void
  - `onDelete`: () => void
- **Features**:
  - Website logo/name
  - Quick stats (screenshots count, last updated)
  - Action buttons

### Website Management

#### `WebsiteForm.tsx`
- **Purpose**: Create/edit website form
- **Props**:
  - `website?: Website` (optional for edit)
  - `onSubmit`: (data: WebsiteFormData) => void
  - `onCancel`: () => void
- **Features**:
  - Name, slug, description fields
  - Slug auto-generation from name
  - Validation
  - Logo upload

#### `ScreenshotManager.tsx`
- **Purpose**: Manage screenshots for a website
- **Props**:
  - `websiteId`: string
  - `websiteSlug`: string
- **Features**:
  - Upload area (drag & drop)
  - Screenshot grid with annotations
  - Sort/reorder functionality
  - Delete screenshots

#### `ScreenshotCard.tsx`
- **Purpose**: Individual screenshot display
- **Props**:
  - `screenshot`: Screenshot object
  - `onAnnotationChange`: (annotation: string) => void
  - `onDelete`: () => void
- **Features**:
  - Image preview
  - Annotation text area
  - Auto-save annotations
  - Delete button

#### `PromptEditor.tsx`
- **Purpose**: Edit system prompts
- **Props**:
  - `websiteId`: string
  - `prompt?: SystemPrompt` (optional for edit)
  - `onSave`: (data: PromptFormData) => void
- **Features**:
  - Markdown editor
  - File upload option
  - Preview mode
  - Version history

### Agent Demo Components

#### `AgentDemo.tsx`
- **Purpose**: Main agent demo page
- **Props**:
  - `websiteSlug`: string
- **Features**:
  - Dynamic configuration loading
  - Loading screen
  - Error handling
  - Integration with existing RealtimeVoiceAgent

#### `ConfigLoader.tsx`
- **Purpose**: Load and combine configuration
- **Props**:
  - `websiteSlug`: string
  - `onConfigLoaded`: (config: AgentConfig) => void
  - `onError`: (error: string) => void
- **Features**:
  - Fetch from API
  - Combine prompts and screenshots
  - Loading states
  - Error boundaries

#### `LinkGenerator.tsx`
- **Purpose**: Generate and display agent links
- **Props**:
  - `websiteSlug`: string
- **Features**:
  - Generate link button
  - Copy to clipboard
  - Display full URL
  - QR code option (optional)

#### `ScreenshotViewer.tsx`
- **Purpose**: Display screenshots in agent interface
- **Props**:
  - `screenshots`: Screenshot[]
  - `currentScreenshot?: string`
- **Features**:
  - Gallery view
  - Click to view full size
  - Navigation arrows
  - Annotation display

## Component State Management

### Context Providers

#### `DashboardContext.tsx`
- **Purpose**: Manage dashboard-wide state
- **State**:
  - `websites`: Website[]
  - `currentWebsite?: Website`
  - `loading`: boolean
  - `error?: string`

#### `AgentConfigContext.tsx`
- **Purpose**: Manage agent configuration state
- **State**:
  - `config?: AgentConfig`
  - `loading`: boolean
  - `error?: string`

## Utility Components

#### `FileUpload.tsx`
- **Purpose**: Reusable file upload component
- **Props**:
  - `accept`: string (file types)
  - `maxSize`: number (bytes)
  - `onUpload`: (file: File) => void
  - `multiple?: boolean`
- **Features**:
  - Drag & drop
  - File validation
  - Progress indicator
  - Error handling

#### `LoadingSpinner.tsx`
- **Purpose**: Consistent loading indicator
- **Props**:
  - `size?: 'sm' | 'md' | 'lg'`
  - `message?: string`

#### `ErrorBoundary.tsx`
- **Purpose**: Catch and display React errors
- **Props**:
  - `fallback`: React.ComponentType<{error: Error}>
  - `children`: React.ReactNode

## TypeScript Types

```typescript
// Core types
interface Website {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Screenshot {
  id: string;
  website_id: string;
  filename: string;
  s3_key: string;
  s3_bucket: string;
  description?: string;
  annotation?: string;
  sort_order: number;
  width?: number;
  height?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SystemPrompt {
  id: string;
  website_id: string;
  name: string;
  description?: string;
  s3_key: string;
  s3_bucket: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

// Form types
interface WebsiteFormData {
  name: string;
  slug: string;
  description?: string;
  logo?: File;
}

interface ScreenshotFormData {
  file: File;
  description?: string;
}

interface PromptFormData {
  name: string;
  description?: string;
  content: string;
  file?: File;
}

// Agent configuration
interface AgentConfig {
  website: Website;
  system_prompt: string;
  screenshots: Screenshot[];
  voice_config: {
    voice: string;
    model: string;
  };
}
```

## Styling Approach

- **Framework**: Tailwind CSS (consistent with existing app)
- **Design System**: Extend existing design tokens
- **Responsive**: Mobile-first approach
- **Dark Mode**: Optional dark mode support

## Component Architecture

### Folder Structure
```
src/components/
├── dashboard/
│   ├── layout/
│   │   ├── DashboardLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── websites/
│   │   ├── WebsiteCard.tsx
│   │   ├── WebsiteForm.tsx
│   │   └── WebsiteList.tsx
│   ├── screenshots/
│   │   ├── ScreenshotManager.tsx
│   │   ├── ScreenshotCard.tsx
│   │   └── ScreenshotUpload.tsx
│   └── prompts/
│       ├── PromptEditor.tsx
│       └── PromptList.tsx
├── agent-demo/
│   ├── AgentDemo.tsx
│   ├── ConfigLoader.tsx
│   ├── LinkGenerator.tsx
│   └── ScreenshotViewer.tsx
└── shared/
    ├── FileUpload.tsx
    ├── LoadingSpinner.tsx
    ├── ErrorBoundary.tsx
    └── ConfirmDialog.tsx
```

## Integration Points

### Existing Components
- **RealtimeVoiceAgent**: Will need modification to accept dynamic configs
- **PlaywrightController**: May need updates for dynamic screenshot handling
- **DebugPanel**: Can be extended for dashboard debugging

### Data Flow
1. Dashboard loads website list
2. User selects website
3. Screenshot and prompt data loaded
4. User generates agent link
5. Agent demo loads configuration
6. Realtime agent initializes with config
