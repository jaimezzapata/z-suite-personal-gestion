"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LoginView } from "@/features/auth/components/LoginView";
import { useAuthState } from "@/features/auth/hooks/useAuthState";
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/features/auth/services/authService";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuthState();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  return (
    <LoginView
      onGoogle={async () => {
        await signInWithGoogle();
        router.replace("/");
      }}
      onEmailSignIn={async (email, password) => {
        await signInWithEmail(email, password);
        router.replace("/");
      }}
      onEmailSignUp={async (email, password) => {
        await signUpWithEmail(email, password);
        router.replace("/");
      }}
    />
  );
}

