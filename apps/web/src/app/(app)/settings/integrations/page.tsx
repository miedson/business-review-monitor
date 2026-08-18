"use client";

import { useEffect, useState } from "react";
import { getStoredSession } from "@/lib/auth-session";
import {
  buildGoogleConnectUrl,
  disconnectGoogle,
  buildInstagramConnectUrl,
  disconnectInstagram,
  listGoogleAccounts,
  listInstagramAccounts,
} from "@/lib/api-client";
import { Box, Text, Alert, ChannelCard } from "@/lib/design-system";

export default function IntegrationsPage() {
  const [session, setSession] = useState<ReturnType<typeof getStoredSession>>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setSession(getStoredSession());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleStatus = params.get("google");
    const instagramStatus = params.get("instagram");

    if (googleStatus === "connected") {
      setMessage({ type: "success", text: "Google Business Profile conectado com sucesso!" });
      window.history.replaceState({}, "", "/settings/integrations");
    } else if (googleStatus === "error") {
      setMessage({ type: "error", text: "Erro ao conectar Google Business Profile. Tente novamente." });
      window.history.replaceState({}, "", "/settings/integrations");
    }

    if (instagramStatus === "connected") {
      setMessage({ type: "success", text: "Instagram conectado com sucesso!" });
      window.history.replaceState({}, "", "/settings/integrations");
    } else if (instagramStatus === "error") {
      setMessage({ type: "error", text: "Erro ao conectar Instagram. Tente novamente." });
      window.history.replaceState({}, "", "/settings/integrations");
    }
  }, []);

  const [googleAccount, setGoogleAccount] = useState<{ name?: string | undefined; accountName?: string | undefined } | null>(null);
  const [instagramAccount, setInstagramAccount] = useState<{ username?: string | undefined } | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [instagramLoading, setInstagramLoading] = useState(false);

  useEffect(() => {
    if (session?.accessToken) {
      checkConnections();
    }
  }, [session]);

  const checkConnections = async () => {
    if (!session?.accessToken) return;

    try {
      setGoogleLoading(true);
      const googleResult = await listGoogleAccounts(session.accessToken);
      const firstGoogleAccount = googleResult.accounts[0];
      if (firstGoogleAccount) {
        setGoogleAccount({ name: firstGoogleAccount.name, accountName: firstGoogleAccount.accountName ?? undefined });
      }
    } catch {
      setGoogleAccount(null);
    } finally {
      setGoogleLoading(false);
    }

    try {
      setInstagramLoading(true);
      const instagramResult = await listInstagramAccounts(session.accessToken);
      const firstInstagramAccount = instagramResult.accounts[0];
      if (firstInstagramAccount) {
        setInstagramAccount({ username: firstInstagramAccount.username });
      }
    } catch {
      setInstagramAccount(null);
    } finally {
      setInstagramLoading(false);
    }
  };

  const handleGoogleConnect = async () => {
    if (!session?.accessToken) return;

    try {
      setGoogleLoading(true);
      const url = await buildGoogleConnectUrl(session.accessToken);
      window.location.href = url;
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao iniciar conexão com Google"
      });
      setGoogleLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!session?.accessToken) return;

    try {
      setGoogleLoading(true);
      await disconnectGoogle({ accessToken: session.accessToken });
      setGoogleAccount(null);
      setMessage({ type: "success", text: "Google Business Profile desconectado com sucesso!" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao desconectar Google"
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleInstagramConnect = async () => {
    if (!session?.accessToken) return;

    try {
      setInstagramLoading(true);
      const url = await buildInstagramConnectUrl(session.accessToken);
      window.location.href = url;
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao iniciar conexão com Instagram"
      });
      setInstagramLoading(false);
    }
  };

  const handleInstagramDisconnect = async () => {
    if (!session?.accessToken) return;

    try {
      setInstagramLoading(true);
      await disconnectInstagram({ accessToken: session.accessToken });
      setInstagramAccount(null);
      setMessage({ type: "success", text: "Instagram desconectado com sucesso!" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao desconectar Instagram"
      });
    } finally {
      setInstagramLoading(false);
    }
  };

  const googleAccountLabel = googleAccount?.accountName ?? googleAccount?.name;
  const instagramAccountLabel = instagramAccount?.username ? `@${instagramAccount.username}` : undefined;

  return (
    <Box>
      <Box css={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 6, flexWrap: "wrap", gap: 3 }}>
        <Text fontSize="2xl" fontWeight="bold" color="text.primary">
          Integrações
        </Text>
      </Box>

      {message && (
        <Alert tone={message.type === "success" ? "success" : "error"} onClose={() => setMessage(null)} dismissible>
          {message.text}
        </Alert>
      )}

      <Box css={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <ChannelCard
          provider="google"
          title="Google Business Profile"
          description="Conecte sua conta para monitorar avaliações, responder clientes e acompanhar a reputação da sua empresa no Google Maps e Busca."
          status={googleAccount ? "connected" : "disconnected"}
          accountLabel={googleAccountLabel}
          subtitle={googleAccount ? "Conta conectada" : undefined}
          onConnect={handleGoogleConnect}
          onDisconnect={handleGoogleDisconnect}
          isLoading={googleLoading}
          disabled={googleLoading}
        />

        <ChannelCard
          provider="instagram"
          title="Instagram"
          description="Conecte sua conta profissional (Business ou Creator) para centralizar comentários e mensagens diretas do Instagram."
          status={instagramAccount ? "connected" : "disconnected"}
          accountLabel={instagramAccountLabel}
          subtitle={instagramAccount ? "Conta conectada" : undefined}
          onConnect={handleInstagramConnect}
          onDisconnect={handleInstagramDisconnect}
          isLoading={instagramLoading}
          disabled={instagramLoading}
        />

        <ChannelCard
          provider="facebook"
          title="Facebook"
          description="Em breve: conecte sua página do Facebook para gerenciar comentários e mensagens do Messenger."
          status="disconnected"
          comingSoon
        />
      </Box>
    </Box>
  );
}