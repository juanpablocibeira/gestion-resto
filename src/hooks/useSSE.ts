"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseSSEOptions {
  url: string;
  onEvent: (event: string, data: unknown) => void;
  enabled?: boolean;
}

export function useSSE({ url, onEvent, enabled = true }: UseSSEOptions) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!enabled) return;

    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log(`SSE connected: ${url}`);
    };

    eventSource.onerror = () => {
      console.log(`SSE error, reconnecting: ${url}`);
      eventSource.close();
      // Reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    // Listen to all named events
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onEventRef.current(e.type, data);
      } catch {
        // ignore parse errors for keepalive messages
      }
    };

    // Common event types
    const events = [
      "connected",
      "order:new",
      "order:ready",
      "order:delivered",
      "order:in_progress",
      "order:cancelled",
      "item:update",
      "session:open",
      "session:update",
    ];

    events.forEach((event) => {
      eventSource.addEventListener(event, handleMessage);
    });

    return () => {
      eventSource.close();
    };
  }, [url, enabled]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);
}
