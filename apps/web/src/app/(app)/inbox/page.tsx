"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageCircle } from "lucide-react";
import { getStoredSession } from "@/lib/auth-session";
import {
  listInboxConversations,
  listInboxConversationMessages,
  markInboxConversationAsRead,
} from "@/lib/api-client";
import { Box, Text, Flex, Badge, LoadingSpinner, PageHeader } from "@/lib/design-system";

type InboxConversation = {
  id: string;
  provider: "instagram";
  participant: {
    externalId: string;
    username: string | null;
    name: string | null;
    profilePictureUrl: string | null;
  };
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

type InboxMessage = {
  id: string;
  provider: "instagram";
  direction: "INBOUND" | "OUTBOUND";
  sender: string;
  recipient: string;
  text: string | null;
  sentAt: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
};

export default function InboxPage() {
  const [session, setSession] = useState<ReturnType<typeof getStoredSession>>(null);
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    setSession(getStoredSession());
  }, []);

  useEffect(() => {
    if (session?.accessToken) {
      loadConversations();
    }
  }, [session]);

  const loadConversations = useCallback(async (cursor?: string) => {
    if (!session?.accessToken) return;

    try {
      setLoadingConversations(true);
      const result = await listInboxConversations({
        accessToken: session.accessToken,
        limit: 50,
        cursor: cursor ?? undefined
      });
      if (cursor) {
        setConversations((prev) => [...prev, ...result.conversations]);
      } else {
        setConversations(result.conversations);
      }
    } catch {
      // ignore
    } finally {
      setLoadingConversations(false);
    }
  }, [session]);

  const loadMessages = useCallback(async (conversationId: string, cursor?: string) => {
    if (!session?.accessToken) return;

    try {
      setLoadingMessages(true);
      const result = await listInboxConversationMessages({
        accessToken: session.accessToken,
        conversationId,
        limit: 50,
        cursor: cursor ?? undefined
      });
      if (cursor) {
        setMessages((prev) => [...prev, ...result.messages]);
      } else {
        setMessages(result.messages);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMessages(false);
    }
  }, [session]);

  const handleSelectConversation = async (conversation: InboxConversation) => {
    setSelectedConversationId(conversation.id);
    setMessages([]);
    await loadMessages(conversation.id);

    if (session?.accessToken) {
      try {
        await markInboxConversationAsRead({
          accessToken: session.accessToken,
          conversationId: conversation.id
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversation.id ? { ...c, unreadCount: 0 } : c
          )
        );
      } catch {
        // ignore
      }
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "agora";
    if (minutes < 60) return `há ${minutes} min`;
    if (hours < 24) return `há ${hours}h`;
    if (days < 7) return `há ${days}d`;
    return date.toLocaleDateString("pt-BR");
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  return (
    <Box css={{ maxW: "1440px", mx: "auto" }}>
      <PageHeader eyebrow="Central de mensagens" title="Inbox" description="Acompanhe conversas do Instagram em uma área preparada para novos canais." />
    <Box css={{ display: "flex", height: { base: "auto", md: "min(640px, calc(100vh - 190px))" }, minHeight: { base: "520px", md: "560px" }, border: "1px solid var(--border)", borderRadius: "xl", overflow: "hidden", bg: "surface.primary", boxShadow: "xs", flexDirection: { base: "column", md: "row" } }}>
      <Box css={{ width: { base: "full", md: "360px" }, height: { base: selectedConversation ? "220px" : "420px", md: "auto" }, borderRight: { base: "0", md: "1px solid var(--border)" }, borderBottom: { base: "1px solid var(--border)", md: "0" }, display: "flex", flexDirection: "column" }}>
        <Box css={{ px: 4, py: 3, borderBottom: "1px solid var(--border)" }}>
          <Text css={{ fontSize: "sm", fontWeight: "semibold", color: "text.primary" }}>
            Conversas
          </Text>
          <Text css={{ fontSize: "xs", color: "text.tertiary", mt: 0.5 }}>
            Instagram Direct
          </Text>
        </Box>
        <Box css={{ flex: 1, overflowY: "auto", scrollbarGutter: "stable" }}>
          {conversations.length === 0 && !loadingConversations && (
            <Box css={{ p: 5 }}><Text css={{ fontSize: "sm", fontWeight: "medium" }}>Nenhuma conversa recebida ainda</Text><Text css={{ mt: 1, fontSize: "xs", color: "text.tertiary", lineHeight: "relaxed" }}>Novas mensagens do Instagram aparecerão aqui.</Text></Box>
          )}
          {conversations.map((conversation) => {
            const isActive = conversation.id === selectedConversationId;
            const displayName = conversation.participant.username ?? conversation.participant.name ?? conversation.participant.externalId;
            const avatarText = displayName.slice(0, 2).toUpperCase();

            return (
              <Box
                key={conversation.id}
                css={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  px: 4,
                  py: 3,
                  cursor: "pointer",
                  borderBottom: "1px solid",
                  borderColor: "surface.border",
                  bg: isActive ? "surface.tertiary" : "transparent",
                  transition: "all 0.15s ease",
                  _hover: { bg: isActive ? "surface.tertiary" : "surface.secondary" }
                }}
                onClick={() => handleSelectConversation(conversation)}
              >
                <Box
                  css={{
                    w: 10,
                    h: 10,
                    borderRadius: "full",
                    bg: "brand.100",
                    color: "brand.700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "xs",
                    fontWeight: "semibold",
                    flexShrink: 0
                  }}
                >
                  {avatarText}
                </Box>
                <Box css={{ flex: 1, minWidth: 0 }}>
                  <Flex css={{ alignItems: "center", gap: 2, mb: 0.5 }}>
                    <Text css={{ fontWeight: "medium", fontSize: "sm", color: "text.primary", truncate: true }}>
                      {displayName}
                    </Text>
                    {conversation.unreadCount > 0 && (
                      <Badge variant="subtle" colorScheme="brand" size="xs">
                        {conversation.unreadCount} novas
                      </Badge>
                    )}
                  </Flex>
                  <Text css={{ fontSize: "xs", color: "text.tertiary", truncate: true }}>
                    {conversation.lastMessagePreview ?? "Sem mensagens"}
                  </Text>
                </Box>
                <Text css={{ fontSize: "xs", color: "text.quaternary", flexShrink: 0, ml: 2 }}>
                  {formatTime(conversation.lastMessageAt)}
                </Text>
              </Box>
            );
          })}
          {loadingConversations && (
            <Box css={{ p: 4, display: "flex", justifyContent: "center" }}>
              <LoadingSpinner size="sm" />
            </Box>
          )}
        </Box>
      </Box>

      <Box css={{ flex: 1, minHeight: { base: "420px", md: "auto" }, display: "flex", flexDirection: "column", bg: "surface.secondary" }}>
        {selectedConversation ? (
          <>
            <Box css={{ px: 4, py: 3, borderBottom: "1px solid", borderColor: "surface.border", bg: "surface.primary" }}>
              <Flex css={{ alignItems: "center", gap: 3 }}>
                <Box
                  css={{
                    w: 8,
                    h: 8,
                    borderRadius: "full",
                    bg: "brand.100",
                    color: "brand.700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "xs",
                    fontWeight: "semibold"
                  }}
                >
                  {(selectedConversation.participant.username ?? selectedConversation.participant.name ?? selectedConversation.participant.externalId).slice(0, 2).toUpperCase()}
                </Box>
                <Box>
                  <Text css={{ fontWeight: "medium", fontSize: "sm", color: "text.primary" }}>
                    {selectedConversation.participant.username ?? selectedConversation.participant.name ?? selectedConversation.participant.externalId}
                  </Text>
                  <Text css={{ fontSize: "xs", color: "text.tertiary" }}>
                    Instagram Direct
                  </Text>
                </Box>
              </Flex>
            </Box>
            <Box css={{ flex: 1, overflowY: "auto", p: 4, display: "flex", flexDirection: "column", gap: 3, scrollbarGutter: "stable" }}>
              {messages.map((message) => {
                const isInbound = message.direction === "INBOUND";
                const time = new Date(message.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

                return (
                  <Box
                    key={message.id}
                    css={{
                      alignSelf: isInbound ? "flex-start" : "flex-end",
                      maxW: "70%",
                      bg: isInbound ? "surface.primary" : "brand.600",
                      color: isInbound ? "text.primary" : "white",
                      px: 4,
                      py: 2,
                      borderRadius: "lg",
                      borderBottomLeftRadius: isInbound ? "sm" : "lg",
                      borderBottomRightRadius: isInbound ? "lg" : "sm",
                    }}
                  >
                    <Text css={{ fontSize: "sm", lineHeight: "normal", whiteSpace: "pre-wrap" }}>
                      {message.text}
                    </Text>
                    <Text css={{ fontSize: "xs", mt: 1, opacity: 0.7, textAlign: "right" }}>
                      {time}
                    </Text>
                  </Box>
                );
              })}
              {loadingMessages && (
                <Box css={{ display: "flex", justifyContent: "center" }}>
                  <LoadingSpinner size="sm" />
                </Box>
              )}
            </Box>
            <Box css={{ px: 4, py: 3, borderTop: "1px solid", borderColor: "surface.border", bg: "surface.primary" }}>
              <Box
                css={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  px: 3,
                  py: 2,
                  borderRadius: "lg",
                  bg: "surface.secondary",
                  border: "1px solid",
                  borderColor: "surface.border",
                }}
              >
                <Text css={{ fontSize: "sm", color: "text.tertiary", flex: 1 }}>
                  Responder em breve
                </Text>
              </Box>
            </Box>
          </>
        ) : (
          <Box css={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 6 }}>
            <Box css={{ textAlign: "center", maxW: "280px" }}><Box css={{ display: "inline-grid", placeItems: "center", w: 9, h: 9, borderRadius: "md", bg: "surface.tertiary", color: "text.quaternary", mb: 3 }}><MessageCircle size={17} strokeWidth={1.6} /></Box><Text css={{ fontSize: "sm", fontWeight: "medium" }}>Nenhuma conversa selecionada</Text><Text css={{ mt: 1, fontSize: "xs", color: "text.tertiary", lineHeight: "relaxed" }}>Selecione uma conversa para ver as mensagens.</Text></Box>
          </Box>
        )}
      </Box>
    </Box></Box>
  );
}
