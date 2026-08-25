"use client";

import {
  Composer,
  ConversationHeader,
  MessageBubble as ConversationMessageBubble,
  ConversationShell,
} from "@/components/conversation";
import {
  listInstagramAccounts,
  listInstagramComments,
  markInstagramCommentReplied,
  replyToInstagramComment,
  type InstagramComment,
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
import { useEffect, useMemo, useState } from "react";

type CommentThread = {
  id: string;
  messages: InstagramComment[];
  latest: InstagramComment;
  media: InstagramComment["media"];
};

export default function InstagramCommentsPage() {
  const [comments, setComments] = useState<InstagramComment[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "REPLIED">("ALL");
  const [selected, setSelected] = useState<CommentThread | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [connectedUsername, setConnectedUsername] = useState<string | null>(null);
  async function load() {
    const session = getStoredSession();
    if (!session?.accessToken) return;
    try {
      setLoading(true);
      const [result, accounts] = await Promise.all([
        listInstagramComments({ accessToken: session.accessToken, limit: 100 }),
        listInstagramAccounts(session.accessToken),
      ]);
      setConnected(true);
      setComments(result.comments);
      setConnectedUsername(accounts.accounts[0]?.username ?? null);
    } catch (cause) {
      setConnected(false);
      setError(
        cause instanceof Error ? cause.message : "Não foi possível carregar os comentários.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const onRealtime = () => void load();
    window.addEventListener("brh:realtime", onRealtime);
    return () => window.removeEventListener("brh:realtime", onRealtime);
  }, []);
  const threads = useMemo(() => groupThreads(comments), [comments]);
  const pending = threads.filter(
    (thread) => thread.latest.authorType === "CUSTOMER" && !thread.latest.repliedAt,
  ).length;
  const visible = useMemo(
    () =>
      threads.filter((thread) => {
        const haystack = thread.messages
          .map((item) => `${item.author.username ?? ""} ${item.text ?? ""}`)
          .join(" ")
          .toLowerCase();
        return (
          haystack.includes(query.toLowerCase()) &&
          (filter === "ALL" ||
            (filter === "PENDING"
              ? thread.latest.authorType === "CUSTOMER" && !thread.latest.repliedAt
              : thread.latest.authorType === "BUSINESS" || Boolean(thread.latest.repliedAt)))
        );
      }),
    [threads, query, filter],
  );
  async function publish() {
    const session = getStoredSession();
    if (!session?.accessToken || !selected || !message.trim()) return;
    try {
      setSending(true);
      await replyToInstagramComment({
        accessToken: session.accessToken,
        id: selected.latest.id,
        message: message.trim(),
      });
      setSelected(null);
      setMessage("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível responder a este comentário.",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <Box css={{ maxW: "1160px", mx: "auto" }}>
      <PageHeader
        eyebrow="Instagram"
        title="Comentários"
        description="Acompanhe interações recentes e priorize o que precisa da sua atenção."
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
      {!loading && !connected ? (
        <EmptyState
          title="Conecte o Instagram para começar"
          description="Os comentários de uma conta profissional aparecerão organizados aqui."
          action={{
            label: "Conectar Instagram",
            onClick: () => {
              window.location.href = "/settings/integrations";
            },
          }}
          size="md"
        />
      ) : (
        <>
          <Card variant="default" padding="sm">
            <CardBody css={{ p: 3 }}>
              <Flex css={{ gap: 3, flexWrap: "wrap", alignItems: "center" }}>
                <Box css={{ flex: "1 1 240px" }}>
                  <SearchInput
                    value={query}
                    onChange={setQuery}
                    placeholder="Buscar por autor ou comentário"
                  />
                </Box>
                {(["ALL", "PENDING", "REPLIED"] as const).map((item) => (
                  <Button
                    key={item}
                    size="sm"
                    variant={filter === item ? "solid" : "ghost"}
                    onClick={() => setFilter(item)}
                  >
                    {item === "ALL"
                      ? `Todos (${threads.length})`
                      : item === "PENDING"
                        ? `Aguardando resposta (${pending})`
                        : `Respondidos (${threads.length - pending})`}
                  </Button>
                ))}
              </Flex>
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
            {loading && !comments.length ? (
              Array.from({ length: 5 }, (_, index) => <Skeleton key={index} height="104px" />)
            ) : visible.length ? (
              visible.map((thread) => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  onOpen={() => {
                    setSelected(thread);
                    setMessage("");
                  }}
                />
              ))
            ) : (
              <EmptyState
                title="Nenhum comentário encontrado"
                description="Ajuste a busca ou os filtros para visualizar outras interações."
                size="sm"
              />
            )}
          </Box>
        </>
      )}
      {selected && (
        <ConversationDrawer
          thread={selected}
          message={message}
          username={connectedUsername}
          sending={sending}
          onMessage={setMessage}
          onClose={() => setSelected(null)}
          onPublish={() => void publish()}
        />
      )}
    </Box>
  );
}

function groupThreads(comments: InstagramComment[]): CommentThread[] {
  const grouped = new Map<string, InstagramComment[]>();
  for (const comment of comments) {
    const key = comment.mediaId ?? comment.id;
    const list = grouped.get(key) ?? [];
    list.push(comment);
    grouped.set(key, list);
  }
  return [...grouped.entries()]
    .map(([id, messages]) => {
      const ordered = [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      return {
        id,
        messages: ordered,
        latest: ordered[ordered.length - 1]!,
        media: ordered.find((item) => item.media)?.media ?? null,
      };
    })
    .sort(
      (a, b) => new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime(),
    );
}

function ThreadRow({ thread, onOpen }: { thread: CommentThread; onOpen: () => void }) {
  const latest = thread.latest;
  const contact = getContactComment(thread);
  const name = contact.author.username ?? "cliente";
  const sender =
    latest.authorType === "BUSINESS" ? "Sua empresa" : `@${latest.author.username ?? "cliente"}`;
  const date = formatDate(latest.createdAt);
  const pending = latest.authorType === "CUSTOMER" && !contact.repliedAt;
  return (
    <Flex
      css={{
        gap: 3,
        p: 4,
        alignItems: "flex-start",
        borderBottom: "1px solid",
        borderColor: "surface.border",
        bg: pending ? "rgba(245,158,11,.035)" : "surface.primary",
      }}
    >
      <Avatar comment={contact} name={name} />
      <Box css={{ flex: 1, minW: 0 }}>
        <Flex css={{ justifyContent: "space-between", gap: 3, flexWrap: "wrap" }}>
          <Box>
            <Flex css={{ gap: 2, alignItems: "center" }}>
              <Text css={{ fontWeight: "medium", fontSize: "sm" }}>@{name}</Text>
              {pending && (
                <Text css={{ fontSize: "xs", color: "#a05a00", fontWeight: "semibold" }}>
                  Aguardando resposta
                </Text>
              )}
              {!pending && (
                <Text css={{ fontSize: "xs", color: "#197544", fontWeight: "semibold" }}>
                  Respondido
                </Text>
              )}
            </Flex>
            <Text css={{ mt: 1, fontSize: "xs", color: "text.tertiary" }}>
              {date} · {thread.messages.length}{" "}
              {thread.messages.length === 1 ? "mensagem" : "mensagens"}
            </Text>
          </Box>
          <Flex css={{ gap: 2 }}>
            <Button aria-label="Abrir conversa" variant="ghost" size="sm" onClick={onOpen}>
              <MessageCircle size={16} />
              Abrir
            </Button>
            {pending && (
              <Button variant="ghost" size="sm" onClick={() => void markCommentReplied(contact.id)}>
                Marcar respondido
              </Button>
            )}
          </Flex>
        </Flex>
        <Text
          css={{
            mt: 3,
            fontSize: "sm",
            color: "text.secondary",
            lineHeight: "relaxed",
            whiteSpace: "pre-wrap",
          }}
        >
          <Text as="span" css={{ fontWeight: "medium", color: "text.primary" }}>
            {sender}
          </Text>
          {" · "}
          {latest.text ?? "Comentário sem conteúdo de texto."}
        </Text>
        <ContextPreview media={thread.media} />
      </Box>
    </Flex>
  );
}

function ConversationDrawer({
  thread,
  message,
  username,
  sending,
  onMessage,
  onClose,
  onPublish,
}: {
  thread: CommentThread;
  message: string;
  username: string | null;
  sending: boolean;
  onMessage: (value: string) => void;
  onClose: () => void;
  onPublish: () => void;
}) {
  return (
    <ConversationShell
      onBackdropClick={onClose}
      header={
        <ConversationHeader onClose={onClose}>
          <Text css={{ fontWeight: "semibold", fontSize: "lg" }}>Conversa no Instagram</Text>
          <Text css={{ mt: 1, fontSize: "sm", color: "text.tertiary" }}>
            @{getContactComment(thread).author.username ?? "cliente"}
          </Text>
        </ConversationHeader>
      }
      context={<ContextPreview media={thread.media} detailed />}
      composer={
        <Composer value={message} onChange={onMessage} onSubmit={onPublish} loading={sending} />
      }
    >
      <Box css={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {thread.messages.map((comment) => {
          const business = comment.authorType === "BUSINESS";
          const name = comment.author.username ?? (business ? "cliente" : "cliente");
          return (
            <ConversationMessageBubble
              key={comment.id}
              author={business ? formatBusinessAuthor(username) : `@${name}`}
              timestamp={formatDate(comment.createdAt)}
              align={business ? "end" : "start"}
            >
              {comment.text ?? ""}
            </ConversationMessageBubble>
          );
        })}
      </Box>
    </ConversationShell>
  );
}

function getContactComment(thread: CommentThread): InstagramComment {
  return (
    [...thread.messages].reverse().find((comment) => comment.authorType === "CUSTOMER") ??
    thread.messages[0] ??
    thread.latest
  );
}

function ContextPreview({
  media,
  detailed = false,
}: {
  media: InstagramComment["media"];
  detailed?: boolean;
}) {
  if (!media) return null;
  return (
    <Box
      css={{
        mt: 4,
        display: "flex",
        gap: 3,
        alignItems: "center",
        p: 2,
        bg: "surface.secondary",
        borderRadius: "md",
      }}
    >
      {(media.media_url || media.thumbnail_url) && (
        <img
          src={media.media_url || media.thumbnail_url}
          alt="Preview do post"
          width={detailed ? 72 : 56}
          height={detailed ? 72 : 56}
          style={{ objectFit: "cover", borderRadius: 6 }}
        />
      )}
      <Box>
        <Text css={{ fontSize: "xs", fontWeight: "medium" }}>
          Post relacionado · {media.media_product_type ?? media.media_type ?? "Instagram"}
        </Text>
        {media.caption && (
          <Text css={{ fontSize: "xs", color: "text.tertiary" }}>
            {media.caption.slice(0, detailed ? 160 : 90)}
          </Text>
        )}
        {media.permalink && (
          <a href={media.permalink} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
            Ver no Instagram
          </a>
        )}
      </Box>
    </Box>
  );
}
function Avatar({ comment, name }: { comment: InstagramComment; name: string }) {
  return (
    <Box
      css={{
        display: "grid",
        placeItems: "center",
        w: 9,
        h: 9,
        borderRadius: "full",
        flexShrink: 0,
        overflow: "hidden",
        bg: "surface.tertiary",
        color: "text.secondary",
        fontWeight: "medium",
      }}
    >
      {comment.author.profilePictureUrl ? (
        <img src={comment.author.profilePictureUrl} alt="" width="36" height="36" />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </Box>
  );
}
function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function formatBusinessAuthor(username: string | null): string {
  return username ? `BRH @${username}` : "BRH";
}

async function markCommentReplied(id: string): Promise<void> {
  const session = getStoredSession();
  if (!session?.accessToken) return;
  await markInstagramCommentReplied({ accessToken: session.accessToken, id });
  window.dispatchEvent(new Event("brh:realtime"));
}
