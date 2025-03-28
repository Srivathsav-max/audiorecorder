'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function OfflineState() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <WifiOff className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">You are offline</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          An internet connection is required to record and access your files. 
          Please check your network connection and try again.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-background border">
            <h3 className="font-medium mb-1">Check your Wi-Fi</h3>
            <p className="text-sm text-muted-foreground">
              Make sure your device is connected to a working Wi-Fi network.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-background border">
            <h3 className="font-medium mb-1">Try mobile data</h3>
            <p className="text-sm text-muted-foreground">
              If Wi-Fi isn't available, switch to mobile data if possible.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-background border">
            <h3 className="font-medium mb-1">Restart your router</h3>
            <p className="text-sm text-muted-foreground">
              If you're at a fixed location, try restarting your network equipment.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleRefresh}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Page
        </Button>
      </CardFooter>
    </Card>
  );
}