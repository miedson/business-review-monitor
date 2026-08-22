"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Send } from "lucide-react";
import { Box, Button, Flex, Text } from "@/lib/design-system";

export function ConversationShell({ header, context, children, composer, onBackdropClick }: { header: ReactNode; context?: ReactNode; children: ReactNode; composer: ReactNode; onBackdropClick?: () => void }) {
  return <Box css={{ position: "fixed", inset: 0, bg: "rgba(15,23,42,.35)", zIndex: "modal" }} onClick={onBackdropClick}><Box css={{ position: "absolute", right: 0, top: 0, bottom: 0, w: { base: "100%", md: "520px" }, bg: "surface.primary", boxShadow: "xl", display: "flex", flexDirection: "column", minH: 0 }} onClick={(event) => event.stopPropagation()}>{header}{context && <Box css={{ flexShrink: 0, px: 6 }}>{context}</Box>}<Box css={{ flex: 1, minH: 0, overflowY: "auto", px: 6, py: 5 }}>{children}</Box><Box css={{ flexShrink: 0, borderTop: "1px solid", borderColor: "surface.border", bg: "surface.primary", px: 6, py: 4 }}>{composer}</Box></Box></Box>;
}

export function ConversationHeader({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return <Flex css={{ flexShrink: 0, px: 6, py: 5, justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid", borderColor: "surface.border" }}><Box>{children}</Box><Button aria-label="Fechar conversa" variant="ghost" size="sm" onClick={onClose}>×</Button></Flex>;
}

export function MessageBubble({ children, author, timestamp, align = "start" }: { children: ReactNode; author: string; timestamp: string; align?: "start" | "end" }) {
  return <Flex css={{ justifyContent: align === "end" ? "flex-end" : "flex-start", mb: 3 }}><Box css={{ maxW: "86%", p: 3, borderRadius: "lg", bg: align === "end" ? "#143b2a" : "surface.secondary", color: align === "end" ? "#e9f8ef" : "text.secondary" }}><Text css={{ fontSize: "xs", fontWeight: "semibold", opacity: .75, mb: 1 }}>{author}</Text><Text css={{ fontSize: "sm", whiteSpace: "pre-wrap" }}>{children}</Text><Text css={{ mt: 2, fontSize: "10px", opacity: .65 }}>{timestamp}</Text></Box></Flex>;
}

export function Composer({ value, onChange, onSubmit, placeholder = "Digite uma resposta...", disabled = false }: { value: string; onChange: (value: string) => void; onSubmit: () => void; placeholder?: string; disabled?: boolean }) {
  const [emojiOpen, setEmojiOpen] = useState(false); const emojis = ["😀", "😊", "👏", "❤️", "🙏", "🎉", "👍", "✨", "🙂", "💚", "🔥", "🙌"];
  return <Box css={{ position: "relative" }}><Text css={{ mb: 2, fontSize: "sm", fontWeight: "medium" }}>Responder publicamente</Text>{emojiOpen && <Flex css={{ position: "absolute", bottom: "calc(100% - 4px)", left: 0, gap: 1, flexWrap: "wrap", w: "230px", p: 2, bg: "surface.primary", border: "1px solid", borderColor: "surface.border", borderRadius: "lg", boxShadow: "lg" }}>{emojis.map((emoji) => <button key={emoji} type="button" aria-label={`Adicionar ${emoji}`} onClick={() => { onChange(`${value}${emoji}`); setEmojiOpen(false); }} style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 20, padding: 5 }}>{emoji}</button>)}</Flex>}<textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} disabled={disabled} placeholder={placeholder} style={{ width: "100%", padding: 12, paddingRight: 44, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", resize: "none" }} /><Flex css={{ mt: 2, justifyContent: "space-between", alignItems: "center" }}><Button aria-label="Adicionar emoji" variant="ghost" size="sm" onClick={() => setEmojiOpen((open) => !open)}>😀</Button><Button size="sm" disabled={disabled || !value.trim()} onClick={onSubmit}><Send size={15} />Enviar</Button></Flex></Box>;
}
