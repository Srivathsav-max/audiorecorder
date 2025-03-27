import React, { useCallback, useState } from 'react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Image from 'next/image';
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
    <Collapsible className={`w-full ${className}`}>
      <div className="relative backdrop-blur-sm bg-background/95 rounded-lg border shadow-lg p-4 transition-all duration-300 hover:shadow-xl">
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
          <div className="bg-background rounded-full p-2 border shadow-md">
            <Image
              src="/microphone.svg"
              width={24}
              height={24}
              alt="Microphone"
              className="opacity-70"
            />
          </div>
        </div>
        
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between cursor-pointer pt-2">
            <div className="flex flex-col">
              <label className="text-sm font-medium">
                Microphone Input
              </label>
              <span className="text-xs text-muted-foreground">
                {audioDevices.find(d => d.id === selectedDeviceId)?.label || 'Default Microphone'}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              type="button"
              className={`h-8 relative transition-all duration-300 ${isLoading ? 'w-28' : 'w-24'}`}
              onClick={handleRefresh}
              disabled={disabled || isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full border-2 border-primary border-r-transparent animate-spin" />
                  <span className="text-xs">Refreshing</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform duration-300 ease-in-out hover:rotate-180"
                  >
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
                  </svg>
                  <span className="text-xs">Refresh</span>
                </div>
              )}
            </Button>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-4">
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

            {audioDevices.length <= 1 && (
              <p className="text-xs text-amber-500/90 bg-amber-50/30 rounded-md p-3 mt-4 flex items-center space-x-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-amber-500"
                >
                  <path d="M12 9v4M12 17h.01" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span>Limited devices detected. Grant microphone permission and refresh.</span>
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
