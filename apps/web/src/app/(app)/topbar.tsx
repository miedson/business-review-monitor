"use client";

import { Box, Flex, Text, Link } from "@chakra-ui/react";
import { forwardRef } from "react";
import { ThemeToggle } from "@/lib/design-system/components/ThemeToggle";

interface TopbarProps {
  title: string;
  breadcrumb?: Array<{ label: string; href?: string }> | undefined;
  sidebarTrigger?: React.ReactNode;
}

const Topbar = forwardRef<HTMLDivElement, TopbarProps>(
  (
    {
      title,
      breadcrumb,
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
            h: "64px",
            borderBottom: "1px solid",
            borderColor: "surface.border",
          }}
        >
          <Flex
            css={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 4,
              h: "full",
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
            <ThemeToggle />
          </Flex>
        </Flex>
      </Box>
    );
  }
);

Topbar.displayName = "Topbar";

export { Topbar, type TopbarProps };