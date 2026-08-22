"use client";

import { Box, Text, Button, Badge, ConfirmDialog } from "@/lib/design-system";
import type { ReactNode } from "react";
import { forwardRef, useState } from "react";

type ChannelProvider = "google" | "instagram" | "facebook";

interface ChannelCardProps {
  provider: ChannelProvider;
  title: string;
  description: string;
  status: "connected" | "disconnected" | "connecting" | "error";
  accountLabel?: string | undefined;
  subtitle?: string | undefined;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onManage?: () => void;
  isLoading?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  comingSoon?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onDisconnectClick?: () => void;
}

const providerConfig: Record<ChannelProvider, { icon: ReactNode; color: string; background: string; foreground: string }> = {
  google: {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
    color: "blue", background: "#e8f0fe", foreground: "#1a73e8",
  },
  instagram: {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
    color: "pink", background: "#fce7ef", foreground: "#c13584",
  },
  facebook: {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    color: "blue", background: "#e7f0fd", foreground: "#1877f2",
  },
};

const statusVariants: Record<string, string> = {
  connected: "success",
  disconnected: "default",
  connecting: "info",
  error: "warning",
};

const statusLabels: Record<string, string> = {
  connected: "Conectado",
  disconnected: "Desconectado",
  connecting: "Conectando...",
  error: "Erro",
};

const ChannelCard = forwardRef<HTMLDivElement, ChannelCardProps>(
  (
    {
      provider,
      title,
      description,
      status,
      accountLabel,
      subtitle,
      onConnect,
      onDisconnect,
      onManage,
      isLoading,
      errorMessage,
      disabled,
      comingSoon,
      className,
      style,
      onDisconnectClick,
    },
    ref
  ) => {
    const { icon, background, foreground } = providerConfig[provider];
    const isConnected = status === "connected";
    const isConnecting = status === "connecting" || (isLoading ?? false);

    const [showDisconnectModal, setShowDisconnectModal] = useState(false);

    const handleDisconnect = () => {
      if (onDisconnectClick) {
        onDisconnectClick();
        return;
      }
      if (onDisconnect) {
        setShowDisconnectModal(true);
      }
    };

    return (
      <>
        <Box
          ref={ref}
          css={{
            display: "flex",
            flexDirection: "column",
            height: "full",
            ...style,
          }}
          className={className}
        >
          <Box css={{ display: "flex", alignItems: "flex-start", gap: 3, width: "full", flexWrap: "wrap" }}>
            <Box
              css={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                w: 8,
                h: 8,
                borderRadius: "md",
                flexShrink: 0,
                bg: background,
                color: foreground,
              }}
            >
              {icon}
            </Box>
            <Box css={{ flex: 1, minWidth: 0 }}>
              <Box css={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <Text css={{ fontSize: "sm", fontWeight: "semibold", color: "text.primary", lineHeight: "snug" }}>
                  {title}
                </Text>
                <Badge variant="subtle" colorScheme={statusVariants[status] as "success" | "default" | "info" | "warning"} size="sm">
                  {statusLabels[status]}
                </Badge>
                {accountLabel && <Badge variant="subtle" colorScheme="slate" size="sm">{accountLabel}</Badge>}
              </Box>
              {subtitle && <Text css={{ fontSize: "xs", color: "text.tertiary", lineHeight: "normal", mt: 1 }}>{subtitle}</Text>}
            </Box>
            {
                isConnected ? (
                <>
                  {onManage && <Button variant="ghost" size="sm" onClick={onManage}>Gerenciar</Button>}
                  <Button variant="outline" size="sm" onClick={handleDisconnect} colorScheme="red">
                    Desconectar
                  </Button>
                </>
              ) : !comingSoon && (
                <Button
                  variant="solid"
                  size="sm"
                  onClick={onConnect}
                  loading={isConnecting}
                  disabled={(disabled ?? false) || isConnecting}
                >
                  {isConnecting ? "Conectando..." : `Conectar`}
                </Button>
              )
            }
          </Box>

          <Box css={{ flex: 1, ml: { base: 0, md: 11 }, mt: 2 }}>
            <Text css={{ fontSize: "sm", color: "text.tertiary", lineHeight: "normal", margin: 0 }}>
              {description}
            </Text>
            {errorMessage && (
              <Text css={{ fontSize: "xs", color: "status.error.text", mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
                {errorMessage}
              </Text>
            )}
          </Box>

          {comingSoon && <Text css={{ mt: 2, ml: { base: 0, md: 11 }, fontSize: "xs", color: "text.quaternary" }}>Em breve</Text>}
        </Box>

        <ConfirmDialog
          isOpen={showDisconnectModal}
          onClose={() => setShowDisconnectModal(false)}
          onConfirm={() => {
            onDisconnect?.();
            setShowDisconnectModal(false);
          }}
          title={`Desconectar ${title}?`}
          message={`Você deixará de receber novas interações deste canal. Tem certeza que deseja continuar?`}
          confirmLabel="Desconectar"
          cancelLabel="Cancelar"
          variant="danger"
        />
      </>
    );
  }
);

ChannelCard.displayName = "ChannelCard";

export { ChannelCard, type ChannelCardProps, type ChannelProvider };
