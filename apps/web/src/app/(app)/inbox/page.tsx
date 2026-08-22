"use client";

import {
  Composer,
  ConversationHeader,
  ConversationShell,
  MessageBubble,
} from "@/components/conversation";
import {
  listInboxConversationMessages,
  listInboxConversations,
  listInstagramAccounts,
  markInboxConversationAsRead,
  sendInstagramDirectMessage,
  type InboxMessage,
} from "@/lib/api-client";
import { getStoredSession } from "@/lib/auth-session";
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  EmptyState,
  Flex,
  PageHeader,
  SearchInput,
  Skeleton,
  Text,
} from "@/lib/design-system";
import { MessageCircle, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Conversation = Awaited<ReturnType<typeof listInboxConversations>>["conversations"][number];

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [connectedUsername, setConnectedUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const session = getStoredSession();
    if (!session?.accessToken) return;
    try {
      setLoading(true);
      const [result, accounts] = await Promise.all([
        listInboxConversations({ accessToken: session.accessToken, limit: 100, cursor: undefined }),
        listInstagramAccounts(session.accessToken),
      ]);
      setConversations(result.conversations);
      setConnectedUsername(accounts.accounts[0]?.username ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar as conversas.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const session = getStoredSession();
    if (!session?.accessToken) return;
    try {
      setLoadingMessages(true);
      const result = await listInboxConversationMessages({
        accessToken: session.accessToken,
        conversationId,
        limit: 100,
        cursor: undefined,
      });
      setMessages(result.messages);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const onRealtime = () => {
      void load();
      if (selected) void loadMessages(selected.id);
    };
    window.addEventListener("brh:realtime", onRealtime);
    return () => window.removeEventListener("brh:realtime", onRealtime);
  }, [load, loadMessages, selected]);

  const visible = useMemo(
    () =>
      conversations.filter((item) => {
        const participant =
          item.participant.username ?? item.participant.name ?? item.participant.externalId;
        return `${participant} ${item.lastMessagePreview ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
      }),
    [conversations, query],
  );

  async function openConversation(conversation: Conversation): Promise<void> {
    const session = getStoredSession();
    setSelected(conversation);
    setDraft("");
    setMessages([]);
    await loadMessages(conversation.id);
    if (session?.accessToken)
      await markInboxConversationAsRead({
        accessToken: session.accessToken,
        conversationId: conversation.id,
      });
    setConversations((items) =>
      items.map((item) => (item.id === conversation.id ? { ...item, unreadCount: 0 } : item)),
    );
  }

  async function sendMessage(): Promise<void> {
    const session = getStoredSession();
    if (!session?.accessToken || !selected || !draft.trim() || sending) return;
    try {
      setSending(true);
      await sendInstagramDirectMessage({
        accessToken: session.accessToken,
        conversationId: selected.id,
        message: draft.trim(),
      });
      setDraft("");
      await Promise.all([load(), loadMessages(selected.id)]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  const name = selected ? getParticipantDisplayName(selected) : "";
  return (
    <Box css={{ maxW: "1160px", mx: "auto" }}>
      <PageHeader
        eyebrow="Instagram"
        title="Direct"
        description="Acompanhe as conversas recebidas e responda aos clientes em um só lugar."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <Send size={15} />
            Atualizar
          </Button>
        }
      />
      {error && (
        <Alert tone="error" dismissible onClose={() => setError(null)} mb={5}>
          {error}
        </Alert>
      )}
      <Card variant="default" padding="sm">
        <CardBody css={{ p: 3 }}>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por cliente ou mensagem"
          />
        </CardBody>
      </Card>
      <Box
        css={{
          mt: 5,
          bg: "surface.primary",
          border: "1px solid",
          borderColor: "surface.border",
          borderRadius: "lg",
          overflow: "hidden",
        }}
      >
        {loading && !conversations.length ? (
          Array.from({ length: 5 }, (_, index) => <Skeleton key={index} height="88px" />)
        ) : visible.length ? (
          visible.map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              onOpen={() => void openConversation(conversation)}
            />
          ))
        ) : (
          <EmptyState
            title="Nenhuma conversa encontrada"
            description="As novas mensagens do Instagram aparecerão aqui."
            size="sm"
          />
        )}
      </Box>
      {selected && (
        <ConversationShell
          onBackdropClick={() => setSelected(null)}
          header={
            <ConversationHeader onClose={() => setSelected(null)}>
              <Text css={{ fontWeight: "semibold", fontSize: "lg" }}>Conversa no Instagram</Text>
              <Text css={{ mt: 1, fontSize: "sm", color: "text.tertiary" }}>
                {formatParticipantLabel(name)}
              </Text>
            </ConversationHeader>
          }
          composer={
            <Composer
              value={draft}
              onChange={setDraft}
              onSubmit={() => void sendMessage()}
              disabled={sending}
              loading={sending}
              placeholder="Digite uma mensagem..."
            />
          }
        >
          {loadingMessages ? (
            <Skeleton height="80px" />
          ) : (
            <Box>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  author={
                    message.direction === "OUTBOUND"
                      ? formatBusinessAuthor(connectedUsername)
                      : formatParticipantLabel(name)
                  }
                  timestamp={formatDate(message.sentAt)}
                  {...(message.direction === "OUTBOUND" ? { status: message.status } : {})}
                  align={message.direction === "OUTBOUND" ? "end" : "start"}
                >
                  {message.text ?? "Mensagem sem texto."}
                </MessageBubble>
              ))}
            </Box>
          )}
        </ConversationShell>
      )}
    </Box>
  );
}

function ConversationRow({
  conversation,
  onOpen,
}: {
  conversation: Conversation;
  onOpen: () => void;
}) {
  const name = getParticipantDisplayName(conversation);
  return (
    <Flex
      css={{
        gap: 3,
        p: 4,
        alignItems: "flex-start",
        borderBottom: "1px solid",
        borderColor: "surface.border",
        bg: conversation.unreadCount ? "rgba(245,158,11,.035)" : "surface.primary",
      }}
    >
      <Box
        css={{
          display: "grid",
          placeItems: "center",
          w: 9,
          h: 9,
          borderRadius: "full",
          flexShrink: 0,
          bg: "surface.tertiary",
          color: "text.secondary",
          fontWeight: "medium",
        }}
      >
        {conversation.participant.profilePictureUrl ? (
          <img
            src={conversation.participant.profilePictureUrl}
            alt=""
            width="36"
            height="36"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          name.slice(0, 2).toUpperCase()
        )}
      </Box>
      <Box css={{ flex: 1, minW: 0 }}>
        <Flex css={{ justifyContent: "space-between", gap: 3, flexWrap: "wrap" }}>
          <Box>
            <Text css={{ fontWeight: "medium", fontSize: "sm" }}>
              {formatParticipantLabel(name)}
            </Text>
            <Text css={{ mt: 1, fontSize: "xs", color: "text.tertiary" }}>
              {formatDate(conversation.lastMessageAt)}
              {conversation.unreadCount ? ` · ${conversation.unreadCount} não lida(s)` : ""}
            </Text>
          </Box>
          <Button aria-label="Abrir conversa" variant="ghost" size="sm" onClick={onOpen}>
            <MessageCircle size={16} />
            Abrir
          </Button>
        </Flex>
        <Text css={{ mt: 3, fontSize: "sm", color: "text.secondary", lineHeight: "relaxed" }}>
          {conversation.lastMessagePreview ?? "Mensagem sem conteúdo de texto."}
        </Text>
      </Box>
    </Flex>
  );
}

function getParticipantDisplayName(conversation: Conversation): string {
  const candidate = conversation.participant.username ?? conversation.participant.name;
  return candidate && !/^\d{6,}$/.test(candidate) ? candidate : "Cliente do Instagram";
}

function formatParticipantLabel(name: string): string {
  return name === "Cliente do Instagram" ? name : `@${name}`;
}
function formatBusinessAuthor(username: string | null): string {
  return username ? `BRH @${username}` : "BRH";
}
function formatDate(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : "Sem mensagens";
}
