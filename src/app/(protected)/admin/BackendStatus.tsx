'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Server } from 'lucide-react';
import { fetchWithAuth } from '@/lib/client-utils';

type BackendStatus = 'operational' | 'degraded' | 'outage' | 'unknown';

interface BackendStatusData {
  status: BackendStatus;
  url: string;
  lastChecked: Date;
  responseMessage?: string;
  responseStatus?: number;
  errorDetails?: string;
}

const BackendStatus: React.FC = () => {
  const [statusData, setStatusData] = useState<BackendStatusData>({
    status: 'unknown',
    url: '',
    lastChecked: new Date()
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getStatusColor = (status: BackendStatus) => {
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

  const getStatusText = (status: BackendStatus) => {
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

  const checkBackendStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First, fetch system settings to get the backend URL
      const settingsResponse = await fetchWithAuth('/api/admin/settings');
      
      if (!settingsResponse.ok) {
        throw new Error('Failed to fetch system settings');
      }
      
      const settingsData = await settingsResponse.json();
      const backendUrl = settingsData.backendUrl || 'http://localhost:8000';
      let status: BackendStatus = 'unknown';
      
      // Check if backend is reachable
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout
        
        try {
          const healthEndpoint = `${backendUrl}/api/health`;
          const response = await fetch(healthEndpoint, { 
            method: 'GET',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const responseStatus = response.status;
          let responseMessage = '';
          
          if (response.ok) {
            try {
              const data = await response.json();
              responseMessage = data.message || JSON.stringify(data);
              
              // Check for expected specific message format
              if (data && data.status === "healthy") {
                status = 'operational';
              } else {
                // Response OK but unexpected format
                status = 'degraded';
                console.warn('Backend returned unexpected response format:', data);
              }
            } catch (error: unknown) {
              // Invalid JSON response
              status = 'degraded';
              responseMessage = 'Invalid JSON response';
              console.warn('Backend returned invalid JSON:', error);
            }
          } else {
            status = 'degraded';
            try {
              const errorData = await response.text();
              responseMessage = errorData || 'No error details available';
            } catch (error: unknown) {
              responseMessage = 'Could not parse error response';
            }
          }
          
          setStatusData({
            status,
            url: backendUrl,
            lastChecked: new Date(),
            responseMessage,
            responseStatus
          });
          
        } catch (error: unknown) {
          clearTimeout(timeoutId);
          let errorDetails = 'Unknown error';
          
          if (error instanceof Error) {
            errorDetails = error.message;
            if (error.name === 'AbortError') {
              status = 'degraded'; // Timeout is considered degraded
              errorDetails = 'Request timed out after 5 seconds';
            } else {
              status = 'outage';
            }
          } else {
            status = 'outage';
            console.error('Unknown error type:', error);
          }
          
          setStatusData({
            status,
            url: backendUrl,
            lastChecked: new Date(),
            errorDetails
          });
        }
      } catch (error: unknown) {
        console.error('Backend check failed:', error);
        status = 'outage';
        
        setStatusData({
          status,
          url: backendUrl,
          lastChecked: new Date(),
          errorDetails: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    } catch (error: unknown) {
      console.error('Error checking backend status:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBackendStatus();
    
    // Refresh status every 5 minutes
    const interval = setInterval(checkBackendStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center">
            <Server className="mr-2 h-5 w-5 text-primary" />
            Backend Microservice
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkBackendStatus}
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
            Failed to check backend status: {error}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Speech2Transcript Service</span>
              <div className="flex items-center">
                <span className={`h-2.5 w-2.5 rounded-full ${getStatusColor(statusData.status)} mr-1.5`}></span>
                <span className="text-sm text-muted-foreground">{getStatusText(statusData.status)}</span>
              </div>
            </div>
            
            <div className="text-xs p-3 bg-muted/30 rounded-md space-y-2">
              <div className="mb-1 font-medium">Backend URL:</div>
              <code className="break-all">{statusData.url}</code>
              
              {statusData.responseMessage && (
                <div className="mt-3 pt-2 border-t border-muted">
                  <div className="font-medium mb-1">Response:</div>
                  <code className="block p-2 bg-background/50 rounded overflow-x-auto">
                    {statusData.responseMessage}
                  </code>
                </div>
              )}
              
              {statusData.responseStatus && (
                <div className="text-xs mt-1">
                  Status code: <span className="font-mono">{statusData.responseStatus}</span>
                </div>
              )}
              
              {statusData.errorDetails && (
                <div className="mt-3 pt-2 border-t border-muted text-red-600 dark:text-red-400">
                  <div className="font-medium mb-1">Error:</div>
                  <code className="block p-2 bg-red-50 dark:bg-red-900/10 rounded overflow-x-auto">
                    {statusData.errorDetails}
                  </code>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground border-t pt-4">
        Last checked: {statusData.lastChecked.toLocaleString()}
      </CardFooter>
    </Card>
  );
};

export { BackendStatus };
export default BackendStatus;
