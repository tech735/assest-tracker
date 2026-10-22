import * as React from 'react';
import { CameraOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CAMERA_MESSAGES, useBarcodeCamera } from '@/hooks/useBarcodeCamera';

/**
 * Continuous camera scanning for audits: keeps scanning and reports each new code,
 * ignoring the same code for a short cooldown.
 */
export function CameraScanner({ onCode, cooldownMs = 2500 }: { onCode: (code: string) => void; cooldownMs?: number }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [flash, setFlash] = React.useState(false);
  const recent = React.useRef(new Map<string, number>());

  const { state, retry } = useBarcodeCamera(videoRef, {
    onCode: (code) => {
      const now = Date.now();
      if (now - (recent.current.get(code) || 0) <= cooldownMs) return;
      recent.current.set(code, now);
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
      navigator.vibrate?.(30);
      onCode(code);
    },
  });

  return (
    <div className="relative flex h-52 items-center justify-center overflow-hidden rounded-2xl bg-foreground text-background">
      <video ref={videoRef} playsInline muted className={state === 'on' ? 'absolute inset-0 h-full w-full object-cover opacity-80' : 'hidden'} />
      {state === 'on' && (
        <div className={`relative h-36 w-36 rounded-2xl border-[3px] transition-colors duration-200 ${flash ? 'border-success bg-success/25' : 'border-background/90'}`}>
          <div className="absolute left-3 right-3 top-1/2 h-0.5 animate-scan-line bg-success" />
        </div>
      )}
      {state === 'starting' && <p className="text-sm text-background/70">Starting camera…</p>}
      {state !== 'starting' && state !== 'on' && (
        <div className="flex max-w-sm flex-col items-center gap-2 px-6 text-center text-sm text-background/80">
          <CameraOff className="h-6 w-6" /> {CAMERA_MESSAGES[state]}
          {state !== 'unsupported' && (
            <Button size="sm" variant="secondary" onClick={retry} className="bg-background/15 text-background hover:bg-background/25">
              <RotateCcw /> Try again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
