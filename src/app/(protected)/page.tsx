'use client';

import React from 'react';
import { AudioRecordingSystem } from '@/components/AudioRecordingSystem';
import { OfflineState } from '@/components/OfflineState';
import { useNetwork } from '@/components/NetworkStatus';
import { useAuth } from '@/lib/auth-context';
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
            <CardTitle className="text-3xl font-bold">
              Welcome, {user?.name || 'Healthcare Professional'}
            </CardTitle>
            <CardDescription className="text-base">
              Securely record and archive communication sessions with integrated system and microphone audio.
            </CardDescription>
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