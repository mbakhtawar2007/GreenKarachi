import { useEffect, useRef } from 'react';

// Re-runs the latest callback on an interval, but only while the tab is
// visible, and once immediately when the tab becomes visible again.
// This is polling, not a push connection: Vercel's serverless functions
// cannot hold a websocket open, and adding a realtime SDK would be a new
// dependency plus RLS work. The callback itself decides what a "silent"
// refresh means: it must update list data without touching loading
// spinners or form state, so a background refresh never wipes typing.
export function useAutoRefresh(callback: () => void, intervalMs: number): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) callbackRef.current();
    };
    const timer = window.setInterval(tick, intervalMs);
    const onVisibilityChange = () => {
      if (!document.hidden) callbackRef.current();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs]);
}
