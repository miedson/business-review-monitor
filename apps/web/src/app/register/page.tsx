"use client";

import { Box, Button, Field, Input, Link, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { register } from "../../lib/api-client";
import { storeSession } from "../../lib/auth-session";
import { AuthShell } from "../auth-shell";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await register({ email, name, password });
      storeSession({ accessToken: result.accessToken, user: result.user });
      router.replace("/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Nao foi possivel criar sua conta."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      subtitle="Crie uma conta para conectar o Google Business Profile e escolher a empresa que deseja monitorar."
      title="Comece em poucos passos"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap={4}>
          <Field.Root required>
            <Field.Label>Nome</Field.Label>
            <Input
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome"
              value={name}
            />
          </Field.Root>

          <Field.Root required>
            <Field.Label>Email</Field.Label>
            <Input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@empresa.com"
              type="email"
              value={email}
            />
          </Field.Root>

          <Field.Root required>
            <Field.Label>Senha</Field.Label>
            <Input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimo de 8 caracteres"
              type="password"
              value={password}
            />
          </Field.Root>

          {errorMessage ? (
            <Box bg="#fff7ed" border="1px solid #fdba74" borderRadius="8px" p={3}>
              <Text color="#9a3412" fontSize="sm">
                {errorMessage}
              </Text>
            </Box>
          ) : null}

          <Button
            bg="#193b3f"
            color="white"
            loading={isSubmitting}
            minH="44px"
            type="submit"
            _hover={{ bg: "#102b2f" }}
          >
            Criar conta
          </Button>

          <Text color="#607076" fontSize="sm" textAlign="center">
            Ja tem conta?{" "}
            <Link asChild color="#176f73" fontWeight="700">
              <NextLink href="/login">Entrar</NextLink>
            </Link>
          </Text>
        </Stack>
      </form>
    </AuthShell>
  );
}
