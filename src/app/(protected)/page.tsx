'use client';

import React from 'react';
import Link from 'next/link';
import { AudioRecordingSystem } from '@/components/AudioRecordingSystem';
import { OfflineState } from '@/components/OfflineState';
import { useNetwork } from '@/components/NetworkStatus';
import { useAuth } from '@/lib/auth-context';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const { isOnline } = useNetwork();
  const { user } = useAuth();

  return (
    <div className="container max-w-7xl mx-auto p-6 sm:p-8">
      {/* Welcome Section */}
      <section className="mb-8">
        <Card className="bg-gradient-to-r from-muted/30 to-background border-border/30">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="text-3xl font-bold">
                  Welcome, {user?.name || 'Healthcare Professional'}
                </CardTitle>
                <CardDescription className="text-base">
                  Securely record and archive communication sessions with integrated system and microphone audio.
                </CardDescription>
              </div>
              {user?.role === 'ADMIN' && (
                <Link href="/admin">
                  <Button variant="outline" className="flex items-center gap-2">
                    <div className="p-1 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                      <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span>Admin Dashboard</span>
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This enterprise-grade platform provides a secure environment for capturing and storing audio communications
              for healthcare professionals. All recordings are encrypted and stored securely, with access controls in place
              to ensure patient privacy and compliance with healthcare regulations.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Recorder Section */}
      <section>
        {isOnline ? (
          <AudioRecordingSystem />
        ) : (
          <OfflineState />
        )}
      </section>
    </div>
  );
}