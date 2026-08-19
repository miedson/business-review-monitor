"use client";

import { Box, Text, Flex, Link, Avatar, AvatarFallback, Menu, MenuTrigger, MenuPositioner, MenuContent, MenuItem, MenuSeparator, Badge } from "@/lib/design-system";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { type ChannelProvider } from "@/lib/design-system";

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const StarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const CogIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const InboxIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4" />
    <path d="M21 14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M4 12s4-2 7-2 7 2 7 2" />
    <path d="M9 6v4" />
    <path d="M15 6v4" />
  </svg>
);

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const navigationItems = [
  { href: "/dashboard", label: "Visão geral", Icon: HomeIcon },
  { href: "/reviews", label: "Avaliações", Icon: StarIcon },
] as const;

const settingsSubItems = [
  { href: "/settings/integrations", label: "Integrações", Icon: SettingsIcon },
  { href: "/settings", label: "Configurações gerais", Icon: CogIcon },
] as const;

const futureItems = [
  { label: "Caixa de entrada", Icon: InboxIcon, comingSoon: true },
  { label: "Relatórios", Icon: ChartIcon, comingSoon: true },
] as const;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  userInitials: string;
  connectedProviders: ChannelProvider[];
  onSignOut: () => void;
}

const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      onClose,
      userName,
      userEmail,
      userInitials,
      connectedProviders,
      onSignOut,
    },
    ref
  ) => {
    const pathname = usePathname();

    return (
      <Box
        ref={ref}
        as="aside"
        css={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          bg: "surface.primary",
          borderRight: "1px solid",
          borderColor: "surface.border",
        }}
        aria-label="Navegação principal"
      >
        <Box css={{ display: "flex", alignItems: "center", gap: 3, px: 5, h: "64px", borderBottom: "1px solid", borderColor: "surface.border" }}>
          <Box
            css={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              w: 10,
              h: 10,
              borderRadius: "lg",
              bg: "brand.600",
              color: "white",
              fontWeight: "bold",
              fontSize: "lg",
            }}
          >
            BRH
          </Box>
          <Text css={{ fontWeight: "semibold", fontSize: "lg", color: "text.primary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Business Reputation Hub
          </Text>
        </Box>

        <Flex css={{ flex: 1, flexDirection: "column", overflowY: "auto", p: 4, gap: 1 }}>
          <nav aria-label="Navegação principal">
            <Flex css={{ flexDirection: "column", gap: 1 }}>
              {navigationItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    css={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      px: 3,
                      py: 2.5,
                      borderRadius: "lg",
                      fontWeight: "medium",
                      fontSize: "sm",
                      color: isActive ? "white" : "text.secondary",
                      bg: isActive ? "brand.600" : "transparent",
                      _hover: { bg: isActive ? "brand.700" : "surface.tertiary", color: "text.primary" },
                      transition: "all 0.15s ease",
                    }}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.Icon />
                    {item.label}
                  </Link>
                );
              })}

              <Menu.Root>
                <MenuTrigger asChild>
                  <Link
                    href="/settings"
                    onClick={onClose}
                    css={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      px: 3,
                      py: 2.5,
                      borderRadius: "lg",
                      fontWeight: "medium",
                      fontSize: "sm",
                      color: pathname.startsWith("/settings") ? "white" : "text.secondary",
                      bg: pathname.startsWith("/settings") ? "brand.600" : "transparent",
                      _hover: { bg: pathname.startsWith("/settings") ? "brand.700" : "surface.tertiary", color: "text.primary" },
                      transition: "all 0.15s ease",
                    }}
                    aria-current={pathname.startsWith("/settings") ? "page" : undefined}
                  >
                    <CogIcon />
                    Configurações
                    <Box css={{ marginLeft: "auto" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </Box>
                  </Link>
                </MenuTrigger>
                <MenuPositioner>
                  <MenuContent css={{ minW: "200px", borderRadius: "lg", boxShadow: "lg", border: "1px solid", borderColor: "surface.border", mt: 1, ml: -4 }}>
                    {settingsSubItems.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <MenuItem
                          key={item.href}
                          value={item.href}
                          asChild
                          css={{ px: 3, py: 2, fontSize: "sm", color: isActive ? "brand.600" : "text.secondary", _hover: { bg: isActive ? "brand.50" : "surface.tertiary", color: "text.primary" }, fontWeight: isActive ? "semibold" : "medium" }}
                        >
                          <Link
                            href={item.href}
                            onClick={onClose}
                            css={{ display: "flex", alignItems: "center", gap: 2, width: "full" }}
                          >
                            <item.Icon />
                            {item.label}
                          </Link>
                        </MenuItem>
                      );
                    })}
                  </MenuContent>
                </MenuPositioner>
              </Menu.Root>
            </Flex>
          </nav>

          {futureItems.length > 0 && (
            <>
              <Box css={{ borderTop: "1px solid", borderColor: "surface.border", my: 3, pt: 3 }}>
                <Text css={{ fontSize: "xs", fontWeight: "semibold", textTransform: "uppercase", letterSpacing: "wide", color: "text.quaternary", px: 3, mb: 2 }}>
                  Em breve
                </Text>
                <Flex css={{ flexDirection: "column", gap: 1 }}>
                  {futureItems.map((item) => (
                    <Box
                      key={item.label}
                      css={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        px: 3,
                        py: 2.5,
                        borderRadius: "lg",
                        fontWeight: "medium",
                        fontSize: "sm",
                        color: "text.quaternary",
                        cursor: "not-allowed",
                      }}
                    >
                      <Box css={{ display: "flex", flexShrink: 0, color: "text.quaternary" }}>
                        <item.Icon />
                      </Box>
                      <Flex css={{ alignItems: "center", gap: 2, flex: 1 }}>
                        <Text>{item.label}</Text>
                        {item.comingSoon && <Badge variant="subtle" colorScheme="amber" size="xs">Em breve</Badge>}
                      </Flex>
                    </Box>
                  ))}
                </Flex>
              </Box>
            </>
          )}
        </Flex>

<Box css={{ borderTop: "1px solid", borderColor: "surface.border", p: 4, gap: 3, display: "flex", flexDirection: "column" }}>
            <Menu.Root>
              <MenuTrigger asChild>
                <Box
                  css={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    px: 1,
                    cursor: "pointer",
                    borderRadius: "md",
                    py: 1,
                    _hover: { bg: "surface.tertiary" },
                  }}
                >
                  <Avatar.Root size="sm" css={{ bg: "brand.100", color: "brand.700" }}>
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar.Root>
                  <Box css={{ flex: 1, minWidth: 0 }}>
                    <Text css={{ fontWeight: "medium", fontSize: "sm", color: "text.primary", lineHeight: "snug", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {userName}
                    </Text>
                    <Text css={{ fontSize: "xs", color: "text.tertiary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {userEmail}
                    </Text>
                  </Box>
                  <Box css={{ display: "flex", alignItems: "center", color: "text.quaternary" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </Box>
                </Box>
              </MenuTrigger>
              <MenuPositioner>
                <MenuContent css={{ minW: "220px", borderRadius: "lg", boxShadow: "lg", border: "1px solid", borderColor: "surface.border" }}>
                  <MenuItem value="user-info" css={{ px: 3, py: 2, fontSize: "sm", color: "text.secondary", cursor: "default" }}>
                    <Text fontWeight="medium" color="text.primary">{userName}</Text>
                    <Text fontSize="xs" color="text.tertiary">{userEmail}</Text>
                  </MenuItem>
                  <MenuSeparator />
                  {connectedProviders.length > 0 && (
                    <>
                      <MenuItem value="providers" css={{ px: 3, py: 2, fontSize: "sm", color: "text.secondary", cursor: "default" }}>
                        <Text fontWeight="medium" color="text.primary" fontSize="xs" mb={1}>Conectados</Text>
                        <Box css={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                          {["google", "instagram", "facebook"].map((provider) => {
                            const isConnected = connectedProviders.includes(provider as ChannelProvider);
                            if (!isConnected) return null;
                            const configs: Record<string, { label: string; color: string }> = {
                              google: { label: "Google", color: "blue" },
                              instagram: { label: "Instagram", color: "pink" },
                              facebook: { label: "Facebook", color: "blue" },
                            };
                            const config = configs[provider];
                            if (!config) return null;
                            return (
                              <Badge key={provider} variant="subtle" colorScheme={config.color as "blue" | "pink"} size="xs" dot>
                                {config.label}
                              </Badge>
                            );
                          })}
                        </Box>
                      </MenuItem>
                      <MenuSeparator />
                    </>
                  )}
                  <MenuItem value="signout" onClick={onSignOut} css={{ px: 3, py: 2, fontSize: "sm", color: "status.error.text", _hover: { bg: "status.error.bg" } }}>
                    Sair da conta
                  </MenuItem>
                </MenuContent>
              </MenuPositioner>
            </Menu.Root>
          </Box>
      </Box>
    );
  }
);

Sidebar.displayName = "Sidebar";

export { Sidebar, type SidebarProps };