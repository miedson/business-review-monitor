"use client";

import { Box, Button, Input, Alert, Text, Flex, Link as ChakraLink } from "@/lib/design-system";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState, useEffect } from "react";
import { unstable_noStore } from "next/cache";

import { login } from "@/lib/api-client";
import { storeSession, getStoredSession } from "@/lib/auth-session";

export default function LoginPage() {
  unstable_noStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      const redirectTo = searchParams.get("next") || "/dashboard";
      router.replace(redirectTo);
    } else {
      setIsCheckingAuth(false);
    }
  }, [router, searchParams]);

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await login({ email, password });
      storeSession({ accessToken: result.accessToken, user: result.user });
      const redirectTo = searchParams.get("next") || "/dashboard";
      router.replace(redirectTo);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível entrar."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingAuth) {
    return (
      <Box
        css={{
          minH: "100vh",
          bg: "surface.secondary",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 4,
          py: 8,
        }}
      >
        <Box css={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Text>Carregando...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      css={{
        minH: "100vh",
        bg: "surface.secondary",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 4,
        py: 8,
      }}
    >
      <Box
        css={{
          w: "full",
          maxW: "420px",
          bg: "surface.primary",
          border: "1px solid",
          borderColor: "surface.border",
          borderRadius: "2xl",
          boxShadow: "sm",
          p: 8,
        }}
      >
        <Box css={{ textAlign: "center", mb: 6 }}>
          <Box
            css={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              w: 12,
              h: 12,
              borderRadius: "xl",
              bg: "brand.600",
              color: "white",
              fontWeight: "bold",
              fontSize: "2xl",
              mb: 4,
            }}
          >
            BRH
          </Box>
          <Text fontSize="2xl" fontWeight="semibold" color="text.primary">
            Business Reputation Hub
          </Text>
          <Text mt={2} color="text.tertiary" fontSize="sm">
            Centralize sua reputação digital
          </Text>
        </Box>

        <Text fontSize="lg" fontWeight="semibold" color="text.primary" mb={1}>
          Entrar na sua conta
        </Text>
        <Text color="text.tertiary" fontSize="sm" mb={6}>
          Acesse para gerenciar suas integrações e avaliações.
        </Text>

        <form onSubmit={handleSubmit}>
          {errorMessage && (
            <Alert tone="error" onClose={() => setErrorMessage(null)} dismissible mb={5}>
              {errorMessage}
            </Alert>
          )}

          <Box css={{ display: "flex", flexDirection: "column", gap: 6, mb: 6 }}>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Senha"
              type="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              showPasswordToggle
            />
          </Box>

          <Button
            type="submit"
            w="full"
            size="lg"
            loading={isSubmitting}
            mb={6}
          >
            Entrar
          </Button>

          <Flex css={{ justifyContent: "center", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Text color="text.tertiary" fontSize="sm">
              Ainda não tem conta?
            </Text>
            <ChakraLink asChild>
              <NextLink href="/register" passHref style={{ textDecoration: "none" }}>
                <Text color="brand.600" fontSize="sm" fontWeight="semibold" cursor="pointer" _hover={{ textDecoration: "underline" }}>
                  Criar conta
                </Text>
              </NextLink>
            </ChakraLink>
          </Flex>
        </form>
      </Box>
    </Box>
  );
}