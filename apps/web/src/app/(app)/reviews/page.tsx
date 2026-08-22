"use client";

import { Textarea } from "@chakra-ui/react";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Box, Button, Card, CardBody, EmptyState, Flex, PageHeader, SearchInput, Skeleton, StatusBadge, Text } from "@/lib/design-system";
import { getStoredSession } from "@/lib/auth-session";
import { listGoogleReviews, replyToGoogleReview, type GoogleReview } from "@/lib/api-client";
import { useGoogleLocation } from "@/lib/google-location-context";

const score = (rating: GoogleReview["starRating"]) => ({ ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, STAR_RATING_UNSPECIFIED: 0 })[rating];

export default function ReviewsPage() {
  const { activeLocation, status: locationStatus } = useGoogleLocation();
  const [query, setQuery] = useState("");
  const [minimum, setMinimum] = useState(0);
  const [replyFilter, setReplyFilter] = useState<"ALL" | "PENDING" | "REPLIED">("ALL");
  const [replying, setReplying] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const reviewsQuery = useQuery({
    queryKey: ["reviews", activeLocation?.id],
    enabled: Boolean(activeLocation),
    refetchInterval: 15000,
    queryFn: () => listGoogleReviews({ accessToken: getStoredSession()?.accessToken ?? "", accountId: activeLocation?.accountId ?? "", locationId: activeLocation?.id ?? "" }),
  });
  useEffect(() => { setQuery(""); setMinimum(0); }, [activeLocation?.id]);
  const reviews = reviewsQuery.data?.reviews ?? [];
  const loading = locationStatus === "loading" || reviewsQuery.isFetching;
  const connected = Boolean(activeLocation);
  const pending = reviews.filter((review) => !review.reviewReply?.comment).length;
  const visible = useMemo(() => reviews.filter((review) => (review.reviewerName ?? "").toLowerCase().includes(query.toLowerCase()) && score(review.starRating) >= minimum && (replyFilter === "ALL" || (replyFilter === "PENDING" ? !review.reviewReply?.comment : Boolean(review.reviewReply?.comment)))), [reviews, query, minimum, replyFilter]);
  async function publish(review: GoogleReview) { const session = getStoredSession(); if (!session?.accessToken || !activeLocation || !message.trim()) return; await replyToGoogleReview({ accessToken: session.accessToken, accountId: activeLocation.accountId ?? "", locationId: activeLocation.id, reviewId: review.id, message: message.trim() }); setReplying(null); setMessage(""); await reviewsQuery.refetch(); }
  return <Box css={{ maxW: "1160px", mx: "auto" }}><PageHeader eyebrow="Google Business Profile" title="Avaliações" description="Leia feedbacks recentes e identifique oportunidades de resposta." />
    {!loading && !connected ? <EmptyState title="Nenhuma empresa disponível nesta conta Google" description="Conecte ou gerencie sua integração para visualizar as avaliações." action={{ label: "Gerenciar integração Google", onClick: () => { window.location.href = "/settings/integrations"; } }} size="md" /> : <><Card variant="default" padding="sm"><CardBody css={{ p: 3 }}><Flex css={{ gap: 3, alignItems: "center", flexWrap: "wrap" }}><Box css={{ flex: "1 1 250px" }}><SearchInput value={query} onChange={setQuery} placeholder="Buscar por autor" /></Box><Flex css={{ gap: 1, flexWrap: "wrap" }}><Button size="sm" variant={replyFilter === "ALL" ? "solid" : "ghost"} onClick={() => setReplyFilter("ALL")}>Todas</Button><Button size="sm" variant={replyFilter === "PENDING" ? "solid" : "ghost"} onClick={() => setReplyFilter("PENDING")}>Não respondidas ({pending})</Button><Button size="sm" variant={replyFilter === "REPLIED" ? "solid" : "ghost"} onClick={() => setReplyFilter("REPLIED")}>Respondidas</Button>{[0, 3, 4, 5].map((value) => <Button key={value} size="sm" variant={minimum === value ? "solid" : "ghost"} onClick={() => setMinimum(value)}>{value ? `${value}+ estrelas` : "Todas as estrelas"}</Button>)}</Flex></Flex><Text css={{ mt: 3, fontSize: "sm", color: "text.secondary" }}>{pending} avaliações aguardando resposta</Text></CardBody></Card>
      <Box css={{ mt: 5, bg: "surface.primary", border: "1px solid", borderColor: "surface.border", borderRadius: "lg", overflow: "hidden" }}>{loading ? Array.from({ length: 5 }, (_, index) => <Skeleton key={index} height="106px" />) : visible.length ? visible.map((review) => <ReviewRow key={review.id} review={review} replying={replying === review.id} message={message} onReply={() => { setReplying(review.id); setMessage(review.reviewReply?.comment ?? ""); }} onMessage={setMessage} onPublish={() => void publish(review)} onCancel={() => setReplying(null)} />) : <EmptyState title="Nenhuma avaliação encontrada" description="Tente alterar a busca ou o filtro de estrelas." size="sm" />}</Box>
    </>}</Box>;
}

function ReviewRow({ review, replying, message, onReply, onMessage, onPublish, onCancel }: { review: GoogleReview; replying: boolean; message: string; onReply: () => void; onMessage: (value: string) => void; onPublish: () => void; onCancel: () => void }) {
  const value = score(review.starRating);
  return <Flex css={{ gap: 3, p: 4, borderBottom: "1px solid", borderColor: "surface.border", bg: review.reviewReply ? "surface.primary" : "rgba(245, 158, 11, .035)", _last: { borderBottom: 0 } }}><Box css={{ display: "grid", placeItems: "center", w: 8, h: 8, borderRadius: "full", flexShrink: 0, bg: "surface.tertiary", color: "text.secondary", fontWeight: "medium", fontSize: "xs" }}>{(review.reviewerName ?? "CG").slice(0, 2).toUpperCase()}</Box><Box css={{ flex: 1, minW: 0 }}><Flex css={{ justifyContent: "space-between", alignItems: "flex-start", gap: 3, flexWrap: "wrap" }}><Box><Flex css={{ gap: 2, alignItems: "center" }}><Text css={{ fontWeight: "medium", fontSize: "sm" }}>{review.reviewerName ?? "Cliente Google"}</Text><StatusBadge status={review.reviewReply ? "success" : "warning"}>{review.reviewReply ? "Respondida" : "Aguardando resposta"}</StatusBadge></Flex><Flex css={{ mt: 1, gap: .5, color: "#b7791f" }}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} fill={index < value ? "currentColor" : "transparent"} />)}</Flex></Box><Button size="sm" variant="outline" onClick={onReply}>{review.reviewReply ? "Editar resposta" : "Responder"}</Button></Flex><Text css={{ mt: 3, fontSize: "sm", color: "text.secondary", lineHeight: "relaxed" }}>{review.comment ?? "Esta avaliação não contém um comentário."}</Text>{review.reviewReply && <Text css={{ mt: 3, p: 3, bg: "surface.secondary", borderRadius: "md", fontSize: "sm", color: "text.secondary" }}><strong>Sua resposta:</strong> {review.reviewReply.comment}</Text>}{replying && <Box css={{ mt: 3 }}><Textarea value={message} onChange={(event) => onMessage(event.target.value)} placeholder="Escreva uma resposta pública" rows={3} /><Flex css={{ gap: 2, mt: 2, justifyContent: "flex-end" }}><Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button><Button size="sm" onClick={onPublish}>Publicar resposta</Button></Flex></Box>}</Box></Flex>;
}
