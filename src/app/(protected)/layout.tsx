"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader2 } from "lucide-react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
            <div className="absolute inset-3 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </div>
          <p className="text-muted-foreground mt-4">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/10">
      <Header />
      <main className="flex-1 pt-6 pb-12">
        {children}
      </main>
      <Footer />
      <div className="fixed bottom-4 right-4 z-50 bg-background/80 backdrop-blur-md rounded-full shadow-lg p-1 border hidden sm:block">
        <div className="text-xs px-3 py-1 text-muted-foreground flex items-center">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
          Enterprise Healthcare System
        </div>
      </div>
    </div>
  );
}