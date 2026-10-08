import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/auth-forms";
import { Skeleton } from "@/components/ui/skeleton";
import { googleSignInAvailable, isDemoMode } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return <SignInForm next={next} demo={isDemoMode()} google={googleSignInAvailable()} error={typeof sp.error === "string" ? sp.error : undefined} />;
}
