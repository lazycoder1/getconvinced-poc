# Eleven Labs Setup - Step by Step

## What You Need to Do

### ✅ Tools: NO ACTION NEEDED
Tools are automatically passed at runtime. The agent receives:
- Browser tools (navigation, clicking, typing)
- Screenshot tools (dynamic based on your database)
- Navigation tools (dynamic based on website config)

**You don't need to configure tools in Eleven Labs dashboard.**

### 📝 Prompt: SET IN ELEVEN LABS DASHBOARD

The system prompt needs to be set in your Eleven Labs agent configuration.

## Quick Setup (3 Steps)

### Step 1: Generate Your Prompt

Run this to generate a prompt from your database:

```bash
# For screenshot mode (default)
pnpm generate:eleven-labs-prompt --website hubspot

# For live browser mode
pnpm generate:eleven-labs-prompt --website hubspot --mode live
```

This will:
- Build the full prompt from your database (base prompts + website-specific + routes + screenshots)
- Display it in the terminal
- Save it to a file (`eleven-labs-prompt-hubspot-screenshot.txt`)

### Step 2: Create Agent in Eleven Labs

1. Go to [Eleven Labs Dashboard](https://elevenlabs.io/app/agents)
2. Click "Create Agent" or "New Agent"
3. Give it a name (e.g., "WebTailor Voice Agent")
4. In the "System Prompt" field, paste the prompt from Step 1
5. Configure voice settings (optional, defaults work fine)
6. **Save the agent**
7. **Copy the Agent ID** from the agent settings page

### Step 3: Add Agent ID to Environment

Add to your `.env` file:

```env
ELEVEN_API_KEY=your_api_key_here
NEXT_PUBLIC_ELEVEN_AGENT_ID=your_agent_id_from_step_2
```

## That's It!

Now when you start the voice agent:
- ✅ Tools are passed automatically (no configuration needed)
- ✅ Prompt is set in the agent (from Step 2)
- ✅ Agent ID is used from environment variable

## Updating the Prompt Later

If you update prompts in your database:

1. Regenerate the prompt:
   ```bash
   pnpm generate:eleven-labs-prompt --website hubspot
   ```

2. Go to Eleven Labs Dashboard → Your Agent → Settings
3. Update the System Prompt field
4. Save

## Using a Generic Prompt (Faster Start)

If you want to get started quickly without generating a full prompt:

1. Create agent in Eleven Labs dashboard
2. Use a simple prompt like:
   ```
   You are a helpful AI assistant for software demos. 
   You can help users navigate websites, click buttons, fill forms, and answer questions.
   Use the available tools to interact with the browser.
   ```
3. Copy the Agent ID to `.env`
4. You can refine the prompt later by generating the full one

## Summary

- **Tools**: ✅ Automatic (no action needed)
- **Prompt**: 📝 Set in Eleven Labs dashboard (use generated prompt)
- **Agent ID**: 🔑 Add to `.env` file

The system handles everything else automatically!

