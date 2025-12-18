/**
 * Voice Agent Tool for Demo Mode Switching
 * 
 * This tool allows the voice agent to switch between demo modes
 * based on natural language commands from users.
 */

import { tool } from '@openai/agents/realtime';
import { z } from 'zod';
import { getDemoModeManager } from './demo-mode';

/**
 * Create the mode switch tool for the voice agent
 */
export function createModeSwitchTool() {
  return tool({
    name: 'switch_demo_mode',
    description: `Switch between demo display modes. Use this when the user asks to:
- "Switch to live mode" or "Show me the real browser" → mode: 'live'
- "Go back to screenshots" or "Use static images" → mode: 'screenshot'
- "Switch to hybrid mode" → mode: 'hybrid'

Live mode shows a real browser you can control. Screenshot mode shows pre-captured images. Hybrid mode tries live first and falls back to screenshots.`,
    parameters: z.object({
      mode: z.enum(['screenshot', 'live', 'hybrid']).describe(
        'The demo mode to switch to: "screenshot" for static images, "live" for real browser control, "hybrid" for automatic fallback'
      ),
    }),
    execute: async ({ mode }) => {
      const manager = getDemoModeManager();
      const previousMode = manager.getMode();
      
      manager.setMode(mode);
      
      const modeDescriptions = {
        screenshot: 'showing pre-captured screenshots',
        live: 'controlling a real browser in real-time',
        hybrid: 'using live browser with screenshot fallback',
      };

      return {
        success: true,
        previousMode,
        currentMode: mode,
        message: `Switched to ${mode} mode. I'm now ${modeDescriptions[mode]}.`,
      };
    },
  });
}

/**
 * Create a tool to get the current demo mode
 */
export function createGetModeTool() {
  return tool({
    name: 'get_demo_mode',
    description: 'Get the current demo display mode (screenshot, live, or hybrid)',
    parameters: z.object({}),
    execute: async () => {
      const manager = getDemoModeManager();
      const mode = manager.getMode();
      const config = manager.getConfig();

      return {
        currentMode: mode,
        fallbackEnabled: config.fallbackToScreenshots,
        description: mode === 'screenshot' 
          ? 'Currently showing pre-captured screenshots'
          : mode === 'live'
          ? 'Currently controlling a real browser'
          : 'Currently in hybrid mode (live with screenshot fallback)',
      };
    },
  });
}

/**
 * Get all mode-related tools for the voice agent
 */
export function getModeSwitchTools() {
  return [
    createModeSwitchTool(),
    createGetModeTool(),
  ];
}

export default getModeSwitchTools;

