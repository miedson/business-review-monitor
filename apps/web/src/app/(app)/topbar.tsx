"use client";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/api-client";
import { getStoredSession } from "@/lib/auth-session";
import { Box, Button, Flex, Text } from "@/lib/design-system";
import { ThemeToggle } from "@/lib/design-system/components/ThemeToggle";
import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { forwardRef, useEffect, useState } from "react";

import { GoogleLocationSelector } from "./google-location-selector";

interface TopbarProps {
  title: string;
  breadcrumb?: Array<{ label: string; href?: string }>;
  sidebarTrigger?: React.ReactNode;
}
const Topbar = forwardRef<HTMLDivElement, TopbarProps>(
  ({ title, breadcrumb, sidebarTrigger }, ref) => {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const router = useRouter();
    const loadNotifications = async () => {
      const accessToken = getStoredSession()?.accessToken;
      if (!accessToken) return;
      try {
        const result = await getNotifications({ accessToken, limit: 12 });
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      } catch {
        /* auth/realtime retry handles next load */
      }
    };
    useEffect(() => {
      void loadNotifications();
      const onRealtime = () => void loadNotifications();
      window.addEventListener("brh:realtime", onRealtime);
      return () => window.removeEventListener("brh:realtime", onRealtime);
    }, []);
    const readAll = async () => {
      const accessToken = getStoredSession()?.accessToken;
      if (!accessToken) return;
      await markAllNotificationsRead(accessToken);
      setNotifications((items) =>
        items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
      );
      setUnreadCount(0);
    };
    const readOne = async (notification: AppNotification) => {
      const accessToken = getStoredSession()?.accessToken;
      if (!accessToken || notification.readAt) return;
      await markNotificationRead({ accessToken, id: notification.id });
      setNotifications((items) =>
        items.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    };
    const openNotification = async (notification: AppNotification) => {
      await readOne(notification);
      setOpen(false);
      const destination =
        notification.resourceType === "instagram-comment"
          ? "/instagram/comments"
          : notification.resourceType === "instagram-conversation"
            ? "/inbox"
            : notification.resourceType === "google-review"
              ? "/reviews"
              : "/dashboard";
      router.push(destination);
    };
    return (
      <Box
        ref={ref}
        as="header"
        css={{
          height: "48px",
          position: "sticky",
          top: 0,
          zIndex: "sticky",
          bg: "var(--background)",
          borderBottom: "1px solid",
          borderColor: "surface.border",
        }}
      >
        <Flex
          css={{ h: "full", px: 4, alignItems: "center", justifyContent: "space-between", gap: 3 }}
        >
          <Flex css={{ alignItems: "center", gap: 3, minW: 0 }}>
            {sidebarTrigger}
            <Flex css={{ alignItems: "center", gap: 2, minW: 0 }}>
              {breadcrumb &&
                breadcrumb.slice(0, -1).map((item) => (
                  <Flex
                    key={item.label}
                    css={{ alignItems: "center", gap: 2, display: { base: "none", md: "flex" } }}
                  >
                    <Text
                      css={{
                        fontSize: "sm",
                        color: "text.secondary",
                        fontWeight: "medium",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.label}
                    </Text>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </Flex>
                ))}
              <Text
                css={{
                  fontSize: "sm",
                  color: "text.primary",
                  fontWeight: "medium",
                  truncate: true,
                }}
              >
                {breadcrumb?.at(-1)?.label ?? title}
              </Text>
            </Flex>
          </Flex>
          <Flex css={{ alignItems: "center", gap: 2, minW: 0, position: "relative" }}>
            <GoogleLocationSelector />
            <Box css={{ position: "relative" }}>
              <Button
                aria-label="Notificações"
                variant="ghost"
                size="sm"
                onClick={() => setOpen((value) => !value)}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <Box
                    css={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      minW: 4,
                      h: 4,
                      px: 1,
                      borderRadius: "full",
                      bg: "#d9534f",
                      color: "white",
                      fontSize: "9px",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Box>
                )}
              </Button>
              {open && (
                <Box
                  css={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    w: { base: "min(340px, calc(100vw - 32px))", md: "360px" },
                    maxH: "min(520px, calc(100vh - 80px))",
                    overflowY: "auto",
                    bg: "surface.primary",
                    border: "1px solid",
                    borderColor: "surface.border",
                    borderRadius: "lg",
                    boxShadow: "lg",
                    p: 3,
                    zIndex: 20,
                  }}
                >
                  <Flex
                    css={{ alignItems: "center", justifyContent: "space-between", px: 2, pb: 2 }}
                  >
                    <Text css={{ fontWeight: "semibold", fontSize: "sm" }}>Notificações</Text>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void readAll()}
                      disabled={!unreadCount}
                    >
                      <CheckCheck size={14} />
                      Ler todas
                    </Button>
                  </Flex>
                  {notifications.length ? (
                    notifications.map((notification) => (
                      <Box
                        key={notification.id}
                        css={{
                          p: 3,
                          borderTop: "1px solid",
                          borderColor: "surface.border",
                          bg: notification.readAt ? "transparent" : "rgba(20,59,42,.04)",
                          cursor: "pointer",
                        }}
                        onClick={() => void openNotification(notification)}
                      >
                        <Text
                          css={{
                            fontSize: "sm",
                            fontWeight: notification.readAt ? "medium" : "semibold",
                          }}
                        >
                          {notification.title}
                        </Text>
                        <Text css={{ mt: 1, fontSize: "xs", color: "text.tertiary", lineClamp: 2 }}>
                          {notification.body}
                        </Text>
                        <Text css={{ mt: 2, fontSize: "10px", color: "text.quaternary" }}>
                          {new Date(notification.createdAt).toLocaleString("pt-BR")}
                        </Text>
                      </Box>
                    ))
                  ) : (
                    <Text css={{ px: 2, py: 5, fontSize: "sm", color: "text.tertiary" }}>
                      Nenhuma notificação ainda.
                    </Text>
                  )}
                </Box>
              )}
            </Box>
            <ThemeToggle />
          </Flex>
        </Flex>
      </Box>
    );
  },
);
Topbar.displayName = "Topbar";
export { Topbar };
