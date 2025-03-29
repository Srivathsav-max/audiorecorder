'use client';

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkRegistrationStatus() {
      try {
        const response = await fetch('/api/admin/settings/registration-status');
        if (response.ok) {
          const data = await response.json();
          setRegistrationEnabled(data.registrationEnabled);
        } else {
          // If the endpoint fails, default to enabled to avoid blocking valid registrations
          setRegistrationEnabled(true);
        }
      } catch (error) {
        console.error('Error checking registration status:', error);
        setRegistrationEnabled(true);
      } finally {
        setIsLoading(false);
      }
    }

    checkRegistrationStatus();
  }, []);

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

        {registrationEnabled === false && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3 text-yellow-800 dark:text-yellow-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-sm">Registration Currently Disabled</h3>
              <p className="text-sm mt-1">
                New account registration has been disabled by the administrator. 
                Please contact your system administrator for assistance.
              </p>
            </div>
          </div>
        )}

        <Card className="shadow-lg border-border/40 overflow-hidden backdrop-blur-sm bg-background/95">
          <div className="absolute h-1 top-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/50"></div>
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-2xl font-semibold text-center">Create your account</CardTitle>
            <CardDescription className="text-center">
              Enter your details to register for an account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-pulse h-8 w-8 rounded-full bg-muted-foreground/20"></div>
              </div>
            ) : registrationEnabled === false ? (
              <div className="text-center py-8 px-4">
                <p className="text-muted-foreground">
                  Registration is currently disabled. Please sign in with an existing account or contact your administrator.
                </p>
                <Link 
                  href="/login" 
                  className="mt-4 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-primary border border-primary/30 hover:bg-primary/10"
                >
                  Go to Login
                </Link>
              </div>
            ) : (
              <RegisterForm />
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t bg-muted/10 px-8 py-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in instead
              </Link>
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  );
}