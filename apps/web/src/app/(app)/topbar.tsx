"use client";

import { Box, Flex, Text, Menu, MenuTrigger, MenuPositioner, MenuContent, MenuItem, MenuSeparator, Avatar, AvatarFallback, IconButton, Link } from "@chakra-ui/react";
import { forwardRef } from "react";

interface TopbarProps {
  title: string;
  breadcrumb?: Array<{ label: string; href?: string }> | undefined;
  userName: string;
  userEmail: string;
  userInitials: string;
  onSignOut: () => void;
  sidebarTrigger?: React.ReactNode;
}

const Topbar = forwardRef<HTMLDivElement, TopbarProps>(
  (
    {
      title,
      breadcrumb,
      userName,
      userEmail,
      userInitials,
      onSignOut,
      sidebarTrigger,
    },
    ref
  ) => {

    return (
      <Box
        ref={ref}
        as="header"
        css={{
          position: "sticky",
          top: 0,
          zIndex: "sticky",
          bg: "surface.primary",
          borderBottom: "1px solid",
          borderColor: "surface.border",
          boxShadow: "xs",
        }}
      >
        <Flex
          css={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 4,
            h: "64px",
            px: { base: 4, md: 6 },
            flexWrap: "wrap",
          }}
        >
          <Flex css={{ alignItems: "center", gap: 3, flex: 1, minWidth: 0 }}>
            {sidebarTrigger}
            <Box css={{ display: { base: "none", md: "flex" }, alignItems: "center", gap: 2, flex: 1, minWidth: 0 }}>
              {breadcrumb && breadcrumb.length > 0 && (
                <Flex css={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  {breadcrumb.map((item, index) => (
                    <Flex key={item.href ?? item.label} css={{ alignItems: "center", gap: 1 }}>
                      {index > 0 && (
                        <Text css={{ color: "text.quaternary", fontSize: "sm" }}>›</Text>
                      )}
                      {item.href ? (
                        <Link
                          href={item.href}
                          color="text.secondary"
                          fontSize="sm"
                          fontWeight="medium"
                          _hover={{ color: "text.primary" }}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <Text css={{ color: "text.primary", fontSize: "sm", fontWeight: "semibold" }}>{item.label}</Text>
                      )}
                    </Flex>
                  ))}
                </Flex>
              )}
              {!breadcrumb && (
                <Text css={{ fontSize: "xl", fontWeight: "semibold", color: "text.primary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {title}
                </Text>
              )}
            </Box>
          </Flex>

          <Flex css={{ alignItems: "center", gap: 3, flexShrink: 0 }}>
            <Menu.Root>
              <MenuTrigger asChild>
                <IconButton
                  aria-label="Menu do usuário"
                  css={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    px: 2,
                    py: 1.5,
                    borderRadius: "lg",
                    _hover: { bg: "surface.tertiary" },
                  }}
                >
                  <Avatar.Root size="sm" css={{ bg: "brand.100", color: "brand.700" }}>
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar.Root>
                  <Box css={{ display: { base: "none", md: "flex" }, flexDirection: "column", alignItems: "flexStart", minWidth: 0 }}>
                    <Text css={{ fontWeight: "medium", fontSize: "sm", color: "text.primary", lineHeight: "snug", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {userName}
                    </Text>
                    <Text css={{ fontSize: "xs", color: "text.tertiary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {userEmail}
                    </Text>
                  </Box>
                </IconButton>
              </MenuTrigger>
              <MenuPositioner>
                <MenuContent css={{ minW: "220px", borderRadius: "lg", boxShadow: "lg", border: "1px solid", borderColor: "surface.border" }}>
                  <MenuItem value="user-info" css={{ px: 3, py: 2, fontSize: "sm", color: "text.secondary", cursor: "default" }}>
                    <Text fontWeight="medium" color="text.primary">{userName}</Text>
                    <Text fontSize="xs" color="text.tertiary">{userEmail}</Text>
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem value="signout" onClick={onSignOut} css={{ px: 3, py: 2, fontSize: "sm", color: "status.error.text", _hover: { bg: "status.error.bg" } }}>
                    Sair da conta
                  </MenuItem>
                </MenuContent>
              </MenuPositioner>
            </Menu.Root>
          </Flex>
        </Flex>
      </Box>
    );
  }
);

Topbar.displayName = "Topbar";

export { Topbar, type TopbarProps };