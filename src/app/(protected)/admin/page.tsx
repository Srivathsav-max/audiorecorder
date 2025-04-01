'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Users, Disc, Settings, ArrowUpRight, Info } from 'lucide-react';
import { fetchWithAuth } from '@/lib/client-utils';
import { SystemStatus } from '@/components';
import BackendStatus from './BackendStatus';

interface DashboardStats {
  totalUsers: number;
  totalRecordings: number;
  registrationEnabled: boolean;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetchWithAuth('/api/admin/stats');

        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-7 w-40 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-80 bg-muted/60 rounded animate-pulse mt-2"></div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted/40 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center text-red-700 dark:text-red-400">
            <Info className="h-5 w-5 mr-2" />
            Error Loading Dashboard
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-300">
            There was a problem fetching the dashboard data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-4 rounded-lg border border-red-100 dark:border-red-800/50">
            <p>{error}</p>
          </div>
        </CardContent>
        <CardFooter>
          <button 
            onClick={() => window.location.reload()}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex items-center"
          >
            <ArrowUpRight className="h-4 w-4 mr-1" />
            Retry loading dashboard
          </button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Admin Dashboard</CardTitle>
          <CardDescription>
            System-wide overview and key performance indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative overflow-hidden rounded-xl border bg-white dark:bg-background p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold tracking-tight">Users</h3>
                </div>
                <div className="rounded-full bg-blue-50 dark:bg-blue-900/20 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                  Active
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-4">
                <div className="text-3xl font-bold">{stats?.totalUsers || 0}</div>
                <div className="text-sm text-muted-foreground">accounts</div>
              </div>
              <div className="h-1 w-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full mt-4"></div>
              <div className="absolute right-2 bottom-2 opacity-10">
                <Users className="h-24 w-24 text-blue-600" />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border bg-white dark:bg-background p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-2">
                    <Disc className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold tracking-tight">Recordings</h3>
                </div>
                <div className="rounded-full bg-purple-50 dark:bg-purple-900/20 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                  Secure
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-4">
                <div className="text-3xl font-bold">{stats?.totalRecordings || 0}</div>
                <div className="text-sm text-muted-foreground">audio files</div>
              </div>
              <div className="h-1 w-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full mt-4"></div>
              <div className="absolute right-2 bottom-2 opacity-10">
                <Disc className="h-24 w-24 text-purple-600" />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border bg-white dark:bg-background p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-2">
                    <Settings className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-semibold tracking-tight">Registration</h3>
                </div>
                <div className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  stats?.registrationEnabled 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                }`}>
                  {stats?.registrationEnabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-4">
                <div className="text-xl font-bold">
                  {stats?.registrationEnabled 
                    ? 'Open for new users' 
                    : 'Admin invites only'}
                </div>
              </div>
              <div className={`h-1 w-full rounded-full mt-4 ${
                stats?.registrationEnabled 
                  ? 'bg-gradient-to-r from-green-600 to-green-400' 
                  : 'bg-gradient-to-r from-red-600 to-red-400'
              }`}></div>
              <div className="absolute right-2 bottom-2 opacity-10">
                <Settings className="h-24 w-24 text-amber-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <SystemStatus />
          <BackendStatus />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center">
              <Info className="mr-2 h-5 w-5 text-primary" />
              Quick Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link 
                href="/admin/users" 
                className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-muted/20 transition-colors"
              >
                <Users className="h-8 w-8 mb-2 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium">Manage Users</span>
              </Link>
              <Link 
                href="/admin/recordings" 
                className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-muted/20 transition-colors"
              >
                <Disc className="h-8 w-8 mb-2 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium">Recordings</span>
              </Link>
              <Link 
                href="/admin/settings" 
                className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-muted/20 transition-colors"
              >
                <Settings className="h-8 w-8 mb-2 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium">Settings</span>
              </Link>
              <Link 
                href="/" 
                className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-muted/20 transition-colors"
              >
                <ArrowUpRight className="h-8 w-8 mb-2 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium">User View</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
