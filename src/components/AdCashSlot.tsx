import { useEffect, useRef } from 'react';

/** Espaço dedicado ao autotag AdCash no sidebar, separado do AdSense. */
export default function AdCashSlot() {
  const initialized = useRef(false);

  useEffect(() => {
    const start = () => {
      const adcash = (window as any).aclib;
      if (!initialized.current && adcash && typeof adcash.runBanner === 'function') {
        initialized.current = true;
        adcash.runBanner({ zoneId: '12080082' });
      }
    };

    start();
    const timer = window.setTimeout(start, 800);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      id="adcash-sidebar-zone"
      className="w-full min-h-[250px] bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden"
      aria-label="Publicidade AdCash"
    >
      <span className="text-[9px] uppercase tracking-widest text-slate-300">Publicidade</span>
    </div>
  );
}
