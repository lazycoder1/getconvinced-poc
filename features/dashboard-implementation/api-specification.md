# API Specification

## Overview
This document outlines all the API endpoints needed for the dashboard and agent demo functionality.

## Base URL
- Dashboard APIs: `/api/dashboard`
- Agent APIs: `/api/agent`
- Public APIs: `/api/public`

## Dashboard Endpoints

### Website Management
```http
GET /api/dashboard/websites
```
- **Purpose**: List all websites
- **Response**:
```json
{
  "websites": [
    {
      "id": "uuid",
      "name": "HubSpot",
      "slug": "hubspot",
      "description": "HubSpot CRM system",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

```http
POST /api/dashboard/websites
```
- **Purpose**: Create new website
- **Body**:
```json
{
  "name": "HubSpot",
  "slug": "hubspot",
  "description": "HubSpot CRM system"
}
```

```http
GET /api/dashboard/websites/{slug}
```
- **Purpose**: Get website details with screenshots and prompts
- **Response**:
```json
{
  "website": {
    "id": "uuid",
    "name": "HubSpot",
    "slug": "hubspot",
    "screenshots": [...],
    "active_prompt": {...}
  }
}
```

### Screenshot Management
```http
POST /api/dashboard/screenshots/upload
```
- **Purpose**: Upload screenshot for a website
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file`: Image file
  - `website_id`: UUID of website
  - `description`: Optional description

```http
GET /api/dashboard/screenshots/{website-slug}
```
- **Purpose**: List all screenshots for a website
- **Response**:
```json
{
  "screenshots": [
    {
      "id": "uuid",
      "filename": "dashboard.png",
      "s3_key": "agent-configs/hubspot/screenshots/dashboard.png",
      "annotation": "Main dashboard view showing...",
      "sort_order": 1
    }
  ]
}
```

```http
PUT /api/dashboard/screenshots/{id}/annotation
```
- **Purpose**: Update screenshot annotation
- **Body**:
```json
{
  "annotation": "Updated annotation text"
}
```

### System Prompt Management
```http
POST /api/dashboard/prompts/upload
```
- **Purpose**: Upload system prompt
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file`: Markdown file
  - `website_id`: UUID of website
  - `name`: Prompt name
  - `is_active`: Boolean

```http
GET /api/dashboard/prompts/{website-slug}
```
- **Purpose**: Get active prompt for website
- **Response**:
```json
{
  "prompt": {
    "id": "uuid",
    "name": "HubSpot Agent Prompt",
    "s3_key": "agent-configs/hubspot/prompts/active.md",
    "content": "# HubSpot Agent Instructions...",
    "is_active": true
  }
}
```

### Link Generation
```http
POST /api/dashboard/agent-link
```
- **Purpose**: Generate agent demo link
- **Body**:
```json
{
  "website_slug": "hubspot"
}
```
- **Response**:
```json
{
  "link": "/agent-demo?website=hubspot",
  "full_url": "https://yoursite.com/agent-demo?website=hubspot"
}
```

## Agent Demo Endpoints

### Configuration Loading
```http
GET /api/agent/config/{website-slug}
```
- **Purpose**: Get complete configuration for agent initialization
- **Response**:
```json
{
  "website": {
    "name": "HubSpot",
    "slug": "hubspot"
  },
  "system_prompt": "# Combined system prompt...",
  "screenshots": [
    {
      "filename": "dashboard.png",
      "s3_url": "https://s3.amazonaws.com/...",
      "annotation": "Main dashboard view..."
    }
  ],
  "voice_config": {
    "voice": "alloy",
    "model": "gpt-4o-realtime-preview-2025-06-03"
  }
}
```

### Session Tracking
```http
POST /api/agent/session/start
```
- **Purpose**: Track agent session start
- **Body**:
```json
{
  "website_slug": "hubspot",
  "session_url": "/agent-demo?website=hubspot"
}
```

## Public Endpoints

### Agent Demo
```http
GET /agent-demo
```
- **Purpose**: Main agent demo page
- **Query Parameters**:
  - `website`: Website slug (required)

## Error Responses

All endpoints return consistent error format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid website slug",
    "details": {...}
  }
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

## Authentication
- Dashboard endpoints require authentication (TBD based on your auth system)
- Agent demo endpoints are public
- S3 access uses signed URLs for security

## Rate Limiting
- Upload endpoints: 10 requests per minute per user
- Config endpoints: 100 requests per minute
- Public demo: 50 requests per minute per IP
