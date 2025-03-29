'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { redirect } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  
  // Show loading state or redirect if not an admin
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user || user.role !== 'ADMIN') {
    redirect('/');
  }
  
  // Extract the active tab from the pathname
  const getActiveTab = () => {
    if (pathname === '/admin') return 'dashboard';
    if (pathname.includes('/admin/users')) return 'users';
    if (pathname.includes('/admin/recordings')) return 'recordings';
    if (pathname.includes('/admin/settings')) return 'settings';
    return 'dashboard';
  };

  return (
    <div className="container max-w-7xl mx-auto p-6 sm:p-8 space-y-6">
      <Card className="p-4">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <Tabs defaultValue={getActiveTab()} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" asChild>
              <Link href="/admin">Overview</Link>
            </TabsTrigger>
            <TabsTrigger value="users" asChild>
              <Link href="/admin/users">Users</Link>
            </TabsTrigger>
            <TabsTrigger value="recordings" asChild>
              <Link href="/admin/recordings">Recordings</Link>
            </TabsTrigger>
            <TabsTrigger value="settings" asChild>
              <Link href="/admin/settings">Settings</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>
      
      <div>
        {children}
      </div>
    </div>
  );
}
