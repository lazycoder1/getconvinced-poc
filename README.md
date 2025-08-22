# HubSpot Playwright MCP - Voice Agent

🎭 **A Next.js voice agent that controls HubSpot through Playwright automation**

Built following the [OpenAI Voice Agents guide](https://platform.openai.com/docs/guides/voice-agents) and integrated with the official Playwright server.

## 🌟 Features

- **🎤 Voice Control**: Natural language commands to control the browser
- **🎭 Playwright Integration**: Direct WebSocket connection to official Playwright server  
- **🖥️ Live Browser View**: Real-time iframe display of browser actions
- **🐛 Debug Console**: Collapsible AI debug panel with real-time logs
- **🎯 HubSpot Focused**: Optimized for HubSpot CRM automation

## 🏗️ Architecture

```
Voice Input → Speech Recognition → Command Parser → Playwright Actions → Browser
     ↓              ↓                    ↓              ↓           ↓
   Debug         Debug              Debug          Debug      Visual
   Panel         Panel              Panel          Panel      Display
```

## 🚀 Quick Start

### 1. Start Playwright Server (Required)

First, ensure the official Playwright server is running:

```bash
cd ../playwright-docker
./run-official.sh
```

This starts the Playwright server at `ws://localhost:3000/`

### 2. Configure Environment

Create `.env.local`:

```env
# OpenAI API Configuration (for future AI integration)
OPENAI_API_KEY=your_openai_api_key_here

# Playwright Server (should match your running server)
NEXT_PUBLIC_PLAYWRIGHT_WS_URL=ws://localhost:3000/
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## 🎤 Voice Commands

### Navigation
- *"Go to HubSpot"* - Navigate to HubSpot login
- *"Go to [website]"* - Navigate to any website
- *"Open [URL]"* - Navigate to specific URL

### Interactions  
- *"Click login"* - Click login button
- *"Click button"* - Click any button
- *"Type [text]"* - Type text into focused input
- *"Search for [term]"* - Enter search term

### System
- *"Help"* - Get list of available commands

## 🖥️ Interface

- **Main Browser Area**: Live view of Playwright-controlled browser
- **AI Debug Panel**: Collapsible right panel showing:
  - Voice recognition transcripts
  - Playwright commands
  - System messages
  - Error logs
- **Voice Control Bar**: Start/stop voice recognition with visual indicators

## 🛠️ Technical Details

### Components

- **`PlaywrightController`**: Manages WebSocket connection to Playwright server
- **`VoiceAgent`**: Handles speech recognition and command parsing  
- **`DebugPanel`**: Real-time logging and debugging interface

### Voice Processing

1. **Speech Recognition**: Browser's Web Speech API
2. **Command Parsing**: Natural language → Playwright actions
3. **Action Execution**: WebSocket commands to Playwright server
4. **Visual Feedback**: Real-time updates in browser iframe

### Playwright Integration

- **Connection**: WebSocket to `ws://localhost:3000/`
- **Commands**: JSON messages for navigation, clicking, typing
- **Status**: Real-time connection monitoring
- **Actions**: Direct DOM manipulation through Playwright

## 🎯 HubSpot Automation Examples

```javascript
// Navigate to HubSpot
"Go to HubSpot"

// Login workflow  
"Click login"
"Type myemail@company.com"
"Click password field"
"Type mypassword"
"Click sign in"

// Search contacts
"Search for John Smith"
"Click first contact"
```

## 🔧 Development

### Project Structure

```
src/
├── app/
│   └── page.tsx              # Main application page
├── components/
│   ├── PlaywrightController.tsx  # Browser automation
│   ├── VoiceAgent.tsx           # Voice recognition  
│   └── DebugPanel.tsx           # Debug console
```

### Adding New Voice Commands

1. Edit `VoiceAgent.tsx` 
2. Add patterns to `parseCommand()` function
3. Map to Playwright actions
4. Test with voice input

### Playwright Server Connection

The app connects to the official Playwright server via WebSocket:

```typescript
const websocket = new WebSocket('ws://localhost:3000/');
websocket.send(JSON.stringify({ 
  action: 'click', 
  selector: '.login-button' 
}));
```

## 🚨 Troubleshooting

### Voice Not Working
- **Check browser permissions**: Allow microphone access
- **Check HTTPS**: Speech recognition requires secure context
- **Try different browser**: Chrome/Edge have best support

### Playwright Connection Failed
- **Verify server running**: `curl http://localhost:3000/`
- **Check ports**: Ensure port 3000 is available
- **Restart server**: `docker stop playwright-server && ./run-official.sh`

### Browser Not Loading
- **Check CORS**: Some sites block iframe embedding
- **Try direct navigation**: Use address bar in component
- **Check network**: Verify internet connection

## 📋 TODO

- [ ] Implement OpenAI GPT integration for smarter command parsing
- [ ] Add element highlighting before clicks
- [ ] Support for complex multi-step workflows
- [ ] Screen recording for debugging
- [ ] Mobile responsiveness
- [ ] Authentication management

## 🔗 Related

- [OpenAI Voice Agents Guide](https://platform.openai.com/docs/guides/voice-agents)
- [Playwright Server Documentation](https://playwright.dev/docs/api/class-playwright)
- [Official Playwright Docker](https://playwright.dev/docs/docker)

---

Built with ❤️ using **Next.js**, **Playwright**, and **Web Speech API**