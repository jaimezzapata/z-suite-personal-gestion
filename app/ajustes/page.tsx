"use client";

import { SettingsView } from "@/features/settings/components/SettingsView";
import { ProtectedPage } from "@/shared/auth/ProtectedPage";

export default function AjustesPage() {
  return (
    <ProtectedPage title="Ajustes">
      <SettingsView />
    </ProtectedPage>
  );
}
