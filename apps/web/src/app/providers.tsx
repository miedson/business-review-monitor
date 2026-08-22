"use client";

import { ThemeProvider, useThemeMode } from "@/lib/design-system";
import { system } from "@/lib/design-system/theme";
import { GoogleLocationProvider } from "@/lib/google-location-context";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

function ThemeToggleWrapper({ children }: { children: React.ReactNode }) {
  useThemeMode();
  return <>{children}</>;
}

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider>
      <ChakraProvider value={system}>
        <ThemeToggleWrapper>
          <QueryClientProvider client={queryClient}>
            <GoogleLocationProvider>{children}</GoogleLocationProvider>
          </QueryClientProvider>
        </ThemeToggleWrapper>
      </ChakraProvider>
    </ThemeProvider>
  );
}
