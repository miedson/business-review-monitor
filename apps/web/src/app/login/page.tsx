"use client";

import {
  Box,
  Button,
  Input,
  Alert,
  Text,
  Flex,
  Link as ChakraLink,
  Heading,
} from "@/lib/design-system";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState, useEffect } from "react";
import { unstable_noStore } from "next/cache";

import { login } from "@/lib/api-client";
import { storeSession, getStoredSession } from "@/lib/auth-session";

const pageBackgroundCss = {
  minH: "100vh",
  bg: "surface.secondary",
  backgroundImage:
    "radial-gradient(ellipse at top, rgba(16,185,137,0.035) 0%, transparent 55%), radial-gradient(ellipse at bottom, rgba(56,182,191,0.025) 0%, transparent 55%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  px: 4,
  py: 8,
};

const cardCss = {
  w: "full",
  maxW: "440px",
  bg: "surface.primary",
  borderRadius: "2xl",
  boxShadow: "xl",
  position: "relative",
  overflow: "hidden",
  p: 10,
};

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
      <Box css={pageBackgroundCss}>
        <Box
          css={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Text color="text.secondary">Carregando...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box css={pageBackgroundCss}>
      <Box css={cardCss}>
        <Box css={{ textAlign: "center", mb: 8 }}>
          <Box
            css={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              w: 16,
              h: 16,
              borderRadius: "full",
              backgroundImage:
                "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              fontWeight: "bold",
              fontSize: "2xl",
              mb: 4,
              boxShadow: "lg",
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

        <Heading as="h1" fontSize="lg" fontWeight="semibold" color="text.primary" mb={1}>
          Entrar na sua conta
        </Heading>
        <Text color="text.tertiary" fontSize="sm" mb={6} lineHeight="relaxed">
          Acesse para gerenciar suas integrações e avaliações.
        </Text>

        <form onSubmit={handleSubmit}>
          {errorMessage && (
            <Alert
              tone="error"
              onClose={() => setErrorMessage(null)}
              dismissible
              mb={5}
            >
              {errorMessage}
            </Alert>
          )}

          <Box
            css={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              mb: 6,
            }}
          >
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

          <Flex
            css={{
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Text color="text.tertiary" fontSize="sm">
              Ainda não tem conta?
            </Text>
            <ChakraLink asChild>
              <NextLink href="/register" passHref>
                <Text
                  as="span"
                  color="brand.600"
                  fontSize="sm"
                  fontWeight="semibold"
                  cursor="pointer"
                  _hover={{ textDecoration: "underline" }}
                >
                  Criar conta
                </Text>
              </NextLink>
            </ChakraLink>
          </Flex>
        </form>

        <Text fontSize="xs" color="text.quaternary" textAlign="center">
          © {new Date().getFullYear()} Business Reputation Hub
        </Text>
      </Box>
    </Box>
  );
}
