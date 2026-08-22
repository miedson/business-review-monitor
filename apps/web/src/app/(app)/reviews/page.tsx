"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Box, Button, Card, CardBody, EmptyState, Flex, PageHeader, SearchInput, Skeleton, Text } from "@/lib/design-system";
import { getStoredSession } from "@/lib/auth-session";
import { listGoogleReviews, type GoogleReview } from "@/lib/api-client";
import { useGoogleLocation } from "@/lib/google-location-context";

const score = (rating: GoogleReview["starRating"]) => ({ ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, STAR_RATING_UNSPECIFIED: 0 })[rating];

export default function ReviewsPage() {
  const { activeLocation, status: locationStatus } = useGoogleLocation();
  const [query, setQuery] = useState("");
  const [minimum, setMinimum] = useState(0);
  const reviewsQuery = useQuery({
    queryKey: ["reviews", activeLocation?.id],
    enabled: Boolean(activeLocation),
    queryFn: () => listGoogleReviews({ accessToken: getStoredSession()?.accessToken ?? "", accountId: activeLocation?.accountId ?? "", locationId: activeLocation?.id ?? "" }),
  });
  useEffect(() => { setQuery(""); setMinimum(0); }, [activeLocation?.id]);
  const reviews = reviewsQuery.data?.reviews ?? [];
  const loading = locationStatus === "loading" || reviewsQuery.isFetching;
  const connected = Boolean(activeLocation);
  const visible = useMemo(() => reviews.filter((review) => (review.reviewerName ?? "").toLowerCase().includes(query.toLowerCase()) && score(review.starRating) >= minimum), [reviews, query, minimum]);
  return <Box css={{ maxW: "1160px", mx: "auto" }}><PageHeader eyebrow="Google Business Profile" title="Avaliações" description="Leia feedbacks recentes e identifique oportunidades de resposta." />
    {!loading && !connected ? <EmptyState title="Nenhuma empresa disponível nesta conta Google" description="Conecte ou gerencie sua integração para visualizar as avaliações." action={{ label: "Gerenciar integração Google", onClick: () => { window.location.href = "/settings/integrations"; } }} size="md" /> : <><Card variant="default" padding="sm"><CardBody css={{ p: 3 }}><Flex css={{ gap: 3, alignItems: "center", flexWrap: "wrap" }}><Box css={{ flex: "1 1 250px" }}><SearchInput value={query} onChange={setQuery} placeholder="Buscar por autor" /></Box><Flex css={{ gap: 1, flexWrap: "wrap" }}>{[0, 3, 4, 5].map((value) => <Button key={value} size="sm" variant={minimum === value ? "solid" : "ghost"} onClick={() => setMinimum(value)}>{value ? `${value}+ estrelas` : "Todas"}</Button>)}</Flex></Flex></CardBody></Card>
      <Box css={{ mt: 5, bg: "surface.primary", border: "1px solid", borderColor: "surface.border", borderRadius: "lg", overflow: "hidden" }}>{loading ? Array.from({ length: 5 }, (_, index) => <Skeleton key={index} height="106px" />) : visible.length ? visible.map((review) => <ReviewRow key={review.id} review={review} />) : <EmptyState title="Nenhuma avaliação encontrada" description="Tente alterar a busca ou o filtro de estrelas." size="sm" />}</Box>
    </>}</Box>;
}

function ReviewRow({ review }: { review: GoogleReview }) {
  const value = score(review.starRating);
  return <Flex css={{ gap: 3, p: 4, borderBottom: "1px solid", borderColor: "surface.border", _last: { borderBottom: 0 }, _hover: { bg: "surface.secondary" } }}><Box css={{ display: "grid", placeItems: "center", w: 8, h: 8, borderRadius: "full", flexShrink: 0, bg: "surface.tertiary", color: "text.secondary", fontWeight: "medium", fontSize: "xs" }}>{(review.reviewerName ?? "CG").slice(0, 2).toUpperCase()}</Box><Box css={{ flex: 1, minW: 0 }}><Flex css={{ justifyContent: "space-between", alignItems: "flex-start", gap: 3, flexWrap: "wrap" }}><Box><Text css={{ fontWeight: "medium", fontSize: "sm" }}>{review.reviewerName ?? "Cliente Google"}</Text><Flex css={{ mt: 1, gap: .5, color: "#b7791f" }}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} fill={index < value ? "currentColor" : "transparent"} />)}</Flex></Box><Text css={{ fontSize: "xs", color: "text.tertiary" }}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(review.updatedAt))}</Text></Flex><Text css={{ mt: 3, fontSize: "sm", color: "text.secondary", lineHeight: "relaxed" }}>{review.comment ?? "Esta avaliação não contém um comentário."}</Text><Text css={{ mt: 2, fontSize: "xs", color: "text.quaternary" }}>Google Business Profile · resposta ainda indisponível</Text></Box></Flex>;
}
