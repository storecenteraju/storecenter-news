import React, { useEffect, useRef } from 'react';

interface AdSenseSlotProps {
  code: string | undefined;
  className?: string;
  minHeight?: string;
}

export default function AdSenseSlot({ code, className = '', minHeight = '90px' }: AdSenseSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!code) return;
    try {
      // Clean script tags from the AdSense integration code (React innerHTML block bypass)
      const cleanCode = code.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      if (containerRef.current) {
        containerRef.current.innerHTML = cleanCode;
        
        // Asynchronously push unique slot instance once the DOM element mount settles
        setTimeout(() => {
          try {
            const adsbygoogle = (window as any).adsbygoogle || [];
            adsbygoogle.push({});
          } catch (err) {
            // Silence push state errors when browser extensions block tracking script or loading in preview
          }
        }, 100);
      }
    } catch (e) {
      console.error("AdSense Slot activation error:", e);
    }
  }, [code]);

  if (!code) {
    return <div className={`w-full ${className}`} style={{ minHeight }} />;
  }

  return (
    <div 
      ref={containerRef} 
      className={`w-full flex justify-center items-center overflow-x-auto ${className}`}
      style={{ minHeight }}
    />
  );
}
