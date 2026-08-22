"use client";

import { getStoredSession } from "@/lib/auth-session";
import { Box, Text } from "@/lib/design-system";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      router.replace("/login");
    } else {
      router.replace("/onboarding/google");
    }
  }, [router]);

  return (
    <Box
      css={{
        minH: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 4,
      }}
    >
      <Text>Carregando...</Text>
    </Box>
  );
}
