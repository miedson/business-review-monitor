"use client";
import { Box, Flex, Text } from "@/lib/design-system";
import { ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/lib/design-system/components/ThemeToggle";
import { forwardRef } from "react";
interface TopbarProps { title: string; breadcrumb?: Array<{label:string;href?:string}>; sidebarTrigger?: React.ReactNode; }
const Topbar = forwardRef<HTMLDivElement, TopbarProps>(({ title, breadcrumb, sidebarTrigger }, ref) => <Box ref={ref} as="header" css={{ height: "48px", position: "sticky", top: 0, zIndex: "sticky", bg: "var(--background)", borderBottom: "1px solid", borderColor: "surface.border" }}><Flex css={{ h: "full", px: 4, alignItems:"center", justifyContent:"space-between", gap:4 }}><Flex css={{ alignItems:"center", gap:3, minW:0 }}>{sidebarTrigger}<Flex css={{ alignItems: "center", gap: 2, minW: 0 }}>{breadcrumb && breadcrumb.slice(0,-1).map((item) => <Flex key={item.label} css={{ alignItems: "center", gap: 2, display: {base: "none", md: "flex"} }}><Text css={{ fontSize:"sm", color:"text.secondary", fontWeight:"medium", whiteSpace: "nowrap" }}>{item.label}</Text><ChevronRight size={14} color="var(--text-muted)" /></Flex>)}<Text css={{ fontSize:"sm", color:"text.primary", fontWeight:"medium", truncate: true }}>{breadcrumb?.at(-1)?.label ?? title}</Text></Flex></Flex><ThemeToggle/></Flex></Box>);
Topbar.displayName="Topbar";
export { Topbar };
