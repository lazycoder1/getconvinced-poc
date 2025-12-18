"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Globe, RefreshCw, AlertCircle, Camera, Play, Square, Loader2 } from "lucide-react";

interface LiveBrowserViewerProps {
  onStatusChange?: (status: "disconnected" | "connecting" | "connected" | "error") => void;
  onDebugMessage?: (type: string, message: string) => void;
  onScreenshotCaptured?: (dataUrl: string) => void;
}

type BrowserStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * LiveBrowserViewer - Real-time browser view component
 * 
 * Features:
 * - Session management (start/stop)
 * - Live screenshot display (polling)
 * - Status indicators
 * - Navigation controls
 */
export default function LiveBrowserViewer({
  onStatusChange,
  onDebugMessage,
  onScreenshotCaptured,
}: LiveBrowserViewerProps) {
  const [status, setStatus] = useState<BrowserStatus>("disconnected");
  const [currentUrl, setCurrentUrl] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const screenshotCountRef = useRef(0);

  const log = useCallback((message: string) => {
    console.log(`[LiveBrowser] ${message}`);
    onDebugMessage?.("browser", message);
  }, [onDebugMessage]);

  const updateStatus = useCallback((newStatus: BrowserStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Check if session exists
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/browser/session');
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // Start browser session
  const startSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    updateStatus("connecting");
    log("🚀 Starting browser session...");

    try {
      const response = await fetch('/api/browser/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headless: false }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start session');
      }

      const session = await response.json();
      log(`✅ Session started: ${session.id}`);
      updateStatus("connected");

      // Start screenshot polling
      startPolling();

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      updateStatus("error");
      log(`❌ Failed to start session: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [log, updateStatus]);

  // Stop browser session
  const stopSession = useCallback(async () => {
    setIsLoading(true);
    log("🛑 Stopping browser session...");

    // Stop polling first
    stopPolling();

    try {
      await fetch('/api/browser/session', { method: 'DELETE' });
      log("✅ Session stopped");
    } catch (err) {
      log(`⚠️ Error stopping session: ${err}`);
    } finally {
      setIsLoading(false);
      setScreenshotUrl(null);
      setCurrentUrl("");
      updateStatus("disconnected");
    }
  }, [log, updateStatus]);

  // Capture screenshot
  const captureScreenshot = useCallback(async () => {
    try {
      const response = await fetch('/api/browser/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'base64' }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Session closed
          updateStatus("disconnected");
          stopPolling();
          return;
        }
        throw new Error('Failed to capture screenshot');
      }

      const data = await response.json();
      const dataUrl = `data:image/png;base64,${data.data}`;
      setScreenshotUrl(dataUrl);
      screenshotCountRef.current++;

      onScreenshotCaptured?.(dataUrl);

      // Get current URL
      const stateResponse = await fetch('/api/browser/state?lite=true');
      if (stateResponse.ok) {
        const stateData = await stateResponse.json();
        if (stateData.state?.url) {
          setCurrentUrl(stateData.state.url);
        }
      }

    } catch (err) {
      // Silent fail for polling - don't spam logs
      if (screenshotCountRef.current === 0) {
        log(`⚠️ Screenshot capture failed: ${err}`);
      }
    }
  }, [log, onScreenshotCaptured, updateStatus]);

  // Start polling for screenshots
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    log("📸 Starting screenshot polling");
    screenshotCountRef.current = 0;

    // Initial capture
    captureScreenshot();

    // Poll every 500ms
    pollingRef.current = setInterval(() => {
      captureScreenshot();
    }, 500);
  }, [captureScreenshot, log]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      log("📸 Stopped screenshot polling");
    }
  }, [log]);

  // Navigate to URL
  const navigate = useCallback(async (url: string) => {
    if (status !== "connected") return;

    setIsLoading(true);
    log(`🧭 Navigating to: ${url}`);

    try {
      const response = await fetch('/api/browser/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'navigate', url }),
      });

      if (!response.ok) {
        throw new Error('Navigation failed');
      }

      setCurrentUrl(url);
      log(`✅ Navigated to: ${url}`);

    } catch (err) {
      log(`❌ Navigation failed: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [status, log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Check for existing session on mount
  useEffect(() => {
    checkSession().then(hasSession => {
      if (hasSession) {
        updateStatus("connected");
        startPolling();
      }
    });
  }, [checkSession, updateStatus, startPolling]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Globe className={`w-4 h-4 ${status === 'connected' ? 'text-green-600' : 'text-gray-400'}`} />
          <span className="text-sm font-medium text-gray-700">Live Browser</span>
          <div className={`w-2 h-2 rounded-full ${
            status === 'connected' ? 'bg-green-500 animate-pulse' :
            status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            status === 'error' ? 'bg-red-500' :
            'bg-gray-400'
          }`} />
        </div>

        <div className="flex items-center gap-2">
          {status === "connected" ? (
            <button
              onClick={stopSession}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
          ) : (
            <button
              onClick={startSession}
              disabled={isLoading || status === "connecting"}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              {isLoading || status === "connecting" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              Start Browser
            </button>
          )}
        </div>
      </div>

      {/* URL Bar (only when connected) */}
      {status === "connected" && (
        <div className="flex items-center px-4 py-2 border-b border-gray-200 bg-white">
          <button
            onClick={() => captureScreenshot()}
            className="p-1.5 mr-2 text-gray-500 hover:bg-gray-100 rounded"
            title="Refresh screenshot"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="flex-1 flex items-center px-3 py-1.5 bg-gray-50 rounded-md border border-gray-200">
            <Globe className="w-3 h-3 mr-2 text-gray-400" />
            <input
              type="text"
              value={currentUrl}
              onChange={(e) => setCurrentUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && navigate(currentUrl)}
              placeholder="Enter URL and press Enter..."
              className="flex-1 text-sm bg-transparent outline-none text-gray-700"
            />
          </div>

          <button
            onClick={() => onScreenshotCaptured?.(screenshotUrl || '')}
            className="ml-2 p-1.5 text-gray-500 hover:bg-gray-100 rounded"
            title="Capture screenshot"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Browser View */}
      <div className="flex-1 relative bg-gray-100">
        {status === "connected" && screenshotUrl ? (
          <img
            src={screenshotUrl}
            alt="Live browser view"
            className="w-full h-full object-contain"
          />
        ) : status === "connecting" ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-600">Starting browser...</p>
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-600 font-medium">Browser Error</p>
            <p className="text-gray-500 text-sm mt-1">{error}</p>
            <button
              onClick={startSession}
              className="mt-4 px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <Globe className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium">Browser Not Running</p>
            <p className="text-gray-500 text-sm mt-1">Click "Start Browser" to begin</p>
          </div>
        )}
      </div>
    </div>
  );
}

