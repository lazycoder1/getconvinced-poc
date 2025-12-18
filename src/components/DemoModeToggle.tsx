"use client";

import { useEffect, useState } from "react";
import { Image, Globe, ArrowLeftRight, Loader2 } from "lucide-react";
import { getDemoModeManager, type DemoMode } from "@/lib/demo-mode";

interface DemoModeToggleProps {
  onModeChange?: (mode: DemoMode) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * DemoModeToggle - Button to switch between screenshot and live browser modes
 * 
 * Features:
 * - Bidirectional sync with voice agent (via DemoModeManager)
 * - Visual indicator of current mode
 * - Loading state during transition
 */
export default function DemoModeToggle({ 
  onModeChange, 
  disabled = false,
  className = "" 
}: DemoModeToggleProps) {
  const [mode, setMode] = useState<DemoMode>('screenshot');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const manager = getDemoModeManager();
    
    // Set initial mode
    setMode(manager.getMode());

    // Subscribe to mode changes (from voice agent or other sources)
    const unsubscribe = manager.subscribe((newMode) => {
      setMode(newMode);
      setIsTransitioning(false);
      onModeChange?.(newMode);
    });

    // Also listen for DOM events (alternative sync method)
    const handleDOMEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode: DemoMode }>;
      setMode(customEvent.detail.mode);
      setIsTransitioning(false);
    };
    window.addEventListener('demo:mode_change', handleDOMEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('demo:mode_change', handleDOMEvent);
    };
  }, [onModeChange]);

  const handleToggle = () => {
    if (disabled || isTransitioning) return;

    setIsTransitioning(true);
    const manager = getDemoModeManager();
    
    // Toggle the mode
    const newMode = manager.toggle();
    
    // Short delay for visual feedback
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  const isLive = mode === 'live';
  const isHybrid = mode === 'hybrid';

  return (
    <button
      onClick={handleToggle}
      disabled={disabled || isTransitioning}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
        transition-all duration-200 ease-in-out
        border
        ${isLive 
          ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100' 
          : isHybrid
          ? 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'
          : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isTransitioning ? 'opacity-75' : ''}
        ${className}
      `}
      title={`Currently in ${mode} mode. Click to switch.`}
    >
      {isTransitioning ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isLive ? (
        <Globe className="w-4 h-4" />
      ) : (
        <Image className="w-4 h-4" />
      )}
      
      <span>
        {isTransitioning 
          ? 'Switching...' 
          : isLive 
          ? 'Live Browser' 
          : isHybrid
          ? 'Hybrid Mode'
          : 'Screenshots'
        }
      </span>
      
      <ArrowLeftRight className="w-3 h-3 opacity-60" />
    </button>
  );
}

/**
 * DemoModeIndicator - Read-only indicator of current mode
 */
export function DemoModeIndicator({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<DemoMode>('screenshot');

  useEffect(() => {
    const manager = getDemoModeManager();
    setMode(manager.getMode());

    const unsubscribe = manager.subscribe((newMode) => {
      setMode(newMode);
    });

    return unsubscribe;
  }, []);

  const isLive = mode === 'live';

  return (
    <div className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
      <span className="text-gray-600">
        {isLive ? 'Live' : 'Screenshots'}
      </span>
    </div>
  );
}

