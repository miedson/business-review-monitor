"use client";

import { buildGoogleConnectUrl } from "@/lib/api-client";
import { getStoredSession } from "@/lib/auth-session";
import { Alert, Badge, Box, Button, Flex, Text } from "@/lib/design-system";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function GoogleOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<ReturnType<typeof getStoredSession>>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored) {
      router.replace("/login");
    } else {
      setSession(stored);
    }

    const googleStatus = searchParams.get("google");
    if (googleStatus === "connected") {
      setConnected(true);
      checkAccount();
    } else if (googleStatus === "error") {
      setError("Não foi possível conectar o Google. Tente novamente.");
    }
  }, [router, searchParams]);

  const checkAccount = async () => {
    if (!session?.accessToken) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/integrations/google/accounts`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accounts?.[0]) {
          setAccountName(data.accounts[0].accountName ?? data.accounts[0].name);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleConnect = async () => {
    if (!session?.accessToken) return;

    try {
      setLoading(true);
      setError(null);
      const url = await buildGoogleConnectUrl(session.accessToken);
      window.location.href = `${url}&state=onboarding_google`;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erro ao conectar Google");
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace("/onboarding/instagram");
  };

  const handleContinue = () => {
    router.replace("/onboarding/instagram");
  };

  if (!session) return null;

  return (
    <Box css={{ minH: "100vh", bg: "surface.secondary", px: 4, py: 8 }}>
      <Box css={{ maxW: "600px", mx: "auto" }}>
        <Flex css={{ alignItems: "center", gap: 3, mb: 8 }}>
          <Flex css={{ display: "flex", gap: 2, flex: 1 }}>
            <Box css={{ flex: 1, h: 4, borderRadius: "full", bg: "brand.600" }} />
            <Box css={{ flex: 1, h: 4, borderRadius: "full", bg: "surface.border" }} />
            <Box css={{ flex: 1, h: 4, borderRadius: "full", bg: "surface.border" }} />
            <Box css={{ flex: 1, h: 4, borderRadius: "full", bg: "surface.border" }} />
          </Flex>
        </Flex>

        <Text fontSize="2xl" fontWeight="bold" color="text.primary" mb={2} textAlign="center">
          Passo 2 de 4 — Google Business Profile
        </Text>

        <Text
          color="text.tertiary"
          textAlign="center"
          mb={8}
          maxW="500px"
          mx="auto"
          lineHeight="relaxed"
        >
          Conecte seu perfil para acompanhar avaliações e manter sua reputação centralizada no
          Business Reputation Hub.
        </Text>

        <Box
          css={{
            bg: "surface.primary",
            border: "1px solid",
            borderColor: "surface.border",
            borderRadius: "2xl",
            boxShadow: "sm",
            p: { base: 5, md: 6 },
          }}
        >
          <Box css={{ display: "flex", alignItems: "flex-start", gap: 4, mb: 6 }}>
            <Box
              css={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                w: 12,
                h: 12,
                borderRadius: "lg",
                bg: "blue.50",
                color: "blue.600",
                flexShrink: 0,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </Box>
            <Box css={{ flex: 1 }}>
              <Text fontSize="lg" fontWeight="semibold" color="text.primary">
                Google Business Profile
              </Text>
              <Text fontSize="sm" color="text.tertiary">
                Avaliações, nota da empresa, novos feedbacks
              </Text>
            </Box>
          </Box>

          {error && (
            <Alert tone="error" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}

          {connected ? (
            <Box
              css={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                p: 4,
                bg: "status.success.bg",
                border: "1px solid",
                borderColor: "status.success.border",
                borderRadius: "lg",
              }}
            >
              <Badge variant="success" size="md" dot>
                Conectado
              </Badge>
              {accountName && (
                <Text fontSize="sm" color="text.secondary">
                  Conta: {accountName}
                </Text>
              )}
            </Box>
          ) : (
            <Button variant="solid" size="lg" w="full" onClick={handleConnect} loading={loading}>
              {loading ? "Conectando..." : "Conectar Google"}
            </Button>
          )}
        </Box>

        <Flex css={{ justifyContent: "center", gap: 3, mt: 8, flexWrap: "wrap" }}>
          <Button variant="ghost" size="md" onClick={handleSkip}>
            Pular por enquanto
          </Button>
          {connected && (
            <Button size="md" onClick={handleContinue}>
              Continuar
            </Button>
          )}
        </Flex>
      </Box>
    </Box>
  );
}
