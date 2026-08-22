"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  CircleAlert,
  Clock3,
  MessageCircle,
  Plug,
  RefreshCw,
  Star,
} from "lucide-react";
import {
  Box, Button, Card, CardBody, EmptyState, Flex, Link, Skeleton, StatusBadge, Text,
} from "@/lib/design-system";
import { getStoredSession } from "@/lib/auth-session";
import {
  listGoogleAccounts, listGoogleLocations, listGoogleReviews, listInstagramAccounts,
  listInstagramComments, type GoogleReview, type InstagramComment,
} from "@/lib/api-client";

const score = (rating: GoogleReview["starRating"]) =>
  ({ ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, STAR_RATING_UNSPECIFIED: 0 })[rating];
const relativeDate = (date: string) =>
  new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" }).format(
    Math.round((new Date(date).getTime() - Date.now()) / 86_400_000),
    "day",
  );

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [comments, setComments] = useState<InstagramComment[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [average, setAverage] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => { void loadDashboard(); }, []);

  async function loadDashboard() {
    const session = getStoredSession();
    if (!session?.accessToken) return;
    setUserName(session.user.name);
    try {
      const [google, instagram] = await Promise.allSettled([
        listGoogleAccounts(session.accessToken),
        listInstagramAccounts(session.accessToken),
      ]);
      if (instagram.status === "fulfilled") {
        const active = instagram.value.accounts.length > 0;
        setInstagramConnected(active);
        if (active) {
          const result = await listInstagramComments({ accessToken: session.accessToken, limit: 12 });
          setComments(result.comments);
        }
      }
      if (google.status === "fulfilled" && google.value.accounts[0]) {
        setGoogleConnected(true);
        const accountId = google.value.accounts[0].id;
        const locations = await listGoogleLocations({ accessToken: session.accessToken, accountId });
        if (locations.locations[0]) {
          const result = await listGoogleReviews({
            accessToken: session.accessToken, accountId, locationId: locations.locations[0].id,
          });
          setReviews(result.reviews);
          setAverage(result.averageRating ?? null);
          setTotal(result.totalReviewCount ?? null);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const newComments = comments.filter((comment) => comment.status === "NEW").length;
  const ratingDistribution = useMemo(
    () => [5, 4, 3, 2, 1].map((value) => ({
      value, count: reviews.filter((review) => score(review.starRating) === value).length,
    })),
    [reviews],
  );
  const maxDistribution = Math.max(...ratingDistribution.map((item) => item.count), 1);
  const activity = useMemo(
    () => [
      ...reviews.map((review) => ({ id: `review-${review.id}`, type: "google" as const, date: review.updatedAt, title: `Nova avaliação de ${score(review.starRating)} estrelas`, detail: review.reviewerName ?? "Cliente Google" })),
      ...comments.map((comment) => ({ id: `comment-${comment.id}`, type: "instagram" as const, date: comment.createdAt, title: "Novo comentário no Instagram", detail: `@${comment.author.username ?? "cliente"}` })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [comments, reviews],
  );
  const connected = googleConnected || instagramConnected;

  return <Box css={{ maxW: "1580px", mx: "auto", pb: 8 }}>
    <DashboardHeader userName={userName} refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadDashboard(); }} />
    {loading ? <DashboardSkeleton /> : !connected ? <DisconnectedDashboard /> : <>
      <Box css={{ display: "grid", gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }, gap: 0, mb: 6, bg: "surface.primary", border: "1px solid", borderColor: "surface.border", borderRadius: "lg", overflow: "hidden" }}>
        <Kpi icon={<Star size={17} />} label="Reputação Google" value={average?.toFixed(1) ?? "—"} detail={average ? "Nota média atual" : "Aguardando avaliações"} emphasis />
        <Kpi icon={<MessageCircle size={17} />} label="Avaliações" value={total?.toLocaleString("pt-BR") ?? "—"} detail={total !== null ? "Total no Google Business Profile" : "Sem dados disponíveis"} />
        <Kpi icon={<CircleAlert size={17} />} label="Precisa de atenção" value={newComments.toString()} detail={newComments ? "Comentários novos para revisar" : "Nenhuma pendência identificada"} tone={newComments ? "warning" : "neutral"} />
        <Kpi icon={<Camera size={17} />} label="Comentários Instagram" value={comments.length.toString()} detail={instagramConnected ? `${newComments} novo(s) na lista atual` : "Canal não conectado"} tone="instagram" />
      </Box>

      <Box css={{ display: "grid", gridTemplateColumns: { base: "1fr", xl: "minmax(0, 1.55fr) minmax(340px, .8fr)" }, gap: 5 }}>
        <Box css={{ display: "grid", gap: 5, alignContent: "start" }}>
          <ReputationCard average={average} total={total} distribution={ratingDistribution} maximum={maxDistribution} googleConnected={googleConnected} />
          <Box css={{ display: "grid", gridTemplateColumns: { base: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 5 }}>
            <ActivityCard activity={activity} />
            <ReviewsCard reviews={reviews} />
          </Box>
        </Box>
        <Box css={{ display: "grid", gap: 5, alignContent: "start" }}>
          <AttentionCard newComments={newComments} googleConnected={googleConnected} instagramConnected={instagramConnected} />
          <ChannelsCard googleConnected={googleConnected} instagramConnected={instagramConnected} />
          <CommentsCard comments={comments} />
        </Box>
      </Box>
    </>}
  </Box>;
}

function DashboardHeader({ refreshing, onRefresh }: { userName: string | null; refreshing: boolean; onRefresh: () => void }) {
  return <Flex css={{ justifyContent: "space-between", alignItems: { base: "flex-start", md: "flex-end" }, gap: 5, flexWrap: "wrap", mb: 8 }}>
    <Box>
      <Text css={{ fontSize: "xs", color: "text.quaternary", fontWeight: "semibold", letterSpacing: "wide", textTransform: "uppercase" }}>Visão geral</Text>
      <Text as="h1" css={{ mt: 2, fontSize: { base: "xl", md: "2xl" }, fontWeight: "semibold", letterSpacing: "tight", color: "text.primary" }}>Resumo da reputação e atividade recente</Text>
      <Text css={{ mt: 2, color: "text.tertiary", fontSize: "sm" }}>Acompanhe o desempenho dos seus canais e veja o que precisa da sua atenção hoje.</Text>
    </Box>
    <Flex css={{ gap: 3, alignItems: "center", flexWrap: "wrap" }}>
      <Button size="sm" variant="outline" loading={refreshing} onClick={onRefresh}><RefreshCw size={15} />Atualizar</Button>
      <Link href="/settings/integrations"><Button size="sm"><Plug size={15} />Canais</Button></Link>
    </Flex>
  </Flex>;
}

function Kpi({ label, value, detail, emphasis = false }: { icon: React.ReactNode; label: string; value: string; detail: string; tone?: "brand" | "warning" | "neutral" | "instagram"; emphasis?: boolean }) {
  return <Box css={{ minW: 0, p: { base: 4, md: 5 }, borderRight: { xl: "1px solid" }, borderBottom: { base: "1px solid", xl: "0" }, borderColor: "surface.border", _last: { borderRight: 0, borderBottom: 0 } }}>
    <Flex css={{ justifyContent: "space-between", alignItems: "flex-start", gap: 3 }}><Text css={{ fontSize: "xs", color: "text.tertiary", fontWeight: "medium" }}>{label}</Text></Flex>
    <Flex css={{ alignItems: "baseline", gap: 2, mt: 3 }}><Text css={{ fontSize: "2xl", fontWeight: "semibold", letterSpacing: "tight", lineHeight: "tight" }}>{value}</Text>{emphasis && value !== "—" && <Text css={{ color: "#b7791f", fontSize: "xs", letterSpacing: 1 }}>★★★★★</Text>}</Flex>
    <Text css={{ mt: 2, color: "text.tertiary", fontSize: "xs" }}>{detail}</Text>
  </Box>;
}

function SectionHeader({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) {
  return <Flex css={{ p: 5, justifyContent: "space-between", alignItems: "flex-start", gap: 3, borderBottom: "1px solid", borderColor: "surface.border" }}><Box><Text css={{ color: "text.primary", fontWeight: "bold" }}>{title}</Text><Text css={{ mt: 1, fontSize: "xs", color: "text.tertiary" }}>{description}</Text></Box>{href && <Link href={href}><Button variant="ghost" size="sm">{action ?? "Ver tudo"}<ArrowRight size={14} /></Button></Link>}</Flex>;
}

function ReputationCard({ average, total, distribution, maximum, googleConnected }: { average: number | null; total: number | null; distribution: Array<{ value: number; count: number }>; maximum: number; googleConnected: boolean }) {
  return <Card variant="default" padding="none"><CardBody css={{ p: 0 }}><SectionHeader title="Reputação geral" description="Resumo das avaliações do Google Business Profile" /><Box css={{ p: { base: 5, md: 6 }, display: "grid", gridTemplateColumns: { base: "1fr", md: "minmax(210px, .72fr) minmax(0, 1fr)" }, gap: { base: 6, md: 9 }, alignItems: "center" }}>
    <Box css={{ p: 5, borderRadius: "lg", bg: "surface.secondary", border: "1px solid", borderColor: "surface.border" }}><Text css={{ fontSize: "xs", fontWeight: "semibold", letterSpacing: "wide", color: "text.tertiary" }}>ÍNDICE ATUAL</Text><Text css={{ mt: 3, fontSize: "4xl", fontWeight: "semibold", lineHeight: "tight", letterSpacing: "tight" }}>{average?.toFixed(1) ?? "—"}</Text><Text css={{ mt: 1, color: "#b7791f", letterSpacing: 2 }}>★★★★★</Text><Text css={{ mt: 4, color: "text.secondary", fontSize: "sm", fontWeight: "medium" }}>{average ? "Sua reputação está sendo acompanhada." : googleConnected ? "Aguardando a primeira avaliação." : "Google ainda não conectado."}</Text><Text css={{ mt: 1, color: "text.tertiary", fontSize: "xs" }}>{total !== null ? `${total.toLocaleString("pt-BR")} avaliações registradas` : "Sem volume disponível"}</Text></Box>
    <Box><Text css={{ fontSize: "sm", color: "text.secondary", fontWeight: "semibold", mb: 4 }}>Distribuição da lista carregada</Text>{distribution.some((item) => item.count) ? <Flex css={{ flexDirection: "column", gap: 3 }}>{distribution.map((item) => <Flex key={item.value} css={{ alignItems: "center", gap: 3 }}><Text css={{ w: 5, fontSize: "xs", color: "text.tertiary" }}>{item.value}★</Text><Box css={{ flex: 1, h: 2, borderRadius: "full", bg: "surface.tertiary", overflow: "hidden" }}><Box css={{ h: "full", w: `${(item.count / maximum) * 100}%`, minW: item.count ? "6px" : 0, borderRadius: "full", bg: item.value >= 4 ? "brand.500" : item.value === 3 ? "amber.400" : "red.400" }} /></Box><Text css={{ w: 5, textAlign: "right", fontSize: "xs", fontWeight: "semibold", color: "text.secondary" }}>{item.count}</Text></Flex>)}</Flex> : <Text css={{ color: "text.tertiary", fontSize: "sm", lineHeight: "relaxed" }}>A distribuição aparecerá quando houver avaliações disponíveis para esta empresa.</Text>}</Box>
  </Box></CardBody></Card>;
}

function AttentionCard({ newComments, googleConnected, instagramConnected }: { newComments: number; googleConnected: boolean; instagramConnected: boolean }) {
  const hasIssue = newComments > 0 || !googleConnected || !instagramConnected;
  return <Card variant="default" padding="none"><CardBody css={{ p: 0 }}><SectionHeader title="Precisa da sua atenção" description={hasIssue ? "Itens que merecem uma revisão rápida." : "Tudo certo nos canais conectados."} /><Box css={{ p: 3, display: "grid", gap: 1 }}>
    {newComments > 0 && <AttentionItem icon={<Camera size={16} />} title={`${newComments} comentário${newComments > 1 ? "s" : ""} novo${newComments > 1 ? "s" : ""}`} detail="Instagram" href="/instagram/comments" action="Ver comentários" />}
    {!googleConnected && <AttentionItem icon={<Plug size={16} />} title="Google não conectado" detail="Conecte para acompanhar avaliações" href="/settings/integrations" action="Conectar" />}
    {!instagramConnected && <AttentionItem icon={<Plug size={16} />} title="Instagram não conectado" detail="Conecte para acompanhar comentários" href="/settings/integrations" action="Conectar" />}
    {!hasIssue && <Flex css={{ p: 4, gap: 3, alignItems: "center", borderRadius: "xl", bg: "#edf9f0" }}><CheckCircle2 size={18} color="#197544" /><Text css={{ fontSize: "sm", color: "text.secondary" }}>Nenhuma pendência identificada agora.</Text></Flex>}
  </Box></CardBody></Card>;
}
function AttentionItem({ icon, title, detail, href, action }: { icon: React.ReactNode; title: string; detail: string; href: string; action: string }) { return <Flex css={{ alignItems: "center", gap: 3, p: 3, borderRadius: "xl", _hover: { bg: "surface.secondary" } }}><Box css={{ display: "grid", placeItems: "center", w: 9, h: 9, borderRadius: "xl", bg: "#fff7e5", color: "#a86700" }}>{icon}</Box><Box css={{ flex: 1, minW: 0 }}><Text css={{ fontSize: "sm", fontWeight: "semibold" }}>{title}</Text><Text css={{ mt: .5, fontSize: "xs", color: "text.tertiary" }}>{detail}</Text></Box><Link href={href}><Button variant="ghost" size="sm">{action}</Button></Link></Flex>; }

function ActivityCard({ activity }: { activity: Array<{ id: string; type: "google" | "instagram"; date: string; title: string; detail: string }> }) { return <Card variant="default" padding="none"><CardBody css={{ p: 0 }}><SectionHeader title="Atividade recente" description="Últimas movimentações dos canais." href="/inbox" action="Abrir inbox" /><Box css={{ p: 3 }}>{activity.length ? activity.map((item) => <Flex key={item.id} css={{ gap: 3, py: 3, px: 2, alignItems: "flex-start", borderBottom: "1px solid", borderColor: "surface.border", _last: { borderBottom: 0 } }}><Box css={{ display: "grid", placeItems: "center", w: 8, h: 8, borderRadius: "full", flexShrink: 0, bg: item.type === "google" ? "#e8f0fe" : "#fce7ef", color: item.type === "google" ? "#1a73e8" : "#c13584", fontSize: "10px", fontWeight: "bold" }}>{item.type === "google" ? "G" : "IG"}</Box><Box css={{ flex: 1, minW: 0 }}><Text css={{ fontSize: "sm", fontWeight: "semibold", truncate: true }}>{item.title}</Text><Text css={{ mt: .5, fontSize: "xs", color: "text.tertiary", truncate: true }}>{item.detail}</Text></Box><Text css={{ fontSize: "xs", color: "text.quaternary", whiteSpace: "nowrap" }}>{relativeDate(item.date)}</Text></Flex>) : <InlineEmpty text="A atividade dos seus canais aparecerá aqui." />}</Box></CardBody></Card>; }
function ReviewsCard({ reviews }: { reviews: GoogleReview[] }) { return <Card variant="default" padding="none"><CardBody css={{ p: 0 }}><SectionHeader title="Últimas avaliações" description="Feedbacks recentes do Google." href="/reviews" action="Ver avaliações" /><Box css={{ p: 3 }}>{reviews.length ? reviews.slice(0, 3).map((review) => <Flex key={review.id} css={{ gap: 3, py: 3, px: 2, borderBottom: "1px solid", borderColor: "surface.border", _last: { borderBottom: 0 } }}><Box css={{ display: "grid", placeItems: "center", w: 8, h: 8, borderRadius: "full", flexShrink: 0, bg: "brand.50", color: "brand.700", fontSize: "10px", fontWeight: "bold" }}>{(review.reviewerName ?? "CG").slice(0, 2).toUpperCase()}</Box><Box css={{ flex: 1, minW: 0 }}><Flex css={{ alignItems: "center", justifyContent: "space-between", gap: 2 }}><Text css={{ fontSize: "sm", fontWeight: "semibold", truncate: true }}>{review.reviewerName ?? "Cliente Google"}</Text><Text css={{ color: "#d49a10", fontSize: "xs" }}>{"★".repeat(score(review.starRating))}</Text></Flex><Text css={{ mt: 1, fontSize: "xs", color: "text.tertiary", lineClamp: 2 }}>{review.comment ?? "Avaliação sem comentário."}</Text></Box></Flex>) : <InlineEmpty text="Ainda não há avaliações para mostrar." />}</Box></CardBody></Card>; }
function ChannelsCard({ googleConnected, instagramConnected }: { googleConnected: boolean; instagramConnected: boolean }) { return <Card variant="filled" padding="none"><CardBody css={{ p: 0 }}><SectionHeader title="Canais conectados" description="Estado atual das integrações." href="/settings/integrations" action="Gerenciar" /><Box css={{ p: 3, display: "grid", gap: 2 }}><ChannelStatus label="Google Business Profile" connected={googleConnected} detail={googleConnected ? "Dados disponíveis no dashboard" : "Aguardando conexão"} /><ChannelStatus label="Instagram" connected={instagramConnected} detail={instagramConnected ? "Comentários monitorados" : "Aguardando conexão"} /><Flex css={{ alignItems: "center", justifyContent: "space-between", p: 3, opacity: .65 }}><Text css={{ fontSize: "sm", fontWeight: "medium" }}>Facebook</Text><StatusBadge status="comingSoon" /></Flex></Box></CardBody></Card>; }
function ChannelStatus({ label, connected, detail }: { label: string; connected: boolean; detail: string }) { return <Flex css={{ alignItems: "center", gap: 3, p: 3, bg: "surface.primary", borderRadius: "xl" }}><Box css={{ w: 2, h: 2, borderRadius: "full", bg: connected ? "#28a65b" : "#a0aba4", boxShadow: connected ? "0 0 0 4px #e3f7e9" : "none" }} /><Box css={{ flex: 1 }}><Text css={{ fontSize: "sm", fontWeight: "semibold" }}>{label}</Text><Text css={{ mt: .5, fontSize: "xs", color: "text.tertiary" }}>{detail}</Text></Box><StatusBadge status={connected ? "connected" : "disconnected"} /></Flex>; }
function CommentsCard({ comments }: { comments: InstagramComment[] }) { return <Card variant="default" padding="none"><CardBody css={{ p: 0 }}><SectionHeader title="Comentários recentes" description="Interações mais recentes no Instagram." href="/instagram/comments" action="Ver comentários" /><Box css={{ p: 3 }}>{comments.length ? comments.slice(0, 3).map((comment) => <Flex key={comment.id} css={{ gap: 3, py: 3, px: 2, borderBottom: "1px solid", borderColor: "surface.border", _last: { borderBottom: 0 } }}><Box css={{ display: "grid", placeItems: "center", w: 8, h: 8, borderRadius: "full", flexShrink: 0, bg: "#fce7ef", color: "#c13584" }}><Camera size={14} /></Box><Box css={{ flex: 1, minW: 0 }}><Flex css={{ justifyContent: "space-between", gap: 2 }}><Text css={{ fontSize: "sm", fontWeight: "semibold" }}>@{comment.author.username ?? "cliente"}</Text>{comment.status === "NEW" && <StatusBadge status="new" />}</Flex><Text css={{ mt: 1, fontSize: "xs", color: "text.tertiary", lineClamp: 2 }}>{comment.text ?? "Comentário sem conteúdo de texto."}</Text></Box></Flex>) : <InlineEmpty text="Novos comentários aparecerão aqui." />}</Box></CardBody></Card>; }
function InlineEmpty({ text }: { text: string }) { return <Flex css={{ py: 6, gap: 2, justifyContent: "center", alignItems: "center", color: "text.tertiary" }}><Clock3 size={15} /><Text css={{ fontSize: "sm" }}>{text}</Text></Flex>; }
function DashboardSkeleton() { return <Box css={{ display: "grid", gap: 5 }}><MetricsSummarySkeleton /><Box css={{ display: "grid", gridTemplateColumns: { base: "1fr", xl: "minmax(0, 1.55fr) minmax(320px, .8fr)" }, gap: 5 }}><Box css={{ display: "grid", gap: 5, alignContent: "start" }}><ReputationSkeleton /><Box css={{ display: "grid", gridTemplateColumns: { base: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 5 }}><SectionSkeleton rows={4} /><SectionSkeleton rows={3} /></Box></Box><Box css={{ display: "grid", gap: 5, alignContent: "start" }}><SectionSkeleton rows={3} /><SectionSkeleton rows={3} /><SectionSkeleton rows={3} /></Box></Box></Box>; }
function MetricsSummarySkeleton() { return <Box css={{ display: "grid", gridTemplateColumns: { base: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }, border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", bg: "surface.primary" }}>{Array.from({ length: 4 }, (_, index) => <Box key={index} css={{ p: 4, borderRight: { xl: "1px solid var(--border)" }, borderBottom: { base: "1px solid var(--border)", xl: "0" }, _last: { borderRight: 0, borderBottom: 0 } }}><Skeleton width="48%" height="12px" /><Skeleton width="30%" height="24px" /></Box>)}</Box>; }
function ReputationSkeleton() { return <Box css={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", bg: "surface.primary" }}><SectionSkeletonHeader /><Box css={{ p: 5, display: "grid", gridTemplateColumns: { base: "1fr", md: "210px minmax(0, 1fr)" }, gap: 7 }}><Box css={{ border: "1px solid var(--border)", borderRadius: "8px", p: 4 }}><Skeleton width="54%" height="12px" /><Skeleton width="42%" height="34px" /><Skeleton width="68%" height="12px" /></Box><Box css={{ pt: 2 }}>{Array.from({ length: 5 }, (_, index) => <Flex key={index} css={{ alignItems: "center", gap: 3, mb: 3 }}><Skeleton width="26px" height="10px" /><Skeleton width="100%" height="8px" /><Skeleton width="18px" height="10px" /></Flex>)}</Box></Box></Box>; }
function SectionSkeleton({ rows }: { rows: number }) { return <Box css={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", bg: "surface.primary" }}><SectionSkeletonHeader />{Array.from({ length: rows }, (_, index) => <Flex key={index} css={{ alignItems: "center", gap: 3, p: 4, borderBottom: "1px solid var(--border)", _last: { borderBottom: 0 } }}><Skeleton variant="circular" width="28px" height="28px" /><Box css={{ flex: 1 }}><Skeleton width={index % 2 ? "52%" : "66%"} height="12px" /><Skeleton width="36%" height="10px" /></Box><Skeleton width="54px" height="10px" /></Flex>)}</Box>; }
function SectionSkeletonHeader() { return <Box css={{ p: 4, borderBottom: "1px solid var(--border)" }}><Skeleton width="150px" height="14px" /><Skeleton width="220px" height="10px" /></Box>; }
function DisconnectedDashboard() { return <Box><Text css={{ fontSize: "sm", fontWeight: "semibold", mb: 3 }}>Primeiros passos</Text><EmptyState icon={<Plug size={20} strokeWidth={1.6} />} title="Nenhum canal conectado" description="Conecte Google Business Profile ou Instagram para começar a acompanhar sua reputação." action={{ label: "Conectar canal", onClick: () => { window.location.href = "/settings/integrations"; } }} size="md" /><Box css={{ mt: 5, border: "1px solid", borderColor: "surface.border", borderRadius: "lg", overflow: "hidden", bg: "surface.primary" }}>{[["Google Business Profile", "Avaliações e reputação no Google.", "Conectar"], ["Instagram", "Comentários e mensagens da conta profissional.", "Conectar"], ["Facebook", "Comentários e Messenger.", "Em breve"]].map(([title, description, action]) => <Flex key={title} css={{ alignItems: "center", gap: 4, p: 4, borderBottom: "1px solid", borderColor: "surface.border", _last: { borderBottom: 0 }, flexWrap: "wrap" }}><Box css={{ flex: 1 }}><Text css={{ fontSize: "sm", fontWeight: "medium" }}>{title}</Text><Text css={{ mt: 1, fontSize: "xs", color: "text.tertiary" }}>{description}</Text></Box>{action === "Conectar" ? <Link href="/settings/integrations"><Button size="sm" variant="outline">Conectar</Button></Link> : <Text css={{ fontSize: "xs", color: "text.quaternary" }}>Em breve</Text>}</Flex>)}</Box></Box>; }
