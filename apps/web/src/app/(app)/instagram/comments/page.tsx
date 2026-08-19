"use client";

import { useEffect, useState } from "react";
import { getStoredSession } from "@/lib/auth-session";
import { listInstagramAccounts, listInstagramComments } from "@/lib/api-client";
import {
  Box,
  Text,
  Alert,
  EmptyState,
  LoadingSpinner,
  Badge,
  Button
} from "@/lib/design-system";

type InstagramComment = {
  id: string;
  provider: "instagram";
  commentId: string;
  mediaId: string | null;
  author: {
    id: string | null;
    username: string | null;
  };
  text: string | null;
  createdAt: string;
  status: "NEW" | "READ";
};

export default function InstagramCommentsPage() {
  const [session, setSession] = useState<ReturnType<typeof getStoredSession>>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [comments, setComments] = useState<InstagramComment[]>([]);
  const [instagramAccount, setInstagramAccount] = useState<{ username?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setSession(getStoredSession());
  }, []);

  useEffect(() => {
    if (session?.accessToken) {
      loadInstagramAccount();
      loadComments();
    }
  }, [session]);

  const loadInstagramAccount = async () => {
    if (!session?.accessToken) return;

    try {
      setLoadingAccount(true);
      const result = await listInstagramAccounts(session.accessToken);
      const firstAccount = result.accounts[0];
      if (firstAccount) {
        setInstagramAccount({ username: firstAccount.username });
      }
    } catch {
      setInstagramAccount(null);
    } finally {
      setLoadingAccount(false);
    }
  };

  const loadComments = async (cursor?: string) => {
    if (!session?.accessToken) return;

    try {
      setLoading(true);
      const input: { accessToken: string; cursor?: string; limit: number } = {
        accessToken: session.accessToken,
        limit: 20
      };
      if (cursor) input.cursor = cursor;

      const result = await listInstagramComments(input);

      const mappedComments = result.comments.map((comment) => ({
        id: comment.id,
        provider: "instagram" as const,
        commentId: comment.commentId,
        mediaId: comment.mediaId ?? null,
        author: {
          id: comment.author.id ?? null,
          username: comment.author.username ?? null
        },
        text: comment.text ?? null,
        createdAt: comment.createdAt,
        status: comment.status
      }));

      if (cursor) {
        setComments((prev) => [...prev, ...mappedComments]);
      } else {
        setComments(mappedComments);
      }

      setNextCursor(result.nextCursor ?? null);
      setHasMore(!!result.nextCursor);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao carregar comentários"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (nextCursor && !loading && hasMore) {
      loadComments(nextCursor);
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return "agora mesmo";
    if (diffMinutes < 60) return `há ${diffMinutes} minuto${diffMinutes > 1 ? "s" : ""}`;
    if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
    return `há ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
  };

  if (!session?.accessToken) {
    return (
      <Box css={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", p: 6 }}>
        <EmptyState
          title="Faça login para ver comentários"
          description="Conecte-se à sua conta para acessar os comentários do Instagram."
          action={{ label: "Fazer login", onClick: () => window.location.href = "/login" }}
        />
      </Box>
    );
  }

  return (
    <Box css={{ p: 6, maxWidth: "900px", margin: "0 auto" }}>
      <Box css={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 6, flexWrap: "wrap", gap: 3 }}>
        <Text fontSize="2xl" fontWeight="bold" color="text.primary">
          Comentários do Instagram
        </Text>
        {instagramAccount?.username && (
          <Badge variant="subtle" colorScheme="pink" size="sm">
            @{instagramAccount.username}
          </Badge>
        )}
      </Box>

      {message && (
        <Alert tone={message.type === "success" ? "success" : "error"} onClose={() => setMessage(null)} dismissible mb={4}>
          {message.text}
        </Alert>
      )}

      {loadingAccount && (
        <Box css={{ display: "flex", justifyContent: "center", py: 8 }}>
          <LoadingSpinner size="lg" />
        </Box>
      )}

      {!loadingAccount && !instagramAccount && (
        <EmptyState
          title="Nenhuma conta Instagram conectada"
          description="Conecte sua conta profissional do Instagram para começar a receber comentários."
          action={{ label: "Conectar Instagram", onClick: () => window.location.href = "/settings/integrations" }}
          size="lg"
        />
      )}

      {instagramAccount && (
        <>
          {loading && comments.length === 0 && (
            <Box css={{ display: "flex", justifyContent: "center", py: 8 }}>
              <LoadingSpinner size="lg" />
            </Box>
          )}

          {comments.length === 0 && !loading && (
            <EmptyState
              title="Nenhum comentário recebido ainda"
              description="Novos comentários do Instagram aparecerão aqui automaticamente quando alguém comentar nos seus posts."
              size="lg"
            />
          )}

          {comments.length > 0 && (
            <Box css={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {comments.map((comment) => (
                <Box
                  key={comment.id}
                  css={{
                    display: "flex",
                    gap: 4,
                    p: 4,
                    borderRadius: "lg",
                    bg: "surface.primary",
                    border: "1px solid",
                    borderColor: "surface.border",
                    transition: "all 0.2s ease"
                  }}
                >
                  <Box css={{ display: "flex", alignItems: "center", justifyContent: "center", w: 10, h: 10, borderRadius: "full", flexShrink: 0, bg: "pink.50", color: "pink.600" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </Box>
                  <Box css={{ flex: 1, minWidth: 0 }}>
                    <Box css={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
                      <Text fontSize="sm" fontWeight="semibold" color="text.primary">
                        @{comment.author.username ?? "Usuário desconhecido"}
                      </Text>
                      {comment.author.id && (
                        <Text fontSize="xs" color="text.tertiary" fontFamily="mono">
                          {comment.author.id}
                        </Text>
                      )}
                      <Badge variant="subtle" colorScheme={comment.status === "NEW" ? "green" : "gray"} size="xs">
                        {comment.status === "NEW" ? "Novo" : "Lido"}
                      </Badge>
                      <Badge variant="subtle" colorScheme="pink" size="xs">
                        Instagram
                      </Badge>
                    </Box>
                    {comment.text && (
                      <Text css={{ fontSize: "md", color: "text.secondary", lineHeight: "normal", margin: 0, whiteSpace: "pre-wrap" }}>
                        {comment.text}
                      </Text>
                    )}
                    {!comment.text && (
                      <Text css={{ fontSize: "md", color: "text.quaternary", lineHeight: "normal", margin: 0, fontStyle: "italic" }}>
                        (sem texto)
                      </Text>
                    )}
                    <Box css={{ display: "flex", alignItems: "center", gap: 3, mt: 3, flexWrap: "wrap" }}>
                      {comment.mediaId && (
                        <Text fontSize="xs" color="text.quaternary" fontFamily="mono">
                          Mídia: {comment.mediaId}
                        </Text>
                      )}
                      <Text fontSize="xs" color="text.quaternary">
                        {formatRelativeTime(comment.createdAt)}
                      </Text>
                    </Box>
                  </Box>
                </Box>
              ))}

              {hasMore && (
                <Box css={{ display: "flex", justifyContent: "center", mt: 4 }}>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleLoadMore}
                    loading={loading}
                    disabled={loading || !hasMore}
                  >
                    Carregar mais
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}