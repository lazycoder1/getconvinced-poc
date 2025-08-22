# 🎯 HubSpot Voice Agent Setup Guide

## ✅ **What's Already Configured:**

### 📋 **System Prompt** (Ready!)
- **Location**: `/src/app/api/voice-agent/route.ts` lines 28-61
- **Role**: Expert HubSpot pre-sales technical consultant  
- **Capabilities**: Discovery questions, live demos, objection handling
- **Approach**: Consultative sales methodology

### 🤖 **MCP Tools** (Ready!)
- **Location**: `/src/app/api/voice-agent/route.ts` lines 8-24
- **Server**: Official `@playwright/mcp` server
- **Connection**: MCPServerStdio with auto-initialization
- **Tools Available**: All browser automation primitives (navigate, click, type, highlight, etc.)

### 🔧 **Speech Recognition** (Fixed!)
- **Location**: `/src/components/VoiceAgent.tsx` lines 28-31
- **Improvements**: Better error handling, network retry, continuous=false

## 🚀 **Setup Steps:**

### 1. **Set OpenAI API Key**
```bash
cd /Users/gauthamgsabahit/workspace/ai/mvp/webtailor-1/demo-UI/hubspot-playwright-mcp
echo 'OPENAI_API_KEY=sk-your-actual-api-key-here' > .env.local
```

### 2. **Start All Services**
```bash
# Terminal 1: Start Docker browser + MCP
cd /Users/gauthamgsabahit/workspace/ai/mvp/webtailor-1/playwright-docker
./run-working-browser.sh

# Terminal 2: Start React app
cd /Users/gauthamgsabahit/workspace/ai/mvp/webtailor-1/demo-UI/hubspot-playwright-mcp
npm run dev
```

### 3. **Test System**
1. **Browser View**: `http://localhost:8080/vnc.html` (should show desktop)
2. **React App**: `http://localhost:3001` (should show "Connected")
3. **API Test**: 
   ```bash
   curl -X POST http://localhost:3001/api/voice-agent \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello, introduce yourself"}'
   ```

## 🎭 **Voice Agent Features:**

### 🗣️ **Discovery Questions**
- "Tell me about your current sales process"
- "What CRM are you using today?"
- "How many leads do you generate monthly?"

### 🎯 **Demo Commands**
- "Show me the CRM" → Navigates to contacts
- "Demo lead management" → Shows pipeline
- "Create a new contact" → Live browser automation

### 💡 **Value Propositions**
- ROI metrics (30% faster closure, 50% cost reduction)
- Industry-specific examples
- Objection handling with data

## 🔍 **Troubleshooting:**

### ❌ "Speech recognition error: network"
- **Fix**: Browser needs HTTPS or localhost for microphone access
- **Alternative**: Use localhost:3001 (not IP address)

### ❌ "OpenAI API key not configured"
- **Fix**: Add `OPENAI_API_KEY=sk-...` to `.env.local`

### ❌ "Disconnected from Playwright"
- **Fix**: Ensure Docker container is running: `docker ps | grep mcp`

### ❌ "MCP server connection failed"
- **Fix**: Install MCP locally: `npm install @playwright/mcp`

## 🎯 **Testing Voice Commands:**

1. **Start Voice**: Click "Start Voice" button
2. **Say**: "Hello, I'm interested in HubSpot CRM"
3. **Expect**: AI introduces itself and asks discovery questions
4. **Say**: "Show me how contacts work"
5. **Expect**: Browser automation demonstrates contact management

## 🔧 **Architecture:**

```
🎤 Voice Input → 🤖 OpenAI Agent SDK → 🛠️ Playwright MCP → 🖥️ Browser (Docker)
                                                        ↓
📱 React Frontend ← 📺 noVNC (port 8080) ←──────────────┘
```

The system is **ready** - just add your OpenAI API key and test! 🚀