import * as React from 'react';
import { CameraOff } from 'lucide-react';

/**
 * Continuous camera scanning for audits: keeps scanning and reports each new code,
 * ignoring the same code for a short cooldown. Uses the browser BarcodeDetector.
 */
export function CameraScanner({ onCode, cooldownMs = 2500 }: { onCode: (code: string) => void; cooldownMs?: number }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [state, setState] = React.useState<'starting' | 'on' | 'unavailable'>('starting');
  const [flash, setFlash] = React.useState(false);
  const recent = React.useRef(new Map<string, number>());
  const cb = React.useRef(onCode);
  cb.current = onCode;

  React.useEffect(() => {
    let stream: MediaStream | undefined;
    let raf = 0;
    let stopped = false;
    (async () => {
      if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) return setState('unavailable');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setState('on');
        const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix'] });
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            for (const c of await detector.detect(videoRef.current)) {
              const now = Date.now();
              if (c.rawValue && now - (recent.current.get(c.rawValue) || 0) > cooldownMs) {
                recent.current.set(c.rawValue, now);
                setFlash(true);
                setTimeout(() => setFlash(false), 200);
                navigator.vibrate?.(30);
                cb.current(c.rawValue);
              }
            }
          } catch {
            /* frame not ready */
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setState('unavailable');
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cooldownMs]);

  return (
    <div className="relative flex h-52 items-center justify-center overflow-hidden rounded-2xl bg-foreground text-background">
      <video ref={videoRef} playsInline muted className={state === 'on' ? 'absolute inset-0 h-full w-full object-cover opacity-80' : 'hidden'} />
      {state === 'on' && (
        <div className={`relative h-36 w-36 rounded-2xl border-[3px] transition-colors duration-200 ${flash ? 'border-success bg-success/25' : 'border-background/90'}`}>
          <div className="absolute left-3 right-3 top-1/2 h-0.5 animate-scan-line bg-success" />
        </div>
      )}
      {state === 'starting' && <p className="text-sm text-background/70">Starting camera…</p>}
      {state === 'unavailable' && (
        <p className="flex max-w-xs flex-col items-center gap-2 px-6 text-center text-sm text-background/80">
          <CameraOff className="h-6 w-6" /> Camera scanning isn’t available in this browser — use a USB scanner or type the tag.
        </p>
      )}
    </div>
  );
}
