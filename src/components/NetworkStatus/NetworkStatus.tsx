'use client';

import { useEffect, useState } from 'react';
import { useNetwork } from './NetworkProvider';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

type NetworkConnection = {
  rtt: number;
  downlink: number;
  effectiveType: string;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
};

export function NetworkStatus() {
  const { isOnline, isUnstable } = useNetwork();
  const [metrics, setMetrics] = useState({
    rtt: 0,
    downlink: 0,
    effectiveType: '',
  });

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: NetworkConnection }).connection;
    if (!connection) return;

    const updateMetrics = () => {
      setMetrics({
        rtt: connection.rtt || 0,
        downlink: connection.downlink || 0,
        effectiveType: connection.effectiveType || '',
      });
    };

    updateMetrics();
    connection.addEventListener('change', updateMetrics);
    return () => connection.removeEventListener('change', updateMetrics);
  }, []);

  const status = isOnline ? (isUnstable ? 'unstable' : 'online') : 'offline';
  const statusConfig = {
    online: {
      variant: 'secondary' as const,
      icon: Wifi,
      color: 'text-green-500',
      pulseColor: 'bg-green-500/50',
    },
    offline: {
      variant: 'destructive' as const,
      icon: WifiOff,
      color: 'text-red-500',
      pulseColor: 'bg-red-500/50',
    },
    unstable: {
      variant: 'default' as const,
      icon: AlertTriangle,
      color: 'text-yellow-500',
      pulseColor: 'bg-yellow-500/50',
    },
  }[status];

  const Icon = statusConfig.icon;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge 
        variant={statusConfig.variant}
        className={cn(
          "relative flex items-center transition-all duration-300",
          "backdrop-blur-md bg-background/80 shadow-lg border border-border/50",
          "group overflow-hidden rounded-full p-2",
          "hover:pr-6 hover:gap-3",
          "min-h-[2.5rem] min-w-[2.5rem]",
          statusConfig.color
        )}
      >
        <span className="relative shrink-0 flex items-center justify-center w-5 h-5">
          <Icon className="w-full h-full" />
          <span className={cn(
            "absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full",
            statusConfig.pulseColor,
            "animate-ping"
          )} />
        </span>
        
        {/* Status text that appears on hover */}
        <div className={cn(
          "flex items-center gap-3 overflow-hidden transition-all duration-300",
          "w-0 group-hover:w-auto opacity-0 group-hover:opacity-100"
        )}>
          <span className="whitespace-nowrap font-medium text-sm">
            {metrics.effectiveType || 'Unknown'}
          </span>
          {isUnstable && (
            <span className="whitespace-nowrap text-xs text-muted-foreground border-l border-border/50 pl-3">
              {metrics.rtt}ms • {metrics.downlink.toFixed(1)} Mbps
            </span>
          )}
        </div>
      </Badge>
    </div>
  );
}
