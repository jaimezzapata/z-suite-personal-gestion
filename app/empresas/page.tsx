"use client";

import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { CompaniesView } from "@/features/companies/components/CompaniesView";
import { ProtectedPage } from "@/shared/auth/ProtectedPage";

export default function EmpresasPage() {
  const { user } = useAuthState();

  return (
    <ProtectedPage>
      {user ? <CompaniesView uid={user.uid} /> : null}
    </ProtectedPage>
  );
}
