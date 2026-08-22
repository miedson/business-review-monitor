"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiBaseUrl } from "./api-client";
import { getStoredSession } from "./auth-session";

export function useBrhRealtime(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    let stopped = false;
    let controller: AbortController | undefined;
    let retryDelay = 1000;
    let retryTimer: number | undefined;

    const refreshAfterEvent = () => {
      window.dispatchEvent(new Event("brh:realtime"));
      void queryClient.invalidateQueries({ queryKey: ["reviews"] });
      void queryClient.invalidateQueries({ queryKey: ["instagram-comments"] });
      void queryClient.invalidateQueries({ queryKey: ["attention-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    };

    const connect = async (): Promise<void> => {
      const token = getStoredSession()?.accessToken;
      if (!token || stopped) return;

      controller = new AbortController();
      try {
        const response = await fetch(`${getApiBaseUrl()}/realtime`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error("realtime connection failed");

        retryDelay = 1000;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!stopped) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";
          for (const block of blocks) {
            if (block.match(/^event: (.+)$/m)?.[1]) refreshAfterEvent();
          }
        }
        if (!stopped) throw new Error("realtime stream closed");
      } catch {
        if (!stopped) {
          void queryClient.invalidateQueries();
          retryTimer = window.setTimeout(() => void connect(), retryDelay);
          retryDelay = Math.min(retryDelay * 2, 30000);
        }
      }
    };

    void connect();
    return () => {
      stopped = true;
      controller?.abort();
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [queryClient]);
}
