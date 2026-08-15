import { Suspense } from "react";
import { BusinessLocationSelection } from "./select-business-location";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <BusinessLocationSelection />
    </Suspense>
  );
}