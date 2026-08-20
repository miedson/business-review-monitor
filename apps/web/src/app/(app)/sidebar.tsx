"use client";

import { Box, Text, Flex, Link, Avatar, AvatarFallback, Menu, MenuTrigger, MenuPositioner, MenuContent, MenuItem, MenuSeparator, Badge } from "@/lib/design-system";
import { usePathname } from "next/navigation";
import { forwardRef, useState, useEffect } from "react";
import { type ChannelProvider } from "@/lib/design-system";
import { Home, Star, Inbox, BarChart3, Plug, Settings } from "lucide-react";
import { AppBrand } from "@/lib/design-system/components/AppBrand";

const navigationItems = [
  { href: "/dashboard", label: "Visão geral", Icon: Home },
  { href: "/inbox", label: "Inbox", Icon: Inbox },
  { href: "/reviews", label: "Avaliações", Icon: Star },
  { href: "/instagram/comments", label: "Comentários Instagram", Icon: Inbox },
] as const;

const settingsSubItems = [
  { href: "/settings/integrations", label: "Integrações", Icon: Plug },
  { href: "/settings", label: "Configurações gerais", Icon: Settings },
] as const;

const futureItems = [
  { label: "Relatórios", Icon: BarChart3, comingSoon: true },
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
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

    useEffect(() => {
      if (pathname.startsWith("/settings")) {
        setIsSettingsExpanded(true);
      }
    }, [pathname]);

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
        <Box css={{ px: 5, py: 3, borderBottom: "1px solid", borderColor: "surface.border" }}>
          <AppBrand title="Business Reputation Hub" subtitle="Centralize sua reputação digital" size="sm" />
        </Box>

        <Flex css={{ flex: 1, flexDirection: "column", overflowY: "auto", p: 4, gap: 1, scrollbarGutter: "stable" }}>
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

              <Box>
                <Box
                  role="button"
                  aria-expanded={isSettingsExpanded}
                  onClick={() => setIsSettingsExpanded((prev) => !prev)}
                  css={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    px: 3,
                    py: 2.5,
                    borderRadius: "lg",
                    fontWeight: "medium",
                    fontSize: "sm",
                    color: pathname === "/settings" ? "white" : "text.secondary",
                    bg: pathname === "/settings" ? "brand.600" : "transparent",
                    _hover: { bg: pathname === "/settings" ? "brand.700" : "surface.tertiary", color: "text.primary" },
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                  }}
                >
                  <Settings size={20} />
                  Configurações
                  <Box
                    css={{
                      marginLeft: "auto",
                      display: "flex",
                      alignItems: "center",
                      transition: "transform 0.25s ease",
                      transform: isSettingsExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </Box>
                </Box>
                <Box
                  css={{
                    overflow: "hidden",
                    maxHeight: isSettingsExpanded ? "200px" : "0px",
                    opacity: isSettingsExpanded ? 1 : 0,
                    transition: "max-height 0.3s ease, opacity 0.25s ease",
                  }}
                >
                  <Box css={{ display: "flex", flexDirection: "column", gap: 0.5, pt: 0.5, pb: 0.5 }}>
                    {settingsSubItems.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          css={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            px: 3,
                            py: 2,
                            borderRadius: "md",
                            fontSize: "sm",
                            color: isActive ? "brand.600" : "text.secondary",
                            bg: isActive ? "brand.50" : "transparent",
                            _hover: { bg: isActive ? "brand.50" : "surface.tertiary", color: "text.primary" },
                            fontWeight: isActive ? "semibold" : "medium",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <item.Icon />
                          {item.label}
                        </Link>
                      );
                    })}
                  </Box>
                </Box>
              </Box>
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