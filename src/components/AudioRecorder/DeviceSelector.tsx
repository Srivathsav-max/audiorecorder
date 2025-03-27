import React, { useCallback, useEffect, useState } from 'react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AudioDevice } from './types';

interface DeviceSelectorProps {
  audioDevices: AudioDevice[];
  selectedDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
  onRefreshDevices: () => void;
  disabled?: boolean;
  className?: string;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  audioDevices,
  selectedDeviceId,
  onDeviceChange,
  onRefreshDevices,
  disabled = false,
  className = '',
}) => {
  // Track loading state
  const [isLoading, setIsLoading] = useState(false);

  // Get current default device
  const defaultDevice = audioDevices.find(device => 
    device.id === 'default' || 
    device.id === 'communications' ||
    device.label.toLowerCase().includes('default')
  );

  // Get other devices (excluding default)
  const otherDevices = audioDevices.filter(device => 
    device.id !== 'default' && 
    device.id !== 'communications' &&
    !device.label.toLowerCase().includes('default')
  );

  // Handle refresh click
  const handleRefresh = useCallback(async (e: React.MouseEvent) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      
      setIsLoading(true);
      await onRefreshDevices();
      toast.success('Device list refreshed');
    } catch (error) {
      console.error('Error refreshing devices:', error);
      toast.error('Failed to refresh devices');
    } finally {
      setIsLoading(false);
    }
  }, [onRefreshDevices]);

  // Handle device selection
  const handleDeviceChange = useCallback(async (deviceId: string) => {
    try {
      // Test the selected device
      const testStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      // If we get here, the device works - clean up test stream
      testStream.getTracks().forEach(track => track.stop());
      
      // Update selected device
      onDeviceChange(deviceId);
      toast.success('Microphone switched successfully');
    } catch (error) {
      console.error('Error testing microphone:', error);
      toast.error('Failed to access the selected microphone. Please try another device.');
      
      // Revert to default if there's an error
      if (deviceId !== 'default') {
        onDeviceChange('default');
      }
    }
  }, [onDeviceChange]);

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-muted-foreground">
            Microphone Input
          </label>
          <Button 
            variant="ghost" 
            size="sm"
            type="button"
            className="h-7 px-2 text-xs relative"
            onClick={handleRefresh}
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-3 h-3 rounded-full border-2 border-r-transparent animate-spin absolute left-2" />
                <span className="ml-5">Refreshing...</span>
              </>
            ) : (
              'Refresh Devices'
            )}
          </Button>
        </div>
        
        <div className="relative w-full">
          <Select
            value={selectedDeviceId}
            onValueChange={handleDeviceChange}
            disabled={disabled || isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a microphone">
                {audioDevices.find(d => d.id === selectedDeviceId)?.label || 'Default Microphone'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="w-[var(--radix-select-trigger-width)] min-w-[300px]"
              align="start"
              sideOffset={4}
            >
              <SelectGroup>
                {defaultDevice && (
                  <>
                    <SelectLabel className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                      Default Device
                    </SelectLabel>
                    <SelectItem 
                      key={defaultDevice.id} 
                      value={defaultDevice.id}
                      className="py-2"
                    >
                      {defaultDevice.label}
                    </SelectItem>
                  </>
                )}
                
                {otherDevices.length > 0 && (
                  <>
                    <SelectLabel className="text-xs font-medium text-muted-foreground px-2 py-1.5 mt-2">
                      Other Devices
                    </SelectLabel>
                    {otherDevices.map((device) => (
                      <SelectItem 
                        key={device.id} 
                        value={device.id}
                        className="py-2"
                      >
                        {device.label}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        {audioDevices.length <= 1 && (
          <p className="text-xs text-amber-500 mt-1">
            Limited devices detected. Grant microphone permission and click "Refresh Devices".
          </p>
        )}
      </div>
    </div>
  );
};
