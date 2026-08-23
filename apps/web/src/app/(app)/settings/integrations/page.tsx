"use client";

import {
  buildGoogleConnectUrl,
  buildInstagramConnectUrl,
  disconnectGoogle,
  disconnectInstagram,
  getIntegrationStatus,
} from "@/lib/api-client";
import { getStoredSession } from "@/lib/auth-session";
import {
  Box,
  Button,
  Card,
  CardBody,
  ChannelCard,
  Modal,
  PageHeader,
  Text,
  Toast,
} from "@/lib/design-system";
import { useEffect, useState } from "react";

type InstagramDisconnectChoice = "keep" | "delete" | null;

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
      setMessage({
        type: "error",
        text: "Erro ao conectar Google Business Profile. Tente novamente.",
      });
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

  const [googleAccount, setGoogleAccount] = useState<{
    name?: string | undefined;
    accountName?: string | undefined;
  } | null>(null);
  const [instagramAccount, setInstagramAccount] = useState<{
    username?: string | undefined;
  } | null>(null);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleLocationCount, setGoogleLocationCount] = useState(0);
  const [instagramLoading, setInstagramLoading] = useState(true);

  const [showInstagramDisconnectModal, setShowInstagramDisconnectModal] = useState(false);
  const [instagramDisconnectChoice, setInstagramDisconnectChoice] =
    useState<InstagramDisconnectChoice>(null);
  const [instagramDisconnectLoading, setInstagramDisconnectLoading] = useState(false);
  const [showInstagramDeleteConfirm, setShowInstagramDeleteConfirm] = useState(false);
  const [showGoogleDisconnectModal, setShowGoogleDisconnectModal] = useState(false);
  const [googleDisconnectLoading, setGoogleDisconnectLoading] = useState(false);

  useEffect(() => {
    if (session?.accessToken) {
      checkConnections();
    }
  }, [session]);

  const checkConnections = async () => {
    if (!session?.accessToken) return;

    setGoogleLoading(true);
    setInstagramLoading(true);
    try {
      const result = await getIntegrationStatus(session.accessToken);

      if (result.google.connected) {
        setGoogleAccount({
          name: result.google.accountName ?? undefined,
          accountName: result.google.accountName ?? undefined,
        });
      } else {
        setGoogleAccount(null);
      }
      setGoogleLocationCount(result.google.locationCount);

      if (result.instagram.connected) {
        setInstagramAccount({ username: result.instagram.username ?? undefined });
      } else {
        setInstagramAccount(null);
      }
    } catch {
      setGoogleAccount(null);
      setInstagramAccount(null);
      setGoogleLocationCount(0);
    } finally {
      setGoogleLoading(false);
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
        text: error instanceof Error ? error.message : "Erro ao iniciar conexão com Google",
      });
      setGoogleLoading(false);
    }
  };

  const handleGoogleDisconnectClick = () => {
    setShowGoogleDisconnectModal(true);
  };

  const handleGoogleDisconnect = async () => {
    if (!session?.accessToken) return;

    try {
      setGoogleDisconnectLoading(true);
      await disconnectGoogle({ accessToken: session.accessToken });
      setGoogleAccount(null);
      setGoogleLocationCount(0);
      setShowGoogleDisconnectModal(false);
      setMessage({ type: "success", text: "Google Business Profile desconectado com sucesso!" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao desconectar Google",
      });
    } finally {
      setGoogleDisconnectLoading(false);
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
        text: error instanceof Error ? error.message : "Erro ao iniciar conexão com Instagram",
      });
      setInstagramLoading(false);
    }
  };

  const handleInstagramDisconnectClick = () => {
    setInstagramDisconnectChoice(null);
    setShowInstagramDeleteConfirm(false);
    setShowInstagramDisconnectModal(true);
  };

  const handleInstagramDisconnect = async () => {
    if (!session?.accessToken || !instagramDisconnectChoice) return;

    try {
      setInstagramDisconnectLoading(true);
      const deleteData = instagramDisconnectChoice === "delete";
      await disconnectInstagram({
        accessToken: session.accessToken,
        deleteData,
      });
      setInstagramAccount(null);
      setShowInstagramDisconnectModal(false);
      setShowInstagramDeleteConfirm(false);
      setInstagramDisconnectChoice(null);
      setMessage({
        type: "success",
        text: deleteData
          ? "Instagram desconectado e dados excluídos com sucesso!"
          : "Instagram desconectado com sucesso!",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao desconectar Instagram",
      });
    } finally {
      setInstagramDisconnectLoading(false);
    }
  };

  const googleAccountLabel = googleAccount?.accountName ?? googleAccount?.name;
  const instagramAccountLabel = instagramAccount?.username
    ? `@${instagramAccount.username}`
    : undefined;

  return (
    <Box>
      <PageHeader
        eyebrow="Configurações"
        title="Integrações"
        description="Conecte os canais que fazem parte da reputação digital da sua empresa."
      />

      {message && (
        <Toast tone={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Toast>
      )}

      <Card variant="default" padding="none">
        <CardBody css={{ p: 0 }}>
          <Box css={{ p: 5, borderBottom: "1px solid", borderColor: "surface.border" }}>
            <Text css={{ fontSize: "sm", fontWeight: "semibold" }}>Canais</Text>
            <Text css={{ mt: 1, fontSize: "xs", color: "text.tertiary" }}>
              Conexões ativas e disponíveis para este workspace.
            </Text>
          </Box>
          <Box css={{ p: 5, borderBottom: "1px solid", borderColor: "surface.border" }}>
            <ChannelCard
              provider="google"
              title="Google Business Profile"
              description="Conecte sua conta para monitorar avaliações, responder clientes e acompanhar a reputação da sua empresa no Google Maps e Busca."
              status={googleAccount ? "connected" : "disconnected"}
              accountLabel={googleAccountLabel}
              subtitle={
                googleAccount
                  ? `${googleLocationCount} ${googleLocationCount === 1 ? "empresa disponível" : "empresas disponíveis"}`
                  : undefined
              }
              onConnect={handleGoogleConnect}
              onDisconnectClick={handleGoogleDisconnectClick}
              isLoading={googleLoading}
              disabled={googleLoading}
            />
          </Box>

          <Box css={{ p: 5, borderBottom: "1px solid", borderColor: "surface.border" }}>
            <ChannelCard
              provider="instagram"
              title="Instagram"
              description="Conecte sua conta profissional (Business ou Creator) para centralizar comentários e mensagens diretas do Instagram."
              status={instagramAccount ? "connected" : "disconnected"}
              accountLabel={instagramAccountLabel}
              subtitle={instagramAccount ? "Conta conectada" : undefined}
              onConnect={handleInstagramConnect}
              onDisconnectClick={handleInstagramDisconnectClick}
              isLoading={instagramLoading}
              disabled={instagramLoading}
            />
          </Box>

          <Box css={{ p: 5, opacity: 0.72 }}>
            <ChannelCard
              provider="facebook"
              title="Facebook"
              description="Em breve: conecte sua página do Facebook para gerenciar comentários e mensagens do Messenger."
              status="disconnected"
              comingSoon
            />
          </Box>
        </CardBody>
      </Card>

      <Modal
        isOpen={showGoogleDisconnectModal}
        onClose={() => setShowGoogleDisconnectModal(false)}
        title="Desconectar Google Business Profile"
        description="Ao continuar, o Business Reputation Hub perderá acesso ao seu Perfil da Empresa no Google e os dados obtidos através dessa integração serão removidos do BRH. Esta ação é permanente para os dados armazenados pelo BRH. Para voltar a utilizar a integração será necessário conectar sua conta Google novamente."
        size="md"
        actionButtons={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGoogleDisconnectModal(false)}
              disabled={googleDisconnectLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="solid"
              colorScheme="red"
              size="sm"
              onClick={handleGoogleDisconnect}
              loading={googleDisconnectLoading}
            >
              Desconectar e excluir dados
            </Button>
          </>
        }
      >
        <Box />
      </Modal>

      <Modal
        isOpen={showInstagramDisconnectModal}
        onClose={() => {
          setShowInstagramDisconnectModal(false);
          setShowInstagramDeleteConfirm(false);
          setInstagramDisconnectChoice(null);
        }}
        title="Desconectar Instagram"
        {...(instagramAccountLabel
          ? {
              description: `A conexão com ${instagramAccountLabel} será removida e o BRH deixará de receber novos comentários e mensagens desta conta.`,
            }
          : {})}
        size="md"
        actionButtons={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowInstagramDisconnectModal(false);
                setShowInstagramDeleteConfirm(false);
                setInstagramDisconnectChoice(null);
              }}
              disabled={instagramDisconnectLoading}
            >
              Cancelar
            </Button>
            {instagramDisconnectChoice === "delete" && !showInstagramDeleteConfirm ? (
              <Button
                variant="solid"
                colorScheme="red"
                size="sm"
                onClick={() => setShowInstagramDeleteConfirm(true)}
                disabled={instagramDisconnectLoading}
              >
                Desconectar
              </Button>
            ) : (
              <Button
                variant="solid"
                colorScheme="brand"
                size="sm"
                onClick={handleInstagramDisconnect}
                disabled={instagramDisconnectLoading || !instagramDisconnectChoice}
                loading={instagramDisconnectLoading}
              >
                Desconectar
              </Button>
            )}
          </>
        }
      >
        <Box css={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Text css={{ fontSize: "sm", color: "text.secondary", mb: 2 }}>
            Escolha o que deseja fazer com os dados já coletados.
          </Text>
          <Box
            css={{
              display: "flex",
              alignItems: "flex-start",
              gap: 3,
              p: 3,
              borderRadius: "lg",
              border: "2px solid",
              borderColor: instagramDisconnectChoice === "keep" ? "brand.600" : "surface.border",
              bg: instagramDisconnectChoice === "keep" ? "brand.50" : "transparent",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onClick={() => {
              setInstagramDisconnectChoice("keep");
              setShowInstagramDeleteConfirm(false);
            }}
          >
            <Box
              css={{
                w: 5,
                h: 5,
                borderRadius: "full",
                border: "2px solid",
                borderColor: instagramDisconnectChoice === "keep" ? "brand.600" : "surface.border",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                mt: 0.5,
              }}
            >
              {instagramDisconnectChoice === "keep" && (
                <Box css={{ w: 2.5, h: 2.5, borderRadius: "full", bg: "brand.600" }} />
              )}
            </Box>
            <Box>
              <Text css={{ fontWeight: "medium", fontSize: "sm", color: "text.primary" }}>
                Manter dados existentes
              </Text>
              <Text css={{ fontSize: "xs", color: "text.tertiary", mt: 1, lineHeight: "normal" }}>
                Comentários, mensagens e histórico já recebidos continuarão disponíveis no BRH.
              </Text>
            </Box>
          </Box>
          <Box
            css={{
              display: "flex",
              alignItems: "flex-start",
              gap: 3,
              p: 3,
              borderRadius: "lg",
              border: "2px solid",
              borderColor: instagramDisconnectChoice === "delete" ? "red.600" : "surface.border",
              bg: instagramDisconnectChoice === "delete" ? "red.50" : "transparent",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onClick={() => {
              setInstagramDisconnectChoice("delete");
              if (!showInstagramDeleteConfirm) {
                setShowInstagramDeleteConfirm(true);
              }
            }}
          >
            <Box
              css={{
                w: 5,
                h: 5,
                borderRadius: "full",
                border: "2px solid",
                borderColor: instagramDisconnectChoice === "delete" ? "red.600" : "surface.border",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                mt: 0.5,
              }}
            >
              {instagramDisconnectChoice === "delete" && (
                <Box css={{ w: 2.5, h: 2.5, borderRadius: "full", bg: "red.600" }} />
              )}
            </Box>
            <Box>
              <Text
                css={{
                  fontWeight: "medium",
                  fontSize: "sm",
                  color:
                    instagramDisconnectChoice === "delete" ? "status.error.text" : "text.primary",
                }}
              >
                Excluir dados da integração
              </Text>
              <Text css={{ fontSize: "xs", color: "text.tertiary", mt: 1, lineHeight: "normal" }}>
                Comentários, mensagens e demais dados associados a esta conta serão excluídos
                permanentemente.
              </Text>
            </Box>
          </Box>
          {showInstagramDeleteConfirm && instagramDisconnectChoice === "delete" && (
            <Box
              css={{
                p: 3,
                borderRadius: "lg",
                bg: "red.50",
                border: "1px solid",
                borderColor: "red.200",
              }}
            >
              <Text css={{ fontSize: "xs", color: "status.error.text", fontWeight: "medium" }}>
                Esta ação excluirá permanentemente os dados coletados desta conta Instagram no
                Business Reputation Hub.
              </Text>
            </Box>
          )}
        </Box>
      </Modal>
    </Box>
  );
}
