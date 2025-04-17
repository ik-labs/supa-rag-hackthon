"use client";


import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user, signInWithGitHub, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
      <div className="max-w-xl text-center text-zinc-600 text-base mt-2">
          <strong>Welcome to the Supabase Chat Bot!</strong><br />
          This bot will do its best to answer your questions using vectorized data from the Supabase GitHub Discussions board. Please note that answers are generated automatically and may not always be accurate—double-check important information.
        </div>
        {/* Auth section */}
        <div className="mb-6 w-full flex justify-center">
          <div className="flex flex-col items-center gap-2">
            {user ? (
              <>
                <span className="text-sm">Signed in as <b>{user.email ?? user.user_metadata?.name ?? user.id}</b></span>
                <Button variant="outline" onClick={signOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <Button onClick={signInWithGitHub} className="cursor-pointer">
                Sign in with GitHub
              </Button>
            )}
          </div>
        </div>

      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <p>
          Build using NextJS, Supabase, Upstash and Hosted on Vercel.
        </p>
      </footer>
    </div>
  );
}
