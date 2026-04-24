"use client";

import { useAuthState } from "@/features/auth/hooks/useAuthState";
import { SchedulesView } from "@/features/schedules/components/SchedulesView";
import { ProtectedPage } from "@/shared/auth/ProtectedPage";

export default function HorariosPage() {
  const { user } = useAuthState();

  return (
    <ProtectedPage>{user ? <SchedulesView uid={user.uid} /> : null}</ProtectedPage>
  );
}
