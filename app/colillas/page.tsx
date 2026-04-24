"use client";

import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { PayslipsView } from "@/features/payslips/components/PayslipsView";
import { ProtectedPage } from "@/shared/auth/ProtectedPage";

export default function ColillasPage() {
  const { user } = useAuthState();

  return (
    <ProtectedPage>
      {user ? <PayslipsView uid={user.uid} /> : null}
    </ProtectedPage>
  );
}
