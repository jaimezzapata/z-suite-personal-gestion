"use client";

import { createContext, useContext } from "react";

type CurrentUser = {
  uid: string;
  name?: string | null;
  email?: string | null;
  photoUrl?: string | null;
};

const CurrentUserContext = createContext<CurrentUser | null>(null);

export function CurrentUserProvider({
  value,
  children,
}: {
  value: CurrentUser;
  children: React.ReactNode;
}) {
  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser must be used within CurrentUserProvider");
  return ctx;
}

