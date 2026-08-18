"use client";

import { Box, Text, Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter, Badge, Button, Flex, Alert, EmptyState, Link } from "@/lib/design-system";
import { useEffect, useState } from "react";
import { getStoredSession } from "@/lib/auth-session";
import {
  listGoogleAccounts,
  listGoogleLocations,
  listGoogleReviews,
  disconnectGoogle,
  buildGoogleConnectUrl,
} from "@/lib/api-client";
import { Skeleton } from "@/lib/design-system";

interface GoogleAccount {
  id: string;
  name: string;
  accountName?: string | null | undefined;
}

interface GoogleLocation {
  id: string;
  name: string;
  accountId?: string | null | undefined;
  storeCode?: string | null | undefined;
  isVerified?: boolean | null | undefined;
  lastSyncedAt?: string | null | undefined;
}

interface GoogleReview {
  id: string;
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE" | "STAR_RATING_UNSPECIFIED";
  createdAt: string;
  updatedAt: string;
  reviewerName?: string | null | undefined;
  comment?: string | null | undefined;
}

export default function DashboardPage() {
  const [session, setSession] = useState<ReturnType<typeof getStoredSession>>(null);
  const [providers, setProviders] = useState<("google" | "instagram" | "facebook")[]>([]);
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);
  const [googleLocations, setGoogleLocations] = useState<GoogleLocation[]>([]);
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored) {
      window.location.href = "/login";
    } else {
      setSession(stored);
    }
  }, []);

  useEffect(() => {
    if (session?.accessToken) {
      checkProviders();
    }
  }, [session]);

  const checkProviders = async () => {
    if (!session?.accessToken) return;

    const provs: ("google" | "instagram" | "facebook")[] = [];

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/integrations/google/accounts`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accounts?.length > 0) provs.push("google");
      }
    } catch {
      // ignore
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/integrations/instagram/accounts`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accounts?.length > 0) provs.push("instagram");
      }
    } catch {
      // ignore
    }

    setProviders(provs);
  };

  const loadGoogleAccounts = async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listGoogleAccounts(session.accessToken);
      setGoogleAccounts(res.accounts);
      if (res.accounts.length > 0 && !selectedAccountId) {
        const firstAccount = res.accounts[0];
        if (firstAccount) setSelectedAccountId(firstAccount.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar contas Google");
    } finally {
      setLoading(false);
    }
  };

  const loadGoogleLocations = async () => {
    if (!session?.accessToken || !selectedAccountId) return;
    setLoading(true);
    try {
      const res = await listGoogleLocations({ accessToken: session.accessToken, accountId: selectedAccountId });
      setGoogleLocations(res.locations);
      if (res.locations.length > 0 && !selectedLocationId) {
        const firstLocation = res.locations[0];
        if (firstLocation) setSelectedLocationId(firstLocation.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar empresas");
    } finally {
      setLoading(false);
    }
  };

  const loadGoogleReviews = async () => {
    if (!session?.accessToken || !selectedAccountId || !selectedLocationId) return;
    setLoading(true);
    try {
      const res = await listGoogleReviews({ accessToken: session.accessToken, accountId: selectedAccountId, locationId: selectedLocationId });
      setGoogleReviews(res.reviews);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar avaliações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccountId) {
      loadGoogleLocations();
    } else {
      setGoogleLocations([]);
      setSelectedLocationId("");
    }
  }, [selectedAccountId]);

  useEffect(() => {
    if (selectedLocationId) {
      loadGoogleReviews();
    } else {
      setGoogleReviews([]);
    }
  }, [selectedLocationId]);

  useEffect(() => {
    loadGoogleAccounts();
  }, []);

  const handleGoogleConnect = async () => {
    if (!session?.accessToken) return;
    try {
      const url = await buildGoogleConnectUrl(session.accessToken);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao conectar Google");
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!session?.accessToken) return;
    try {
      await disconnectGoogle({ accessToken: session.accessToken });
      setGoogleAccounts([]);
      setGoogleLocations([]);
      setGoogleReviews([]);
      setProviders((p) => p.filter((x) => x !== "google"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao desconectar Google");
    }
  };

  const starRatingLabel = (starRating: string) => {
    const values: Record<string, number> = { FIVE: 5, FOUR: 4, THREE: 3, TWO: 2, ONE: 1, STAR_RATING_UNSPECIFIED: 0 };
    const val = values[starRating] ?? 0;
    return "★".repeat(val) + "☆".repeat(5 - val);
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(dateStr));
  };

  if (!session) return null;

  const anyConnected = providers.length > 0;

  return (
    <Box>
      <Box css={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 6, flexWrap: "wrap", gap: 3 }}>
        <Text fontSize="2xl" fontWeight="bold" color="text.primary">
          Visão geral
        </Text>
        <Link href="/settings/integrations">
          <Button variant="ghost" size="sm">
            Gerenciar integrações
          </Button>
        </Link>
      </Box>

      {error && <Alert tone="error" mb={6} onClose={() => setError(null)} dismissible>{error}</Alert>}

      {!anyConnected ? (
        <EmptyState
          title="Conecte seu primeiro canal"
          description="Você poderá acompanhar sua reputação em um único lugar conectando suas contas."
          action={{ label: "Configurar integrações", onClick: () => window.location.href = "/settings/integrations" }}
        />
      ) : (
        <>
          <Box css={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 6 }}>
            {["google", "instagram", "facebook"].map((provider) => {
              const isConnected = providers.includes(provider as "google" | "instagram" | "facebook");
              if (!isConnected) return null;
              const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
                google: { label: "Google", color: "blue", icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )},
                instagram: { label: "Instagram", color: "pink", icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                )},
                facebook: { label: "Facebook", color: "blue", icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )},
              };
              const config = configs[provider];
              if (!config) return null;
              return (
                <Badge key={provider} variant="subtle" colorScheme={config.color as "blue" | "pink"} size="md" dot>
                  {config.icon}
                  {config.label}
                </Badge>
              );
            })}
          </Box>

          {providers.includes("google") && (
            <Card variant="default" padding="lg">
              <CardHeader>
                <CardTitle>Google Business Profile</CardTitle>
                <CardDescription>Gerencie suas contas e empresas conectadas</CardDescription>
              </CardHeader>
              <CardBody>
                {loading && <Skeleton variant="text" count={3} />}

                {!loading && googleAccounts.length === 0 ? (
                  <Box css={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, py: 8 }}>
                    <Text color="text.tertiary">Nenhuma conta Google conectada</Text>
                    <Button onClick={handleGoogleConnect} variant="solid" size="sm">Conectar Google</Button>
                  </Box>
                ) : (
                  <>
                    <Box css={{ mb: 4 }}>
                      <Text fontSize="sm" fontWeight="medium" color="text.secondary" mb={2}>Conta Google</Text>
                      <Flex css={{ gap: 2, flexWrap: "wrap" }}>
                        {googleAccounts.map((account) => (
                          <Button
                            key={account.id}
                            variant={selectedAccountId === account.id ? "solid" : "outline"}
                            size="sm"
                            onClick={() => { setSelectedAccountId(account.id); setSelectedLocationId(""); }}
                          >
                            {account.accountName ?? account.name}
                          </Button>
                        ))}
                      </Flex>
                    </Box>

                    {selectedAccountId && googleLocations.length === 0 && !loading && (
                      <Box css={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, py: 8, textAlign: "center" }}>
                        <Text color="text.tertiary">Nenhuma empresa encontrada para esta conta</Text>
                      </Box>
                    )}

                    {selectedAccountId && googleLocations.length > 0 && (
                      <>
                        <Box css={{ mb: 4 }}>
                          <Text fontSize="sm" fontWeight="medium" color="text.secondary" mb={2}>Empresa</Text>
                          <Flex css={{ gap: 2, flexWrap: "wrap" }}>
                            {googleLocations.map((location) => (
                              <Button
                                key={location.id}
                                variant={selectedLocationId === location.id ? "solid" : "outline"}
                                size="sm"
                                onClick={() => setSelectedLocationId(location.id)}
                              >
                                {location.name}
                              </Button>
                            ))}
                          </Flex>
                        </Box>

                        {selectedLocationId && (
                          <Box>
                            <Text fontSize="sm" fontWeight="medium" color="text.secondary" mb={2}>Avaliações recentes</Text>
                            {loading ? (
                              <Skeleton variant="text" count={5} />
                            ) : googleReviews.length === 0 ? (
                              <Box css={{ textAlign: "center", py: 8 }}>
                                <Text color="text.tertiary">Nenhuma avaliação encontrada</Text>
                              </Box>
                            ) : (
                              <Flex css={{ flexDirection: "column", gap: 3 }}>
                                {googleReviews.slice(0, 5).map((review) => (
                                  <Box key={review.id} css={{ p: 4, bg: "surface.tertiary", borderRadius: "lg", border: "1px solid", borderColor: "surface.border" }}>
                                    <Flex css={{ justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 2 }}>
                                      <Text fontWeight="semibold" color="text.primary">{starRatingLabel(review.starRating)}</Text>
                                      <Text fontSize="sm" color="text.tertiary">{formatDate(review.updatedAt)}</Text>
                                    </Flex>
                                    <Text color="text.secondary" fontSize="sm">{review.reviewerName ?? "Cliente Google"}</Text>
                                    {review.comment && <Text mt={2} color="text.primary">{review.comment}</Text>}
                                  </Box>
                                ))}
                              </Flex>
                            )}
                          </Box>
                        )}
                      </>
                    )}
                  </>
                )}
              </CardBody>
              <CardFooter>
                <Button variant="outline" colorScheme="red" size="sm" onClick={handleGoogleDisconnect}>
                  Desconectar Google
                </Button>
              </CardFooter>
            </Card>
          )}
        </>
      )}
    </Box>
  );
}