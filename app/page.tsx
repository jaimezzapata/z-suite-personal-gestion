"use client";

import { DashboardView } from "@/features/dashboard/components/DashboardView";
import { ProtectedPage } from "@/shared/auth/ProtectedPage";

export default function HomePage() {
  return (
    <ProtectedPage title="Dashboard">
      <DashboardView />
    </ProtectedPage>
  );
}
