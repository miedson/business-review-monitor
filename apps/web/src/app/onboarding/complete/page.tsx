"use client";

import { getStoredSession } from "@/lib/auth-session";
import { Badge, Box, Button, Flex, Text } from "@/lib/design-system";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OnboardingCompletePage() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof getStoredSession>>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [googleAccount, setGoogleAccount] = useState<string | null>(null);
  const [instagramAccount, setInstagramAccount] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored) {
      router.replace("/login");
    } else {
      setSession(stored);
    }
  }, [router]);

  useEffect(() => {
    if (!session?.accessToken) return;

    checkConnections();
  }, [session]);

  const checkConnections = async () => {
    if (!session?.accessToken) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/integrations/google/accounts`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accounts?.[0]) {
          setGoogleConnected(true);
          setGoogleAccount(data.accounts[0].accountName ?? data.accounts[0].name);
        }
      }
    } catch {
      // ignore
    }

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
          setInstagramConnected(true);
          setInstagramAccount(data.accounts[0].username);
        }
      }
    } catch {
      // ignore
    }
  };

  if (!session) return null;

  const anyConnected = googleConnected || instagramConnected;

  return (
    <Box css={{ minH: "100vh", bg: "surface.secondary", px: 4, py: 8 }}>
      <Box css={{ maxW: "600px", mx: "auto", textAlign: "center" }}>
        <Flex css={{ alignItems: "center", gap: 3, mb: 8 }}>
          <Flex css={{ display: "flex", gap: 2, flex: 1 }}>
            <Box css={{ flex: 1, h: 4, borderRadius: "full", bg: "brand.600" }} />
            <Box css={{ flex: 1, h: 4, borderRadius: "full", bg: "brand.600" }} />
            <Box css={{ flex: 1, h: 4, borderRadius: "full", bg: "brand.600" }} />
            <Box css={{ flex: 1, h: 4, borderRadius: "full", bg: "brand.600" }} />
          </Flex>
        </Flex>

        <Box
          css={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            w: 16,
            h: 16,
            borderRadius: "full",
            bg: "status.success.bg",
            color: "status.success.icon",
            mb: 6,
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </Box>

        <Text fontSize="3xl" fontWeight="bold" color="text.primary" mb={4} lineHeight="snug">
          Seu Business Reputation Hub está pronto
        </Text>

        <Text
          fontSize="lg"
          color="text.tertiary"
          mb={8}
          maxW="500px"
          mx="auto"
          lineHeight="relaxed"
        >
          {anyConnected
            ? "Suas contas foram conectadas com sucesso. Agora você pode acompanhar sua reputação em um único lugar."
            : "Você pode conectar seus canais quando quiser em Integrações."}
        </Text>

        <Box
          css={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            mb: 8,
            maxW: "400px",
            mx: "auto",
            textAlign: "left",
          }}
        >
          <Box
            css={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              p: 4,
              bg: "surface.primary",
              border: "1px solid",
              borderColor: googleConnected ? "status.success.border" : "surface.border",
              borderRadius: "2xl",
            }}
          >
            <Box
              css={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                w: 10,
                h: 10,
                borderRadius: "md",
                bg: googleConnected ? "status.success.bg" : "surface.tertiary",
                color: googleConnected ? "status.success.icon" : "text.quaternary",
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
            <Box css={{ flex: 1, textAlign: "left" }}>
              <Text fontWeight="semibold" color="text.primary">
                Google Business Profile
              </Text>
              {googleConnected ? (
                <Flex css={{ alignItems: "center", gap: 2 }}>
                  <Badge variant="success" size="sm">
                    Conectado
                  </Badge>
                  {googleAccount && (
                    <Text fontSize="sm" color="text.tertiary">
                      {googleAccount}
                    </Text>
                  )}
                </Flex>
              ) : (
                <Badge variant="subtle" colorScheme="gray" size="sm">
                  Não conectado
                </Badge>
              )}
            </Box>
          </Box>

          <Box
            css={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              p: 4,
              bg: "surface.primary",
              border: "1px solid",
              borderColor: instagramConnected ? "status.success.border" : "surface.border",
              borderRadius: "2xl",
            }}
          >
            <Box
              css={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                w: 10,
                h: 10,
                borderRadius: "md",
                bg: instagramConnected ? "status.success.bg" : "surface.tertiary",
                color: instagramConnected ? "status.success.icon" : "text.quaternary",
                flexShrink: 0,
              }}
            >
              <svg
                width="20"
                height="20"
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
            <Box css={{ flex: 1, textAlign: "left" }}>
              <Text fontWeight="semibold" color="text.primary">
                Instagram
              </Text>
              {instagramConnected ? (
                <Flex css={{ alignItems: "center", gap: 2 }}>
                  <Badge variant="success" size="sm">
                    Conectado
                  </Badge>
                  {instagramAccount && (
                    <Text fontSize="sm" color="text.tertiary">
                      @{instagramAccount}
                    </Text>
                  )}
                </Flex>
              ) : (
                <Badge variant="subtle" colorScheme="gray" size="sm">
                  Não conectado
                </Badge>
              )}
            </Box>
          </Box>

          <Box
            css={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              p: 4,
              bg: "surface.primary",
              border: "1px solid",
              borderColor: "surface.border",
              borderRadius: "2xl",
              opacity: 0.5,
            }}
          >
            <Box
              css={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                w: 10,
                h: 10,
                borderRadius: "md",
                bg: "surface.tertiary",
                color: "text.quaternary",
                flexShrink: 0,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </Box>
            <Box css={{ flex: 1, textAlign: "left" }}>
              <Text fontWeight="semibold" color="text.quaternary">
                Facebook
              </Text>
              <Badge variant="subtle" colorScheme="amber" size="sm">
                Em breve
              </Badge>
            </Box>
          </Box>
        </Box>

        <Button size="lg" onClick={() => router.replace("/dashboard")}>
          Ir para o dashboard
        </Button>
      </Box>
    </Box>
  );
}
