"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getStoredSession } from "./auth-session";
import { listGoogleAccounts, listGoogleLocations, type GoogleLocation } from "./api-client";

const storageKey = "brh.active-google-location-id";

export type AvailableGoogleLocation = GoogleLocation & { accountId: string };

type GoogleLocationContextValue = {
  activeLocation: AvailableGoogleLocation | null;
  locations: AvailableGoogleLocation[];
  status: "loading" | "ready" | "error";
  selectLocation: (locationId: string) => void;
};

const GoogleLocationContext = createContext<GoogleLocationContextValue | null>(null);

export function GoogleLocationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [locations, setLocations] = useState<AvailableGoogleLocation[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [status, setStatus] = useState<GoogleLocationContextValue["status"]>("loading");

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      const session = getStoredSession();
      if (!session?.accessToken) {
        if (active) setStatus("ready");
        return;
      }

      try {
        const accounts = await listAllGoogleAccounts(session.accessToken);
        const locationPages = await Promise.all(
          accounts.map(async (account) => {
            const accountLocations = await listAllGoogleLocations(session.accessToken, account.id);
            return accountLocations.map((location) => ({ ...location, accountId: account.id }));
          })
        );
        const available = locationPages.flat();
        const savedId = window.localStorage.getItem(storageKey);
        const selected = available.find((location) => location.id === savedId) ?? available[0] ?? null;

        if (!active) return;
        setLocations(available);
        setActiveLocationId(selected?.id ?? null);
        if (selected) window.localStorage.setItem(storageKey, selected.id);
        else window.localStorage.removeItem(storageKey);
        setStatus("ready");
      } catch {
        if (active) setStatus("error");
      }
    }

    void loadLocations();
    return () => { active = false; };
  }, [pathname]);

  const value = useMemo<GoogleLocationContextValue>(() => ({
    activeLocation: locations.find((location) => location.id === activeLocationId) ?? null,
    locations,
    status,
    selectLocation(locationId) {
      if (!locations.some((location) => location.id === locationId)) return;
      setActiveLocationId(locationId);
      window.localStorage.setItem(storageKey, locationId);
    }
  }), [activeLocationId, locations, status]);

  return <GoogleLocationContext.Provider value={value}>{children}</GoogleLocationContext.Provider>;
}

export function useGoogleLocation(): GoogleLocationContextValue {
  const context = useContext(GoogleLocationContext);
  if (!context) throw new Error("useGoogleLocation must be used within GoogleLocationProvider");
  return context;
}

async function listAllGoogleAccounts(accessToken: string) {
  const accounts = [] as Awaited<ReturnType<typeof listGoogleAccounts>>["accounts"];
  let pageToken: string | undefined;
  do {
    const page = await listGoogleAccounts(accessToken, pageToken);
    accounts.push(...page.accounts);
    pageToken = page.nextPageToken ?? undefined;
  } while (pageToken);
  return accounts;
}

async function listAllGoogleLocations(accessToken: string, accountId: string) {
  const locations = [] as GoogleLocation[];
  let pageToken: string | undefined;
  do {
    const page = await listGoogleLocations({
      accessToken,
      accountId,
      ...(pageToken ? { pageToken } : {})
    });
    locations.push(...page.locations);
    pageToken = page.nextPageToken ?? undefined;
  } while (pageToken);
  return locations;
}
