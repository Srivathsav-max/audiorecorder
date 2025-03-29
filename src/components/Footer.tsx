'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Headphones, Heart, Globe, Mail, Shield } from 'lucide-react';

export function Footer() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  if (!user) return null;

  return (
    <footer className="w-full border-t bg-background/75 backdrop-blur-lg">
      <div className="container max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Healthcare Communication Recorder</h4>
            <p className="text-xs text-muted-foreground">
              Enterprise-grade audio recording solution for healthcare professionals, 
              ensuring secure and compliant communication archives.
            </p>
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Heart className="h-3 w-3" />
              <span className="text-xs">Made with care for healthcare professionals</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between mt-8 pt-6 border-t">
          <p className="text-xs text-muted-foreground mt-4 sm:mt-0">
            © {currentYear} Healthcare Communication Recorder. All rights reserved.
          </p>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Shield className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium">HIPAA Compliant</span>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium">SOC 2 Certified</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
