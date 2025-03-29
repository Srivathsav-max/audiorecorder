import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Login - Healthcare Communication Recorder",
  description: "Login to your account",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8 bg-gradient-to-br from-background via-muted/20 to-muted/30">
      <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="w-full flex justify-center">
            <Image
              src="/watchrx-logo-new.png"
              alt="WatchRX Logo"
              width={180}
              height={54}
              className="w-[140px] sm:w-[160px] lg:w-[180px] h-auto mb-2"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            Healthcare Communication Recorder
          </h1>
          <p className="text-muted-foreground max-w-md">
            Secure audio capture system for healthcare professionals
          </p>
        </div>

        <Card className="shadow-lg border-border/40 overflow-hidden backdrop-blur-sm bg-background/95">
          <div className="absolute h-1 top-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/50"></div>
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-2xl font-semibold text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
          <CardFooter className="flex justify-center border-t bg-muted/10 px-8 py-4">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Create one now
              </Link>
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  );
}
