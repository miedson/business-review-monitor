"use client";

import {
  Drawer,
  DrawerTrigger,
  DrawerBackdrop,
  DrawerPositioner,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseTrigger,
  Box,
  Flex,
  Text,
  IconButton,
  useDisclosure,
} from "@chakra-ui/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoredSession, clearStoredSession } from "@/lib/auth-session";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { open: isSidebarOpen, onClose: closeSidebar } = useDisclosure();
  const [session, setSession] = useState<ReturnType<typeof getStoredSession>>(null);
  const [connectedProviders, setConnectedProviders] = useState<("google" | "instagram" | "facebook")[]>([]);

  useEffect(() => {
    const stored = getStoredSession();
    setSession(stored);
    if (!stored) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (session?.accessToken) {
      checkConnections();
    }
  }, [session]);

  const checkConnections = async () => {
    if (!session?.accessToken) return;

    const providers: ("google" | "instagram" | "facebook")[] = [];

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/integrations/google/accounts`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accounts?.length > 0) providers.push("google");
      }
    } catch {
      // ignore
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/integrations/instagram/accounts`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accounts?.length > 0) providers.push("instagram");
      }
    } catch {
      // ignore
    }

    setConnectedProviders(providers);
  };

  const handleSignOut = () => {
    clearStoredSession();
    router.replace("/login");
  };

  const userInitials = session?.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "US";

  if (!session) {
    return (
      <Box css={{ display: "flex", alignItems: "center", justifyContent: "center", minH: "100vh" }}>
        <Text>Carregando...</Text>
      </Box>
    );
  }

  const breadcrumb = getBreadcrumb(pathname) ?? [];

  return (
    <Drawer.Root open={isSidebarOpen} onOpenChange={closeSidebar}>
      <Box css={{ display: "flex", minH: "100vh", bg: "surface.secondary" }}>
        <DrawerTrigger asChild>
          <Box css={{ display: "none" }} />
        </DrawerTrigger>
        <DrawerBackdrop bg="rgba(15, 23, 42, 0.4)" />
        <DrawerPositioner>
          <DrawerContent css={{ bg: "surface.primary", boxShadow: "none" }}>
            <DrawerHeader>
              <Box css={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Text fontWeight="semibold" fontSize="lg" color="text.primary">
                  Business Reputation Hub
                </Text>
                <DrawerCloseTrigger css={{ p: 1, borderRadius: "md", _hover: { bg: "surface.tertiary" } }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </DrawerCloseTrigger>
              </Box>
            </DrawerHeader>
            <DrawerBody css={{ p: 0 }}>
              <Sidebar
                isOpen={isSidebarOpen}
                onClose={closeSidebar}
                userName={session.user.name}
                userEmail={session.user.email}
                userInitials={userInitials}
                connectedProviders={connectedProviders}
                onSignOut={handleSignOut}
              />
            </DrawerBody>
          </DrawerContent>
        </DrawerPositioner>

        <Flex css={{ display: "flex", flexDirection: "column", flex: 1, minW: 0, marginLeft: { base: 0, md: "280px" } }}>
          <Topbar
            title={getPageTitle(pathname)}
            breadcrumb={breadcrumb}
            userName={session.user.name}
            userEmail={session.user.email}
            userInitials={userInitials}
            onSignOut={handleSignOut}
            sidebarTrigger={
              <DrawerTrigger asChild>
                <IconButton
                  aria-label="Abrir menu"
                  css={{
                    display: { base: "flex", md: "none" },
                    alignItems: "center",
                    justifyContent: "center",
                    p: 2,
                    borderRadius: "lg",
                    _hover: { bg: "surface.tertiary" },
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </IconButton>
              </DrawerTrigger>
            }
          />

          <Box
            css={{
              flex: 1,
              p: { base: 4, md: 6 },
              overflowX: "hidden",
            }}
          >
            {children}
          </Box>
        </Flex>
      </Box>
    </Drawer.Root>
  );
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    "/dashboard": "Visão geral",
    "/reviews": "Avaliações",
    "/settings/integrations": "Integrações",
    "/settings": "Configurações",
  };

  for (const [path, title] of Object.entries(titles)) {
    if (pathname === path || pathname.startsWith(path + "/")) {
      return title;
    }
  }
  return "Dashboard";
}

function getBreadcrumb(pathname: string): Array<{ label: string; href?: string }> | undefined {
  if (pathname === "/dashboard") return [{ label: "Visão geral" }];
  if (pathname.startsWith("/reviews")) return [{ label: "Visão geral", href: "/dashboard" }, { label: "Avaliações" }];
  if (pathname.startsWith("/settings/integrations")) return [{ label: "Visão geral", href: "/dashboard" }, { label: "Configurações", href: "/settings" }, { label: "Integrações" }];
  if (pathname.startsWith("/settings")) return [{ label: "Visão geral", href: "/dashboard" }, { label: "Configurações" }];
  return undefined;
}