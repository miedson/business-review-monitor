"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiBaseUrl } from "./api-client";
import { getStoredSession } from "./auth-session";

export function useBrhRealtime(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    let stopped = false; let controller: AbortController | undefined; let retry = 1000;
    const connect = async () => { const token = getStoredSession()?.accessToken; if (!token || stopped) return; controller = new AbortController(); try { const response = await fetch(`${getApiBaseUrl()}/realtime`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }); if (!response.ok || !response.body) throw new Error("realtime connection failed"); retry = 1000; const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; while (!stopped) { const chunk = await reader.read(); if (chunk.done) break; buffer += decoder.decode(chunk.value, { stream: true }); const blocks = buffer.split("\n\n"); buffer = blocks.pop() ?? ""; for (const block of blocks) { const type = block.match(/^event: (.+)$/m)?.[1]; if (type) { queryClient.invalidateQueries({ queryKey: ["reviews"] }); queryClient.invalidateQueries({ queryKey: ["instagram-comments"] }); queryClient.invalidateQueries({ queryKey: ["attention-summary"] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); } } } } catch { if (!stopped) { queryClient.invalidateQueries(); window.setTimeout(() => void connect(), retry); retry = Math.min(retry * 2, 30000); } } };
    void connect(); return () => { stopped = true; controller?.abort(); };
  }, [queryClient]);
}
