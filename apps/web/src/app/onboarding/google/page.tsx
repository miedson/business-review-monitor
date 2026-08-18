"use client";

import { Suspense } from "react";
import { Box, Skeleton } from "@/lib/design-system";
import { GoogleOnboardingContent } from "./GoogleOnboardingContent";

export default function OnboardingGooglePage() {
  return (
    <Suspense fallback={<Box css={{ minH: "100vh", bg: "surface.secondary", px: 4, py: 8, display: "flex", justifyContent: "center", alignItems: "center" }}><Skeleton variant="circular" width="2rem" height="2rem" /></Box>}>
      <GoogleOnboardingContent />
    </Suspense>
  );
}