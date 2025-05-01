/* eslint-disable @typescript-eslint/no-unused-vars */
// utils/devicechange-fix.ts - Fix for the "addEventListener is not a function" error

/**
 * This script fixes the "_c.addEventListener is not a function" error
 * that occurs on iOS Chrome with LiveKit's device management.
 */

// Apply the fix immediately when imported
(function fixDeviceChangeListener() {
    // Only apply on iOS browsers
    const isIOS = 
      ['iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document) ||
      (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad'));
    
    if (!isIOS) return;
    
    console.log('[DeviceChange Fix] Applying patch for iOS devices...');
    
    // Patch MediaDevices to safely handle devicechange events
    if (navigator.mediaDevices && !navigator.mediaDevices.addEventListener) {
      console.log('[DeviceChange Fix] Adding mediaDevices.addEventListener polyfill');
      
      // Add the missing methods to mediaDevices
      navigator.mediaDevices.addEventListener = function(
        type: string, 
        _listener: EventListenerOrEventListenerObject, 
        _options?: boolean | AddEventListenerOptions
      ): void {
        console.log(`[DeviceChange Fix] Ignored devicechange listener for: ${type}`);
        // We're not actually adding the listener since it's not supported
        // But we avoid the crash by providing this dummy method
        return;
      };
      
      navigator.mediaDevices.removeEventListener = function(
        type: string, 
        _listener: EventListenerOrEventListenerObject, 
        _options?: boolean | EventListenerOptions
      ): void {
        console.log(`[DeviceChange Fix] Ignored devicechange removal for: ${type}`);
        return;
      };
      
      // Also add dispatchEvent for completeness
      navigator.mediaDevices.dispatchEvent = function(event: Event): boolean {
        console.log(`[DeviceChange Fix] Ignored dispatchEvent for: ${event.type}`);
        return true;
      };
      
      console.log('[DeviceChange Fix] MediaDevices listeners patched');
    }
  })();
  
  // Export a function that can be called to apply the fix manually if needed
  export const fixDeviceChangeListener = (): void => {
    console.log('[DeviceChange Fix] Fix already applied on import');
  };
  
  export default fixDeviceChangeListener;