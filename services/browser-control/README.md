# Browser Control Service

A Fastify-based browser control service designed to run on Railway with persistent CDP connections to Browserbase.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│ Vercel API   │────▶│ Railway      │
│   (React)    │     │ (stateless)  │     │ (Fastify)    │
└──────────────┘     └──────────────┘     └──────────────┘
                                              │
                                              ▼
                                    ┌──────────────┐
                                    │ Browserbase  │
                                    │ (CDP alive)  │
                                    └──────────────┘
```

## Key Benefits

1. **Persistent Connections**: Railway keeps CDP connection alive - no reconnect overhead
2. **Fast Actions**: Tool calls are instant (no 300ms reconnect delay)
3. **Self-Contained**: Railway service is independent - easy to extract for rewrite
4. **No DB Overhead**: Sessions in-memory only - simpler architecture
5. **Simple Proxy**: Vercel routes just forward requests

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check with active sessions |
| POST | `/session` | Create/get browser session |
| GET | `/session` | Get session info by tabId |
| DELETE | `/session` | Close session by tabId |
| GET | `/session/list` | List all active sessions |
| POST | `/action` | Execute browser action |
| GET | `/state` | Get page state |
| GET | `/live-url` | Get Browserbase live view URL |

## Environment Variables

### Railway (set in Railway dashboard)

```bash
# Required
BROWSERBASE_API_KEY=your-browserbase-api-key
BROWSERBASE_PROJECT_ID=your-browserbase-project-id
USE_BROWSERBASE=true

# Optional
BROWSERBASE_REGION=ap-southeast-1  # Default: ap-southeast-1
PORT=3001                           # Railway auto-provides
NODE_ENV=production
HOST=0.0.0.0
```

### Vercel (add to .env or Vercel dashboard)

```bash
# Required - URL of the Railway service
RAILWAY_BROWSER_SERVICE_URL=https://your-service.railway.app
```

## Local Development

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Start development server
npm run dev

# Or build and run production
npm run build
npm start
```

## Deployment to Railway

1. Create a new Railway project
2. Connect this repository or deploy from GitHub
3. Set the root directory to `services/browser-control`
4. Add environment variables in Railway dashboard
5. Deploy!

Railway will automatically:
- Build using Nixpacks
- Install dependencies
- Install Chromium
- Start the Fastify server

## Session Management

Sessions are stored in-memory on Railway and keyed by `tabId`:

```typescript
// Create session
POST /session
{
  "tabId": "unique-tab-id",
  "cookies": [...],  // Optional: cookies to inject
  "defaultUrl": "https://app.hubspot.com",  // Optional
  "headless": false  // Optional
}

// Execute action
POST /action
{
  "tabId": "unique-tab-id",
  "type": "click_element",
  "selector": "[data-test-id='my-button']"
}

// Get state
GET /state?tabId=unique-tab-id&compact=true
```

## Supported Actions

- `navigate` - Navigate to URL
- `click` / `click_element` - Click at coordinates or selector
- `type` / `type_element` - Type text
- `key` - Press keyboard key
- `scroll` / `scroll_to` - Scroll page or to element
- `back` / `forward` / `refresh` - Navigation
- `get_state` / `get_state_compact` - Get page state
- `screenshot` - Take screenshot
- `hover` / `hover_element` - Hover at coordinates or selector

## Files

```
services/browser-control/
├── src/
│   ├── server.ts           # Fastify server entry point
│   ├── browser/
│   │   ├── controller.ts   # BrowserController class
│   │   ├── session.ts      # SessionManager for multiple tabs
│   │   ├── dom-extractor.ts # Page state extraction
│   │   ├── types.ts        # TypeScript types & Zod schemas
│   │   ├── logger.ts       # Structured logging
│   │   └── index.ts        # Exports
│   └── routes/
│       ├── session.ts      # Session management routes
│       ├── action.ts       # Browser action routes
│       ├── state.ts        # State retrieval routes
│       └── live-url.ts     # Live URL routes
├── package.json
├── tsconfig.json
└── railway.json            # Railway deployment config
```

