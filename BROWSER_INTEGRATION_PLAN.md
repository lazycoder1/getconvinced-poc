# Browser Integration Plan

## Overview

This document outlines the plan to integrate modular browser automation capabilities from `gc-testing-chromium` into `hubspot-playwright-mcp`, enabling a hybrid demo experience that combines:

1. **Static Screenshots/GIFs** - Pre-recorded visual content for quick, reliable demos
2. **Live Browser Demos** - Real-time browser control for interactive demonstrations
3. **Seamless Switching** - Ability to switch between modes based on context

---

## Architecture Analysis

### Current gc-testing-chromium Structure

```
src/
├── browser/
│   ├── controller.ts    # BrowserController class - core automation
│   ├── session.ts       # SessionManager - session lifecycle
│   └── dom-extractor.ts # DOM extraction utilities
├── server/
│   ├── index.ts         # Server setup (Fastify + WebSocket)
│   ├── rest.ts          # REST API endpoints
│   ├── websocket.ts     # WebSocket handlers
│   └── agent-routes.ts  # Agent-specific routes
├── logging/
│   └── logger.ts        # Session logging
└── types/
    └── index.ts         # Zod schemas and TypeScript types
```

### Key Features to Port

| Feature | Description | Priority |
|---------|-------------|----------|
| BrowserController | Core browser automation (navigation, clicks, typing) | **High** |
| DOM Extraction | State extraction for AI understanding | **High** |
| Session Management | Session lifecycle management | **High** |
| Screenshot Capture | On-demand screenshots | **Medium** |
| Visual Overlays | Caption overlays on browser | **Medium** |
| Browserbase Support | Cloud browser integration | **Low** |

---

## Proposed Architecture for hubspot-playwright-mcp

### New Directory Structure

```
src/
├── lib/
│   └── browser/                    # NEW: Browser automation module
│       ├── index.ts                # Main exports
│       ├── controller.ts           # BrowserController (ported)
│       ├── session.ts              # SessionManager (ported)
│       ├── dom-extractor.ts        # DOM extraction (ported)
│       ├── types.ts                # Browser-specific types
│       └── logger.ts               # Browser logging
├── app/
│   └── api/
│       └── browser/                # NEW: Browser API endpoints
│           ├── session/
│           │   └── route.ts        # Session CRUD
│           ├── action/
│           │   └── route.ts        # Execute actions
│           ├── state/
│           │   └── route.ts        # Get page state
│           └── screenshot/
│               └── route.ts        # Capture screenshots
└── components/
    ├── PlaywrightController.tsx    # EXISTING: Update to support modes
    └── LiveBrowserViewer.tsx       # NEW: Live browser component
```

---

## Implementation Phases

### Phase 1: Core Browser Module (Foundation)
**Estimated Time: 2-3 hours**

Create the modular browser automation library:

1. **Create `src/lib/browser/types.ts`**
   - Port Zod schemas for actions (click, type, navigate, etc.)
   - Port PageState, PageStateLite, PageStateCompact interfaces
   - Port InteractiveElement, CompactElement types
   - Add DemoMode type: 'screenshot' | 'live' | 'hybrid'

2. **Create `src/lib/browser/controller.ts`**
   - Port BrowserController class
   - Add headless/headed mode configuration
   - Add local browser support (primary)
   - Add optional Browserbase support (secondary)
   - Add cookie management
   - Add action methods: navigate, click, type, scroll, hover
   - Add state extraction methods

3. **Create `src/lib/browser/dom-extractor.ts`**
   - Port extractPageState function
   - Port extractPageStateLite function
   - Port extractPageStateCompact function (AI-optimized)
   - Port interactive element extraction

4. **Create `src/lib/browser/session.ts`**
   - Port SessionManager class
   - Add session lifecycle management
   - Add concurrent session support (optional)

5. **Create `src/lib/browser/logger.ts`**
   - Port Logger class
   - Add structured logging for actions
   - Add timing metrics

6. **Create `src/lib/browser/index.ts`**
   - Export all modules cleanly

### Phase 2: API Layer (Server Integration)
**Estimated Time: 2-3 hours**

Create Next.js API routes for browser control:

1. **Create `src/app/api/browser/session/route.ts`**
   ```typescript
   // POST - Create new session
   // GET - Get session info
   // DELETE - Close session
   ```

2. **Create `src/app/api/browser/action/route.ts`**
   ```typescript
   // POST - Execute action (navigate, click, type, scroll, etc.)
   ```

3. **Create `src/app/api/browser/state/route.ts`**
   ```typescript
   // GET - Get current page state
   // GET?compact=true - Get compact state for AI
   // GET?lite=true - Get lite state
   ```

4. **Create `src/app/api/browser/screenshot/route.ts`**
   ```typescript
   // POST - Capture screenshot
   // Supports full page and element screenshots
   ```

### Phase 3: Demo Mode System (Hybrid Experience)
**Estimated Time: 2-3 hours**

Create a unified demo system that supports multiple modes:

1. **Create `src/lib/demo-mode.ts`**
   ```typescript
   type DemoMode = 'screenshot' | 'live' | 'hybrid';
   
   interface DemoConfig {
     mode: DemoMode;
     fallbackToScreenshots: boolean;
     browserConfig?: BrowserControllerOptions;
   }
   
   // Global mode state with event emitter for UI sync
   class DemoModeManager {
     private currentMode: DemoMode = 'screenshot';
     private listeners: Set<(mode: DemoMode) => void> = new Set();
     
     setMode(mode: DemoMode): void;
     getMode(): DemoMode;
     subscribe(listener: (mode: DemoMode) => void): () => void;
   }
   ```

2. **Update `src/lib/dynamic-screenshot-tools.ts`**
   - Add support for live browser actions
   - Add fallback logic to screenshots when browser unavailable
   - Add hybrid tools that try live first, fallback to screenshot

3. **Create `src/lib/browser-tools.ts`**
   - Create OpenAI Realtime tools for live browser control
   - Integration with voice agent

4. **Create Mode Switching Tool for Voice Agent**
   ```typescript
   // Tool: switch_demo_mode
   // Description: Switch between screenshot and live browser demo modes
   // Parameters: { mode: 'screenshot' | 'live' }
   
   tool({
     name: 'switch_demo_mode',
     description: 'Switch between demo modes. Use "screenshot" for static images or "live" for real browser control. Say "switch to live mode" or "show me the real browser".',
     parameters: z.object({
       mode: z.enum(['screenshot', 'live']).describe('The demo mode to switch to'),
     }),
     execute: async ({ mode }) => {
       demoModeManager.setMode(mode);
       return {
         success: true,
         message: `Switched to ${mode} mode`,
         currentMode: mode,
       };
     },
   });
   ```

5. **Voice Commands for Mode Switching**
   The agent will respond to natural language like:
   - "Switch to live demo" → switches to live browser mode
   - "Show me the real browser" → switches to live mode
   - "Go back to screenshots" → switches to screenshot mode
   - "Use static images" → switches to screenshot mode

### Phase 4: UI Components (Visual Interface)
**Estimated Time: 2-3 hours**

1. **Create `src/components/LiveBrowserViewer.tsx`**
   - Real-time browser view component
   - WebSocket connection for live updates
   - Status indicators
   - Caption overlay support

2. **Update `src/components/PlaywrightController.tsx`**
   - Add mode switching (screenshot vs live)
   - Unified interface for both modes
   - Mode indicator in UI

3. **Create `src/components/DemoModeToggle.tsx`**
   ```tsx
   // A toggle button that switches between modes
   // Syncs with voice agent mode changes via DemoModeManager
   
   interface DemoModeToggleProps {
     onModeChange?: (mode: DemoMode) => void;
   }
   
   export default function DemoModeToggle({ onModeChange }: DemoModeToggleProps) {
     const [mode, setMode] = useState<DemoMode>('screenshot');
     
     // Subscribe to mode changes from voice agent
     useEffect(() => {
       return demoModeManager.subscribe((newMode) => {
         setMode(newMode);
         onModeChange?.(newMode);
       });
     }, []);
     
     const toggleMode = () => {
       const newMode = mode === 'screenshot' ? 'live' : 'screenshot';
       demoModeManager.setMode(newMode);
     };
     
     return (
       <button onClick={toggleMode} className="...">
         {mode === 'screenshot' ? (
           <>
             <Image className="w-4 h-4" />
             <span>Screenshots</span>
           </>
         ) : (
           <>
             <Globe className="w-4 h-4" />
             <span>Live Browser</span>
           </>
         )}
         <ArrowLeftRight className="w-3 h-3 ml-2" />
       </button>
     );
   }
   ```

4. **Update `src/app/agent-demo/page.tsx`**
   - Add DemoModeToggle button to header/control bar
   - Listen for mode changes (from button OR voice agent)
   - Conditionally render ScreenshotViewer or LiveBrowserViewer
   - Smooth transitions between modes with loading states
   
   ```tsx
   // Example integration
   <div className="flex items-center gap-4">
     <DemoModeToggle onModeChange={handleModeChange} />
     <span className="text-sm text-gray-500">
       {currentMode === 'live' ? '🟢 Live' : '📷 Screenshots'}
     </span>
   </div>
   
   {/* Conditional rendering */}
   {currentMode === 'screenshot' ? (
     <ScreenshotViewer ... />
   ) : (
     <LiveBrowserViewer ... />
   )}
   ```

5. **Bidirectional Sync**
   - Button click → updates mode → voice agent sees new mode
   - Voice command → updates mode → button reflects change
   - Both use shared DemoModeManager for state

### Phase 5: Integration & Testing
**Estimated Time: 1-2 hours**

1. **Voice Agent Integration**
   - Update voice agent tools to support both modes
   - Add mode-aware tool descriptions
   - Handle browser errors gracefully

2. **Testing**
   - Test screenshot mode (existing)
   - Test live browser mode
   - Test hybrid mode switching
   - Test error handling and fallbacks

---

## Key Files to Create/Modify

### New Files

| File | Description |
|------|-------------|
| `src/lib/browser/index.ts` | Browser module exports |
| `src/lib/browser/controller.ts` | BrowserController class |
| `src/lib/browser/session.ts` | SessionManager class |
| `src/lib/browser/dom-extractor.ts` | DOM extraction utilities |
| `src/lib/browser/types.ts` | TypeScript types and Zod schemas |
| `src/lib/browser/logger.ts` | Browser action logging |
| `src/lib/browser-tools.ts` | OpenAI tools for browser control |
| `src/lib/demo-mode.ts` | Demo mode manager with event system |
| `src/lib/mode-switch-tool.ts` | Voice agent tool for mode switching |
| `src/app/api/browser/session/route.ts` | Session API |
| `src/app/api/browser/action/route.ts` | Action API |
| `src/app/api/browser/state/route.ts` | State API |
| `src/app/api/browser/screenshot/route.ts` | Screenshot API |
| `src/components/LiveBrowserViewer.tsx` | Live browser component |
| `src/components/DemoModeToggle.tsx` | Button to switch modes (syncs with voice) |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/PlaywrightController.tsx` | Add mode support |
| `src/app/agent-demo/page.tsx` | Integrate modes |
| `src/lib/dynamic-screenshot-tools.ts` | Add hybrid support |
| `package.json` | Add new dependencies |

---

## Dependencies to Add

```json
{
  "dependencies": {
    "playwright": "^1.49.1"  // Already exists
  }
}
```

No additional dependencies required - Playwright is already installed.

---

## Environment Variables

Add to `.env.local`:

```env
# Browser Mode Configuration
DEMO_MODE=hybrid                    # 'screenshot' | 'live' | 'hybrid'
BROWSER_HEADLESS=false              # Run browser in headless mode

# Optional: Browserbase (Cloud Browser)
USE_BROWSERBASE=false
BROWSERBASE_API_KEY=
BROWSERBASE_PROJECT_ID=
```

---

## Usage Examples

### Screenshot Mode (Current)
```typescript
// Voice agent uses screenshot tools
"Show me the contacts page"
// → Displays static screenshot
```

### Live Mode (New)
```typescript
// Voice agent controls real browser
"Navigate to the contacts page and filter by unsubscribed"
// → Browser navigates, filters, shows live result
```

### Hybrid Mode (Recommended)
```typescript
// Voice agent tries live, falls back to screenshot
"Show me how to create a new contact"
// → Attempts live demo
// → If browser unavailable, shows screenshot sequence
```

### Mode Switching

**Via Button Click:**
```
User clicks [📷 Screenshots] button
  → Button changes to [🌐 Live Browser]
  → View switches from ScreenshotViewer to LiveBrowserViewer
  → Voice agent receives notification of mode change
```

**Via Voice Command:**
```
User: "Switch to live browser mode"
  → Voice agent calls switch_demo_mode({ mode: 'live' })
  → DemoModeManager updates state
  → Button UI updates to show [🌐 Live Browser]
  → View switches to LiveBrowserViewer
  → Agent confirms: "Switched to live browser mode. I can now control the browser in real-time."

User: "Go back to screenshots"
  → Voice agent calls switch_demo_mode({ mode: 'screenshot' })
  → Everything syncs back to screenshot mode
  → Agent confirms: "Switched back to screenshot mode."
```

**Bidirectional Sync Flow:**
```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│  UI Button      │──────▶│ DemoModeManager  │◀──────│  Voice Agent    │
│  (Toggle)       │       │ (Shared State)   │       │  (Tool Call)    │
└─────────────────┘       └────────┬─────────┘       └─────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
            ┌───────────┐  ┌────────────┐  ┌───────────┐
            │  Button   │  │   Viewer   │  │   Agent   │
            │  Updates  │  │  Switches  │  │  Notified │
            └───────────┘  └────────────┘  └───────────┘
```

---

## Git Branch Strategy

1. Create feature branch: `feature/browser-integration`
2. Implement phases incrementally with commits
3. Test thoroughly on feature branch
4. Create PR to main/master
5. Review and merge

---

## Success Criteria

- [ ] Browser module is fully modular and reusable
- [ ] Screenshot mode continues to work (regression-free)
- [ ] Live browser mode works reliably
- [ ] Hybrid mode seamlessly switches between modes
- [ ] Voice agent can control browser through natural commands
- [ ] DOM extraction provides useful state for AI decision-making
- [ ] Error handling gracefully falls back to screenshots
- [ ] Logging captures all browser actions for debugging

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Browser startup time | Pre-launch browser, keep session alive |
| Network instability | Fallback to screenshot mode |
| Complex pages | Use compact state extraction |
| Resource usage | Add session timeouts, cleanup |
| Security | Sandboxed browser, no credential storage |

---

## Next Steps

1. **Review this plan** - Confirm architecture decisions
2. **Create feature branch** - `git checkout -b feature/browser-integration`
3. **Start Phase 1** - Create browser module
4. **Iterate** - Build, test, refine

Ready to proceed with implementation?

