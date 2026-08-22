"use client";

import { buildInstagramConnectUrl } from "@/lib/api-client";
import { getStoredSession } from "@/lib/auth-session";
import { Alert, Badge, Box, Button, Flex, Text } from "@/lib/design-system";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function InstagramOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<ReturnType<typeof getStoredSession>>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored) {
      router.replace("/login");
    } else {
      setSession(stored);
    }

    const instagramStatus = searchParams.get("instagram");
    if (instagramStatus === "connected") {
      setConnected(true);
      checkAccount();
    } else if (instagramStatus === "error") {
      setError("Não foi possível conectar o Instagram. Tente novamente.");
    }
  }, [router, searchParams]);

  const checkAccount = async () => {
    if (!session?.accessToken) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/integrations/instagram/accounts`,
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.accounts?.[0]) {
          setUsername(data.accounts[0].username);
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
      const url = await buildInstagramConnectUrl(session.accessToken);
      window.location.href = `${url}&state=onboarding_instagram`;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erro ao conectar Instagram");
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace("/onboarding/complete");
  };

  const handleContinue = () => {
    router.replace("/onboarding/complete");
  };

  if (!session) return null;

  return (
    <Box css={{ minH: "100vh", bg: "surface.secondary", px: 4, py: 8 }}>
      <Box css={{ maxW: "600px", mx: "auto" }}>
        <Flex css={{ alignItems: "center", gap: 3, mb: 8 }}>
          <Flex css={{ display: "flex", gap: 2, flex: 1 }}>
            <Box css={{ flex: 1, h: 4, borderRadius: "full", bg: "brand.600" }} />
            <Box css={{ flex: 1, h: 4, borderRadius: "full", bg: "brand.600" }} />
            <Box css={{ flex: 1, h: 4, borderRadius: "full", bg: "surface.border" }} />
            <Box css={{ flex: 1, h: 4, borderRadius: "full", bg: "surface.border" }} />
          </Flex>
        </Flex>

        <Text fontSize="2xl" fontWeight="bold" color="text.primary" mb={2} textAlign="center">
          Passo 3 de 4 — Instagram
        </Text>

        <Text
          color="text.tertiary"
          textAlign="center"
          mb={8}
          maxW="500px"
          mx="auto"
          lineHeight="relaxed"
        >
          Conecte sua conta profissional para centralizar comentários e mensagens diretas.
          <br />
          <Text fontWeight="medium" color="text.secondary">
            É necessário utilizar uma conta profissional Business ou Creator.
          </Text>
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
                bg: "pink.50",
                color: "pink.600",
                flexShrink: 0,
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </Box>
            <Box css={{ flex: 1 }}>
              <Text fontSize="lg" fontWeight="semibold" color="text.primary">
                Instagram
              </Text>
              <Text fontSize="sm" color="text.tertiary">
                Comentários, mensagens diretas, menções
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
              {username && (
                <Text fontSize="sm" color="text.secondary">
                  @{username}
                </Text>
              )}
            </Box>
          ) : (
            <Button variant="solid" size="lg" w="full" onClick={handleConnect} loading={loading}>
              {loading ? "Conectando..." : "Conectar Instagram"}
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
