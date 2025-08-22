# Official Microsoft Playwright MCP Implementation Plan

## Current State
- ❌ Custom Docker with basic browser + custom HTTP server  
- ❌ React app with custom OpenAI integration
- ✅ Working noVNC browser view
- ✅ Basic voice interface

## Target Architecture

### 1. Docker Container (MCP Server)
```
┌─────────────────────────────────────┐
│ Docker Container                    │
│ ┌─────────────────────────────────┐ │
│ │ Browser (Chrome) + VNC          │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ @playwright/mcp Server          │ │ 
│ │ - browser_navigate              │ │
│ │ - browser_click                 │ │
│ │ - browser_type                  │ │
│ │ - browser_snapshot              │ │
│ │ - all browser primitives        │ │
│ └─────────────────────────────────┘ │
│ Port 3000: MCP Server               │
│ Port 8080: noVNC Web Interface      │
└─────────────────────────────────────┘
```

### 2. Next.js API Routes (MCP Client)
```
┌─────────────────────────────────────┐
│ Next.js API Routes                  │
│ ┌─────────────────────────────────┐ │
│ │ OpenAI Agent SDK                │ │
│ │ - MCPServerStdio connection     │ │
│ │ - Voice agent logic             │ │
│ │ - HubSpot pre-sales expert      │ │
│ └─────────────────────────────────┘ │
│ /api/voice-agent                    │
│ /api/chat                           │
└─────────────────────────────────────┘
```

### 3. React Frontend (Voice Interface)
```
┌─────────────────────────────────────┐
│ React App                           │
│ ┌─────────────────────────────────┐ │
│ │ Voice Interface                 │ │
│ │ - Speech Recognition            │ │
│ │ - Speech Synthesis              │ │
│ │ - Calls Next.js APIs            │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ noVNC Browser View              │ │
│ │ - Shows live browser            │ │
│ │ - Visual feedback               │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Replace Docker Container
- Stop current container
- Create new Dockerfile with `@playwright/mcp`
- Configure MCP server to expose browser tools
- Keep VNC + noVNC for visual browser

### Step 2: Install OpenAI Agent SDK
```bash
npm install @openai/agents
```

### Step 3: Create MCP Client API Routes
```typescript
// /api/voice-agent/route.ts
import { Agent, run } from '@openai/agents';
import { MCPServerStdio } from '@openai/agents';

const playwrightMCP = new MCPServerStdio({
  command: 'docker',
  args: ['exec', 'hubspot-mcp-container', 'npx', '@playwright/mcp']
});

const hubspotAgent = new Agent({
  name: 'HubSpot Assistant',
  instructions: `You are a HubSpot pre-sales technical expert...`,
  mcpServers: [playwrightMCP]
});
```

### Step 4: Update Voice Interface
- Remove custom OpenAI calls
- Call Next.js API routes instead
- Keep speech recognition/synthesis

## Benefits of Official MCP

✅ **Professional browser automation** - Battle-tested by Microsoft
✅ **All primitives included** - Click, type, find, wait, highlight, etc.
✅ **Visual feedback built-in** - Element highlighting during interactions  
✅ **Error handling** - Robust retry logic and error messages
✅ **Standardized protocol** - MCP is the standard for tool communication
✅ **OpenAI Agent SDK integration** - Designed to work together
✅ **Coordinate-based clicking** - Can click anywhere on screen
✅ **File uploads** - Handle file upload scenarios
✅ **Tab management** - Handle multiple tabs
✅ **Dialog handling** - Handle popups and confirmations

## Expected Workflow

1. **User speaks**: "Add a contact named John Doe with email john@example.com"

2. **Voice Interface**: 
   - Speech → Text
   - POST to `/api/voice-agent`

3. **OpenAI Agent SDK**:
   - Understands intent: "Add contact"
   - Plans browser actions:
     ```
     browser_navigate("https://app.hubspot.com/contacts")
     browser_click("Add contact button")
     browser_type("John", "First name field")
     browser_type("Doe", "Last name field") 
     browser_type("john@example.com", "Email field")
     browser_click("Save button")
     ```

4. **MCP Server**:
   - Executes each browser action
   - Highlights elements visually
   - Returns success/failure

5. **Voice Interface**:
   - Text → Speech: "I've successfully added John Doe to your contacts!"

## File Structure After Implementation
```
demo-UI/hubspot-playwright-mcp/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── voice-agent/
│   │   │   │   └── route.ts          # MCP Client + Agent
│   │   │   └── chat/
│   │   │       └── route.ts          # Text chat endpoint
│   │   ├── page.tsx                  # Main UI
│   │   └── layout.tsx
│   └── components/
│       ├── VoiceAgent.tsx            # Updated voice interface
│       ├── PlaywrightController.tsx  # Shows browser status
│       └── DebugPanel.tsx
├── package.json                      # Add @openai/agents
└── docker/
    ├── Dockerfile.mcp               # Official MCP setup
    └── run-mcp-server.sh           # Startup script
```

This gives us professional-grade HubSpot automation with proper visual feedback and robust error handling!