'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchWithAuth } from '@/lib/client-utils';
import { type SystemStatus as StatusType, type SystemStatusData } from '@/app/api/admin/system-status/route';

interface StatusItemProps {
  name: string;
  status: StatusType;
}

const StatusItem: React.FC<StatusItemProps> = ({ name, status }) => {
  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'outage':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: StatusType) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'degraded':
        return 'Degraded';
      case 'outage':
        return 'Outage';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{name}</span>
      <div className="flex items-center">
        <span className={`h-2.5 w-2.5 rounded-full ${getStatusColor(status)} mr-1.5`}></span>
        <span className="text-sm text-muted-foreground">{getStatusText(status)}</span>
      </div>
    </div>
  );
};

export const SystemStatus: React.FC = () => {
  const [statusData, setStatusData] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchSystemStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchWithAuth('/api/admin/system-status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch system status');
      }
      
      const data = await response.json();
      setStatusData(data);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      console.error('Error fetching system status:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
    
    // Refresh status every 5 minutes
    const interval = setInterval(fetchSystemStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center">
            <Activity className="mr-2 h-5 w-5 text-primary" />
            System Status
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchSystemStatus}
            disabled={loading}
            className="h-8 px-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm">
            Failed to load system status: {error}
          </div>
        ) : (
          <div className="space-y-4">
            <StatusItem name="API" status={statusData?.api.status || 'unknown'} />
            <StatusItem name="Storage" status={statusData?.storage.status || 'unknown'} />
            <StatusItem name="Authentication" status={statusData?.authentication.status || 'unknown'} />
            <StatusItem name="Database" status={statusData?.database.status || 'unknown'} />
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground border-t pt-4">
        Last updated: {lastUpdated || 'Never'}
      </CardFooter>
    </Card>
  );
};

export default SystemStatus;