"use client";

import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { ExpensesView } from "@/features/expenses/components/ExpensesView";
import { ProtectedPage } from "@/shared/auth/ProtectedPage";

export default function GastosPage() {
  const { user } = useAuthState();

  return (
    <ProtectedPage>
      {user ? <ExpensesView uid={user.uid} /> : null}
    </ProtectedPage>
  );
}
