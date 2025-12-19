# Eleven Labs Quick Start Guide

## Get Started in 3 Steps

### Step 1: Create One Agent

1. Go to [Eleven Labs Dashboard](https://elevenlabs.io/app/agents)
2. Click "Create Agent"
3. Give it a name (e.g., "WebTailor Voice Agent")
4. Set a basic system prompt (e.g., "You are a helpful AI assistant for software demos")
5. Copy the **Agent ID** from the agent settings page

### Step 2: Add to Environment

Add to your `.env` file:

```env
ELEVEN_API_KEY=your_api_key_here
NEXT_PUBLIC_ELEVEN_AGENT_ID=your_agent_id_here
```

### Step 3: Done!

The system will now use this single agent for all websites. No database setup needed!

## How It Works

- **Single Agent**: One agent ID from environment variable
- **All Websites**: Same agent used for hubspot, salesforce, etc.
- **Tools**: Passed automatically at runtime (no configuration needed)
- **Prompts**: Can be customized per website later if needed

## Later: Per-Website Agents (Optional)

If you want different agents per website later:

1. Create additional agents in Eleven Labs dashboard
2. Store them using: `pnpm store:eleven-labs-agent --website <slug> --agent-id <id>`
3. Uncomment the database lookup code in `ElevenLabsVoiceAgent.tsx`

For now, the single agent approach is simpler and works great!

