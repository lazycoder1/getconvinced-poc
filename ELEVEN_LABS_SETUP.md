# Eleven Labs Integration Setup Guide

## Overview

This project integrates Eleven Labs Agents Platform for voice and chat functionality. The integration uses a modular architecture that allows switching between OpenAI and Eleven Labs providers.

## Initial Setup (Single Agent - Recommended for Start)

### 1. Create ONE Agent in Eleven Labs Dashboard

For now, we'll use a single agent for all websites. You can add per-website agents later.

1. Go to [Eleven Labs Dashboard](https://elevenlabs.io/app/agents)
2. Create **one agent** that will be used for all websites
3. Configure the agent:
   - Set a general system prompt (e.g., "You are a helpful AI assistant for software demos")
   - Configure voice settings
   - Note: Tools are passed at runtime, so you don't need to configure them here
4. Copy the Agent ID from the dashboard

### 2. Set Environment Variable

Simply add the agent ID to your `.env` file:

```env
NEXT_PUBLIC_ELEVEN_AGENT_ID=your_agent_id_here
```

That's it! The system will use this single agent for all websites.

### 3. (Optional) Per-Website Agents (Future)

If you want different agents per website later, you can:

**Option A: Using the script**
```bash
pnpm store:eleven-labs-agent --website hubspot --agent-id your_agent_id_here
```

**Option B: Using the API**
```bash
curl -X POST http://localhost:3001/api/eleven-labs/agents/hubspot \
  -H "Content-Type: application/json" \
  -d '{"agentId": "your_agent_id_here"}'
```

The system will prioritize database-stored agent IDs over the environment variable.

### 4. Environment Variables

Set in your `.env` file:

```env
# Required: Eleven Labs API Key
ELEVEN_API_KEY=your_api_key_here

# Required: Agent ID (single agent for all websites)
NEXT_PUBLIC_ELEVEN_AGENT_ID=your_agent_id_here

# Optional: Provider selection (default: "elevenlabs")
NEXT_PUBLIC_VOICE_AGENT_PROVIDER=elevenlabs
```

## Architecture

### Provider Selection

The system automatically selects the provider based on:
1. `NEXT_PUBLIC_VOICE_AGENT_PROVIDER` environment variable
2. Falls back to "elevenlabs" if not set

### Agent ID Resolution

**Current (Single Agent Mode):**
- Uses `NEXT_PUBLIC_ELEVEN_AGENT_ID` from environment variable
- Single agent for all websites (simplest setup)

**Future (Per-Website Mode):**
When per-website agents are enabled:
1. Looks up agent ID from database (by website slug)
2. Falls back to `NEXT_PUBLIC_ELEVEN_AGENT_ID` if not in database
3. Uses that agent ID with Eleven Labs `useConversation` hook

To enable per-website agents, uncomment the database lookup code in `ElevenLabsVoiceAgent.tsx`

### Tools

Tools are passed at runtime via `clientTools` in the React component:
- Browser tools (navigation, clicking, typing)
- Screenshot tools (dynamic, based on database)
- Navigation tools (dynamic, based on website config)

Tools are NOT synced to Eleven Labs - they're passed per-session.

## Updating Prompts

### Manual Update (Recommended)

Since the REST API for updating agents may not be fully available:

1. Update the prompt in your database (via dashboard)
2. Copy the prompt text
3. Go to Eleven Labs Dashboard → Your Agent → Settings
4. Update the system prompt manually
5. The agent will use the new prompt on next conversation

### Programmatic Update (If API Available)

The sync script attempts to update prompts via API:

```bash
pnpm sync:eleven-labs
```

If the API doesn't support updates, you'll see a warning and need to update manually.

## API Endpoints

### Get Agent ID
```bash
GET /api/eleven-labs/agents/[website-slug]
```

### Store Agent ID
```bash
POST /api/eleven-labs/agents/[website-slug]
Body: { "agentId": "your_agent_id" }
```

### Update Agent Prompt (if API supports)
```bash
PUT /api/eleven-labs/agents/[website-slug]
Body: { "mode": "screenshot" }
```

## Troubleshooting

### "No agent ID found" Error

This means the agent ID isn't stored in the database. Solutions:
1. Store it using the script: `pnpm store:eleven-labs-agent --website <slug> --agent-id <id>`
2. Or set `NEXT_PUBLIC_ELEVEN_AGENT_ID` as a fallback

### "Agent not found" Error

The agent ID in the database doesn't exist in Eleven Labs. Solutions:
1. Verify the agent exists in Eleven Labs dashboard
2. Update the agent ID in the database
3. Or create a new agent and store the new ID

### Tools Not Working

Tools are passed at runtime. Make sure:
1. `useDynamicConfig={true}` is set on the VoiceAgent component
2. Screenshots and browser config are properly loaded
3. Check browser console for tool call errors

## Migration from OpenAI

The system supports both providers. To switch:

1. Set `NEXT_PUBLIC_VOICE_AGENT_PROVIDER=openai` to use OpenAI
2. Set `NEXT_PUBLIC_VOICE_AGENT_PROVIDER=elevenlabs` to use Eleven Labs
3. Or remove the env var to default to Eleven Labs

All existing code works with both providers - no changes needed!

