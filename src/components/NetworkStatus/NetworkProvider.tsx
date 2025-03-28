'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { NetworkStatus } from './NetworkStatus';

interface NetworkContextType {
  isOnline: boolean;
  isUnstable: boolean;
  networkMetrics: {
    rtt: number;
    downlink: number;
    effectiveType: string;
    stabilityScore: number;
  };
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  isUnstable: false,
  networkMetrics: {
    rtt: 0,
    downlink: 0,
    effectiveType: '',
    stabilityScore: 1
  }
});

export const useNetwork = () => useContext(NetworkContext);

interface NetworkProviderProps {
  children: ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isUnstable, setIsUnstable] = useState(false);
  const [networkMetrics, setNetworkMetrics] = useState({
    rtt: 0,
    downlink: 0,
    effectiveType: '',
    stabilityScore: 1 // 0 to 1, where 1 is most stable
  });

  const samplesRef = useRef<number[]>([]);
  const UNSTABLE_THRESHOLD = 0.6;
  const ALPHA = 0.2; // Smoothing factor

  // Calculate stability score
  const calculateStabilityScore = useCallback((rtt: number, prevScore: number): number => {
    if (rtt <= 0) return prevScore;

    // Update samples using ref to avoid state dependency
    samplesRef.current = [...samplesRef.current.slice(-9), rtt];
    const samples = samplesRef.current;

    if (samples.length === 0) return prevScore;

    const avgRTT = samples.reduce((a: number, b: number) => a + b) / samples.length;
    const variance = samples.reduce((a: number, b: number) => a + Math.pow(b - avgRTT, 2), 0) / samples.length;
    const normalizedVariance = Math.min(variance / (avgRTT * avgRTT), 1);
    
    return (1 - ALPHA) * prevScore + ALPHA * (1 - normalizedVariance);
  }, []);

  // Update network metrics using Navigator Connection API and performance measurements
  const updateNetworkMetrics = useCallback(async () => {
    try {
      const connection = (navigator as Navigator & { connection?: { 
  rtt: number;
  downlink: number;
  effectiveType: string;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
} }).connection;
      let rtt = connection?.rtt || 0;
      const downlink = connection?.downlink || 0;
      const effectiveType = connection?.effectiveType || '';

      // Measure RTT if not available from connection API
      if (!rtt) {
        try {
          const start = performance.now();
          await fetch('/api/ping', { 
            method: 'HEAD',
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          });
          rtt = performance.now() - start;
        } catch {
          rtt = -1;
        }
      }

      // Update metrics state using functional updates
      setNetworkMetrics((prevMetrics) => {
        const newStabilityScore = calculateStabilityScore(rtt, prevMetrics.stabilityScore);
        return {
          rtt: rtt > 0 ? rtt : prevMetrics.rtt,
          downlink,
          effectiveType,
          stabilityScore: newStabilityScore
        };
      });

      // Update unstable state based on new stability score
      setIsUnstable(() => {
        const newScore = calculateStabilityScore(rtt, networkMetrics.stabilityScore);
        return newScore < UNSTABLE_THRESHOLD;
      });
    } catch (error: unknown) {
      console.error('Error updating network metrics:', error instanceof Error ? error.message : 'Unknown error');
    }
  }, [calculateStabilityScore, networkMetrics.stabilityScore]);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    updateNetworkMetrics();
  }, [updateNetworkMetrics]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setNetworkMetrics(prev => ({ ...prev, stabilityScore: 0 }));
    samplesRef.current = []; // Clear samples when offline
  }, []);

  // Monitor network quality
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { 
      rtt: number;
      downlink: number;
      effectiveType: string;
      addEventListener: (type: string, listener: EventListener) => void;
      removeEventListener: (type: string, listener: EventListener) => void;
    } }).connection;
    
    // Initial metrics update
    updateNetworkMetrics();

    // Set up periodic monitoring
    const monitor = setInterval(updateNetworkMetrics, 3000);

    // Listen for connection changes
    if (connection) {
      connection.addEventListener('change', updateNetworkMetrics);
    }

    // Cleanup
    return () => {
      clearInterval(monitor);
      if (connection) {
        connection.removeEventListener('change', updateNetworkMetrics);
      }
    };
  }, [updateNetworkMetrics]);

  useEffect(() => {
    // Set initial status
    setIsOnline(navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return (
    <NetworkContext.Provider value={{ 
      isOnline, 
      isUnstable,
      networkMetrics: {
        rtt: networkMetrics.rtt,
        downlink: networkMetrics.downlink,
        effectiveType: networkMetrics.effectiveType,
        stabilityScore: networkMetrics.stabilityScore
      }
    }}>
      {children}
      {/* Include the NetworkStatus component here to always show status */}
      <NetworkStatus />
    </NetworkContext.Provider>
  );
}
