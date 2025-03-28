'use client';

import { useEffect, useState } from 'react';
import { useNetwork } from './NetworkProvider';
import { cn } from '@/lib/utils';

type NetworkConnection = {
  rtt: number;
  downlink: number;
  effectiveType: string;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
};

export function NetworkStatus() {
  const { isOnline, isUnstable } = useNetwork();
  const [showDetails, setShowDetails] = useState(false);
  const [metrics, setMetrics] = useState({
    rtt: 0,
    downlink: 0,
    effectiveType: '',
  });

  useEffect(() => {
    const updateMetrics = () => {
      const connection = (navigator as Navigator & { connection?: NetworkConnection }).connection;
      if (connection) {
        setMetrics({
          rtt: connection.rtt || 0,
          downlink: connection.downlink || 0,
          effectiveType: connection.effectiveType || '',
        });
      }
    };

    updateMetrics();
    const connection = (navigator as Navigator & { connection?: NetworkConnection }).connection;
    if (connection) {
      connection.addEventListener('change', updateMetrics);
      return () => connection.removeEventListener('change', updateMetrics);
    }
  }, []);

  const status = isOnline ? (isUnstable ? 'unstable' : 'online') : 'offline';

  const statusConfig = {
    online: {
      color: 'bg-green-500',
      text: 'Connected',
      icon: '●',
    },
    offline: {
      color: 'bg-red-500',
      text: 'Offline',
      icon: '○',
    },
    unstable: {
      color: 'bg-orange-500',
      text: 'Unstable Connection',
      icon: '◐',
    },
  }[status];

  return (
    <div 
      className="fixed bottom-4 right-4 flex flex-col items-end gap-2"
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      <div className={cn(
        'flex items-center gap-2 rounded-full px-3 py-1.5 shadow-lg transition-all duration-200',
        'bg-white/10 backdrop-blur-sm hover:bg-white/20',
        showDetails && isUnstable && 'rounded-t-lg rounded-b-none'
      )}>
        <div className={cn('h-2 w-2 rounded-full animate-pulse', statusConfig.color)} />
        <span className="text-sm font-medium">{statusConfig.text}</span>
      </div>

      {/* Network metrics panel */}
      {showDetails && isUnstable && (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-3 text-sm">
          <div className="space-y-1">
            <p>Round-trip Time: {metrics.rtt}ms</p>
            <p>Connection: {metrics.effectiveType.toUpperCase()}</p>
            <p>Download Speed: {metrics.downlink.toFixed(1)} Mbps</p>
          </div>
        </div>
      )}
    </div>
  );
}
