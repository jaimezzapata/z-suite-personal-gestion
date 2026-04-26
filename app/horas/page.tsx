"use client";

import { HoursView } from "@/features/hours/components/HoursView";
import { ProtectedPage } from "@/shared/auth/ProtectedPage";

export default function HorasPage() {
  return (
    <ProtectedPage title="Horas">
      <HoursView />
    </ProtectedPage>
  );
}
