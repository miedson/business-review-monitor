"use client";

import { Suspense } from "react";
import { Box, Skeleton } from "@/lib/design-system";
import { InstagramOnboardingContent } from "./InstagramOnboardingContent";

export default function OnboardingInstagramPage() {
  return (
    <Suspense fallback={<Box css={{ minH: "100vh", bg: "surface.secondary", px: 4, py: 8, display: "flex", justifyContent: "center", alignItems: "center" }}><Skeleton variant="circular" width="2rem" height="2rem" /></Box>}>
      <InstagramOnboardingContent />
    </Suspense>
  );
}