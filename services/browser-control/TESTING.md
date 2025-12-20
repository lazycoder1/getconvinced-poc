# Local Testing Guide

## Quick Start

### 1. Set up environment variables

Create a `.env` file in `services/browser-control/`:

```bash
cd services/browser-control
cp .env.example .env  # If you have one, or create manually
```

Required variables:
```bash
BROWSERBASE_API_KEY=your-api-key
BROWSERBASE_PROJECT_ID=your-project-id
USE_BROWSERBASE=true
BROWSERBASE_REGION=ap-southeast-1  # Optional
NODE_ENV=development  # For pretty logs
```

### 2. Install dependencies and Playwright

```bash
npm install
npx playwright install chromium
```

### 3. Start the service

```bash
npm run dev
```

The service will start on `http://localhost:3001`

## Manual Testing

### Health Check
```bash
curl http://localhost:3001/health | jq
```

### Create a Session
```bash
curl -X POST http://localhost:3001/session \
  -H "Content-Type: application/json" \
  -d '{
    "tabId": "test-123",
    "headless": false
  }' | jq
```

### Get Session Info
```bash
curl "http://localhost:3001/session?tabId=test-123" | jq
```

### Navigate
```bash
curl -X POST http://localhost:3001/action \
  -H "Content-Type: application/json" \
  -d '{
    "tabId": "test-123",
    "type": "navigate",
    "url": "https://example.com"
  }' | jq
```

### Get Page State
```bash
# Lite state (quick)
curl "http://localhost:3001/state?tabId=test-123&lite=true" | jq

# Compact state (AI-optimized)
curl "http://localhost:3001/state?tabId=test-123&compact=true" | jq

# Full state
curl "http://localhost:3001/state?tabId=test-123" | jq
```

### Click an Element
```bash
curl -X POST http://localhost:3001/action \
  -H "Content-Type: application/json" \
  -d '{
    "tabId": "test-123",
    "type": "click_element",
    "selector": "a[href]"
  }' | jq
```

### Get Live URL (Browserbase)
```bash
curl "http://localhost:3001/live-url?tabId=test-123" | jq
```

### Close Session
```bash
curl -X DELETE "http://localhost:3001/session?tabId=test-123"
```

## Automated Test Script

Run the test script:

```bash
./test-local.sh
```

Or manually:
```bash
bash test-local.sh
```

## Testing with Vercel Proxy

Once the Railway service is running locally, update your Vercel `.env.local`:

```bash
RAILWAY_BROWSER_SERVICE_URL=http://localhost:3001
```

Then start your Vercel dev server:

```bash
cd ../..  # Back to hubspot-playwright-mcp root
npm run dev
```

Now your Vercel API routes (`/api/browser/*`) will proxy to the local Railway service.

## Testing Checklist

- [ ] Service starts without errors
- [ ] Health endpoint returns active sessions
- [ ] Can create a session
- [ ] Can navigate to a URL
- [ ] Can get page state (lite, compact, full)
- [ ] Can execute actions (click, type, scroll)
- [ ] Can get live URL (if using Browserbase)
- [ ] Can close session
- [ ] Vercel proxy works (if testing integration)

## Troubleshooting

### Service won't start
- Check environment variables are set
- Ensure Playwright Chromium is installed: `npx playwright install chromium`
- Check port 3001 is not in use

### Browserbase connection fails
- Verify `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` are correct
- Check `USE_BROWSERBASE=true` is set
- Verify Browserbase project is active

### Actions fail
- Ensure session exists (check `/health` endpoint)
- Verify `tabId` matches the created session
- Check browser console logs for errors

