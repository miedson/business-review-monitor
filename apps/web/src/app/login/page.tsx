"use client";

import { Box, Button, Input, Alert, Text, Flex, Link as ChakraLink } from "@/lib/design-system";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { login } from "@/lib/api-client";
import { storeSession } from "@/lib/auth-session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await login({ email, password });
      storeSession({ accessToken: result.accessToken, user: result.user });
      router.replace("/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Não foi possível entrar."
      );
    } finally {
      setIsSubmitting(false);
    }
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
          borderRadius: "xl",
          boxShadow: "lg",
          p: 8,
        }}
      >
        <Box css={{ textAlign: "center", mb: 8 }}>
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
            <Alert tone="error" onClose={() => setErrorMessage(null)} dismissible>
              {errorMessage}
            </Alert>
          )}

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="voce@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            mb={4}
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
            mb={4}
          />

          <Button
            type="submit"
            w="full"
            size="lg"
            loading={isSubmitting}
            mb={6}
          >
            Entrar
          </Button>

          <Flex css={{ justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
            <Text color="text.tertiary" fontSize="sm">
              Ainda não tem conta?
            </Text>
            <ChakraLink asChild>
              <NextLink href="/register">
                <Button variant="ghost" size="sm" fontWeight="semibold">
                  Criar conta
                </Button>
              </NextLink>
            </ChakraLink>
          </Flex>
        </form>
      </Box>
    </Box>
  );
}