"use client";

import {
  AppBrand,
  Avatar,
  AvatarFallback,
  Box,
  Flex,
  Link,
  Menu,
  MenuContent,
  MenuItem,
  MenuPositioner,
  MenuSeparator,
  MenuTrigger,
  Text,
} from "@/lib/design-system";
import type { ChannelProvider } from "@/lib/design-system";
import {
  Camera,
  ChevronDown,
  Home,
  Inbox,
  LogOut,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Settings,
  Star,
  Zap,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { forwardRef, useEffect, useState } from "react";

const primaryItems = [
  ["/dashboard", "Visão geral", Home],
  ["/reviews", "Avaliações", Star],
] as const;
const instagramItems = [
  ["/instagram/comments", "Comentários", MessageSquareText],
  ["/inbox", "Direct", Inbox],
  ["/automations", "Automações", Zap],
] as const;
const settingsItems = [
  ["/settings", "Geral", Settings],
  ["/settings/integrations", "Integrações", Plug],
] as const;
type NavigationEntry = readonly [string, string, typeof Camera];
export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  userInitials: string;
  connectedProviders: ChannelProvider[];
  onSignOut: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
  (
    { onClose, userName, userEmail, userInitials, onSignOut, collapsed = false, onToggleCollapsed },
    ref,
  ) => {
    const pathname = usePathname();
    const instagramActive =
      pathname.startsWith("/instagram/comments") || pathname.startsWith("/inbox");
    const [instagramOpen, setInstagramOpen] = useState(instagramActive);
    const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith("/settings"));
    useEffect(() => {
      if (instagramActive) setInstagramOpen(true);
    }, [instagramActive]);
    useEffect(() => {
      if (pathname.startsWith("/settings")) setSettingsOpen(true);
    }, [pathname]);
    const item = (active: boolean) => ({
      display: "flex",
      alignItems: "center",
      gap: 2.5,
      px: 2.5,
      py: 2,
      borderRadius: "md",
      fontSize: "sm",
      color: active ? "text.primary" : "text.secondary",
      bg: active ? "surface.tertiary" : "transparent",
      fontWeight: active ? "medium" : "normal",
      _hover: { bg: "surface.tertiary", color: "text.primary" },
    });
    const links = (entries: readonly NavigationEntry[], nested = false) => (
      <Flex
        css={{
          flexDirection: "column",
          gap: 1,
          ...(nested ? { ml: 4, mt: 1, pl: 2, borderLeft: "1px solid var(--border)" } : {}),
        }}
      >
        {entries.map(([href, label, Icon]) => {
          const active =
            pathname === href || (href !== "/settings" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              css={{ ...item(active), ...(nested ? { px: 2, py: 1.5, fontSize: "xs" } : {}) }}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={nested ? 14 : 16} strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </Flex>
    );
    const disclosure = (
      label: string,
      Icon: typeof Camera,
      open: boolean,
      active: boolean,
      toggle: () => void,
    ) => (
      <Box
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggle();
          }
        }}
        aria-expanded={open}
        css={{ ...item(active), justifyContent: "space-between", cursor: "pointer" }}
      >
        <Flex css={{ alignItems: "center", gap: 2.5 }}>
          <Icon size={16} strokeWidth={1.8} />
          {label}
        </Flex>
        <ChevronDown
          size={15}
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 140ms ease",
          }}
        />
      </Box>
    );

    if (collapsed)
      return (
        <Box
          ref={ref}
          as="aside"
          css={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            minH: "100%",
            width: "100%",
            bg: "var(--sidebar)",
            borderRight: "1px solid var(--border)",
            pb: 3,
          }}
          aria-label="Navegação recolhida"
        >
          <button
            type="button"
            aria-label="Expandir navegação"
            onClick={onToggleCollapsed}
            style={{
              width: 32,
              height: 32,
              border: "1px solid var(--border)",
              borderRadius: "6px",
              background: "var(--surface)",
              color: "var(--text-secondary)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <PanelLeftOpen size={16} />
          </button>
        </Box>
      );
    return (
      <Box
        ref={ref}
        as="aside"
        css={{
          display: "flex",
          flexDirection: "column",
          minH: "100%",
          width: "100%",
          bg: "var(--sidebar)",
          borderRight: "1px solid var(--border)",
          p: 3,
        }}
        aria-label="Navegação principal"
      >
        <Link
          href="/dashboard"
          onClick={onClose}
          css={{ display: "block", px: 2, py: 2.5, mb: 7 }}
          aria-label="Business Reputation Hub"
        >
          <AppBrand size="sidebar" />
        </Link>
        <Box as="nav" css={{ flex: 1, overflowY: "auto" }}>
          <Box css={{ mb: 6 }}>
            <Text
              css={{
                px: 2.5,
                mb: 2,
                fontSize: "10px",
                letterSpacing: "wide",
                color: "text.quaternary",
                fontWeight: "semibold",
              }}
            >
              PRINCIPAL
            </Text>
            {links(primaryItems)}
            {disclosure("Instagram", Camera, instagramOpen, instagramActive, () =>
              setInstagramOpen((open) => !open),
            )}
            {instagramOpen && links(instagramItems, true)}
          </Box>
          <Box css={{ mb: 6 }}>
            <Text
              css={{
                px: 2.5,
                mb: 2,
                fontSize: "10px",
                letterSpacing: "wide",
                color: "text.quaternary",
                fontWeight: "semibold",
              }}
            >
              GERENCIAR
            </Text>
            {disclosure(
              "Configurações",
              Settings,
              settingsOpen,
              pathname.startsWith("/settings"),
              () => setSettingsOpen((open) => !open),
            )}
            {settingsOpen && links(settingsItems, true)}
          </Box>
        </Box>
        <Flex
          css={{
            pt: 3,
            borderTop: "1px solid",
            borderColor: "surface.border",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Menu.Root>
            <MenuTrigger asChild>
              <Flex
                role="button"
                tabIndex={0}
                css={{
                  alignItems: "center",
                  gap: 2,
                  px: 2,
                  py: 1.5,
                  minW: 0,
                  flex: 1,
                  border: "1px solid",
                  borderColor: "surface.border",
                  borderRadius: "full",
                  cursor: "pointer",
                }}
              >
                <Avatar.Root size="2xs">
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar.Root>
                <Text css={{ fontSize: "xs", fontWeight: "medium", truncate: true, flex: 1 }}>
                  {userName}
                </Text>
                <ChevronDown size={13} />
              </Flex>
            </MenuTrigger>
            <MenuPositioner>
              <MenuContent>
                <MenuItem value="profile" disabled>
                  <Box>
                    <Text>{userName}</Text>
                    <Text css={{ fontSize: "xs" }}>{userEmail}</Text>
                  </Box>
                </MenuItem>
                <MenuSeparator />
                <MenuItem
                  value="settings"
                  onClick={() => {
                    window.location.href = "/settings";
                  }}
                >
                  <Settings size={15} />
                  Configurações
                </MenuItem>
                <MenuSeparator />
                <MenuItem value="logout" onClick={onSignOut} css={{ color: "red.600" }}>
                  <LogOut size={15} />
                  Sair
                </MenuItem>
              </MenuContent>
            </MenuPositioner>
          </Menu.Root>
          <button
            type="button"
            aria-label="Recolher navegação"
            onClick={onToggleCollapsed}
            style={{
              width: 32,
              height: 32,
              border: "1px solid var(--border)",
              borderRadius: "6px",
              background: "transparent",
              color: "var(--text-secondary)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <PanelLeftClose size={16} />
          </button>
        </Flex>
      </Box>
    );
  },
);
Sidebar.displayName = "Sidebar";
export { Sidebar };
