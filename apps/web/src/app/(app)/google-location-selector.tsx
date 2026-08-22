"use client";

import { Box, Button, Menu, MenuContent, MenuItem, MenuPositioner, MenuTrigger, Text } from "@/lib/design-system";
import { useGoogleLocation } from "@/lib/google-location-context";
import { Building2, Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

export function GoogleLocationSelector() {
  const { activeLocation, locations, status, selectLocation } = useGoogleLocation();
  const router = useRouter();

  if (status === "loading" || (locations.length <= 1 && !activeLocation)) return null;
  if (!activeLocation) {
    return <Button size="sm" variant="ghost" onClick={() => router.push("/settings/integrations")}>Nenhuma empresa disponível</Button>;
  }

  if (locations.length === 1) {
    return <Box css={{ display: { base: "none", sm: "block" }, minW: 0 }}><Text css={{ fontSize: "10px", color: "text.quaternary", fontWeight: "semibold", letterSpacing: "wide", textTransform: "uppercase" }}>Empresa atual</Text><Text css={{ fontSize: "sm", fontWeight: "medium", truncate: true }}>{activeLocation.name}</Text></Box>;
  }

  return <Menu.Root>
    <MenuTrigger asChild>
      <Button size="sm" variant="ghost" aria-label="Trocar empresa atual" css={{ minW: 0, h: "auto", py: 1, px: 2, alignItems: "center" }}>
        <Building2 size={15} /><Box css={{ minW: 0, textAlign: "left", display: { base: "none", sm: "block" } }}><Text css={{ fontSize: "10px", color: "text.quaternary", fontWeight: "semibold", letterSpacing: "wide", textTransform: "uppercase", lineHeight: "short" }}>Empresa atual</Text><Text css={{ fontSize: "sm", fontWeight: "medium", truncate: true, maxW: "190px" }}>{activeLocation.name}</Text></Box><ChevronDown size={14} />
      </Button>
    </MenuTrigger>
    <MenuPositioner>
      <MenuContent css={{ minW: "280px", maxW: "min(360px, calc(100vw - 24px))", p: 1, border: "1px solid", borderColor: "surface.border", borderRadius: "lg", boxShadow: "lg" }}>
        {locations.map((location) => <MenuItem key={location.id} value={location.id} onClick={() => selectLocation(location.id)} css={{ py: 2, alignItems: "flex-start" }}>
          <Box css={{ flex: 1, minW: 0 }}><Text css={{ fontSize: "sm", fontWeight: "medium", truncate: true }}>{location.name}</Text><Text css={{ mt: .5, fontSize: "xs", color: "text.tertiary", truncate: true }}>{location.storeCode ?? location.accountId}</Text></Box>{location.id === activeLocation.id && <Check size={15} />}
        </MenuItem>)}
      </MenuContent>
    </MenuPositioner>
  </Menu.Root>;
}
