'use client';

import React from 'react';
import { AudioRecordingSystem } from '@/components/AudioRecordingSystem';
import { OfflineState } from '@/components/OfflineState';
import { useNetwork } from '@/components/NetworkStatus';
import Image from 'next/image';

export default function Home() {
  const { isOnline } = useNetwork();
  return (
    <main className="min-h-screen p-6 sm:p-10">
      <div className="max-w-4xl mx-auto p-5 sm:p-8">
        {/* Hero Section */}
        <div className="relative rounded-2xl p-8 mb-12">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/watchrx-logo-new.png"
              alt="WatchRX Logo"
              width={200}
              height={60}
              className="mb-6 drop-shadow-sm"
              priority
            />

            <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Healthcare Communication Recorder
            </h1>

            <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
              Enterprise-grade dual audio capture system designed for healthcare professionals.
              Securely records and archives communication sessions with integrated system and microphone audio.
            </p>
          </div>
        </div>

        {/* Conditional Render based on Network Status */}
        {isOnline ? (
          <AudioRecordingSystem />
        ) : (
          <OfflineState />
        )}
      </div>
    </main>
  );
}
