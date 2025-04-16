"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { UserRound } from "lucide-react";

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-blue-100 px-4 py-12">
      <Card className="w-full max-w-2xl shadow-2xl border-0 rounded-2xl">
        <CardContent className="p-8 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata.user_name || user.user_metadata.name || user.email}
                className="w-12 h-12 rounded-full border object-cover"
              />
            ) : (
              <div className="bg-muted text-muted-foreground rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">
                {(user.user_metadata?.user_name || user.user_metadata?.name || user.email || "U").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-semibold text-lg text-zinc-800">Welcome, {user.user_metadata?.user_name || user.user_metadata?.name || user.email || "User"}!</div>
              <div className="text-zinc-500 text-sm">Ready to search your Supabase queries?</div>
            </div>
          </div>
          <div className="border-t border-zinc-200 my-2" />
          <form
            className="flex flex-col gap-4"
            onSubmit={e => {
              e.preventDefault();
              if (!inputValue.trim()) {
                setError("Please enter a query before searching.");
                return;
              }
              setError(null);
              router.push(`/dashboard/chat-detail?query=${encodeURIComponent(inputValue)}`);
            }}
          >
            <Textarea
              value={inputValue}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  const form = e.currentTarget.closest('form');
                  if (form) form.requestSubmit();
                }
              }}
              placeholder="e.g. Skip authorization check on Edge Functions"
              className="w-full text-base bg-zinc-50 border border-zinc-200 rounded-xl p-4 focus-visible:ring-2 focus-visible:ring-blue-400 transition"
              rows={3}
            />
            {error && (
              <div className="text-red-500 text-sm mt-1">{error}</div>
            )}
            <Button
              type="submit"
              className="self-end px-8 py-2 rounded-full font-semibold shadow transition cursor-pointer"
            >
              Search
            </Button>
          </form>
          <div className="border-t border-zinc-200 my-2" />
          <Button
            variant="outline"
            onClick={signOut}
            className="w-full rounded-full border-zinc-300 hover:bg-zinc-100 font-medium cursor-pointer transition"
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}