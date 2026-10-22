import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CameraOff, CheckCircle2, Keyboard, RotateCcw, ScanLine, X, XCircle } from 'lucide-react';
import { useAssets } from '@/hooks/useSupabaseData';
import type { Asset } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { AssetThumb, StatusBadge } from '@/components/app/primitives';
import { displayLocation } from '@/lib/assetMeta';
import { findAssetByCode } from '@/lib/scan';
import { CAMERA_MESSAGES, useBarcodeCamera } from '@/hooks/useBarcodeCamera';

// Camera scanning works in every modern browser (see useBarcodeCamera). Manual entry and USB scanners,
// which type like a keyboard, always work too.

export function ScanDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const { data: assets = [] } = useAssets();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [manual, setManual] = React.useState('');
  const [result, setResult] = React.useState<{ code: string; asset?: Asset } | null>(null);

  const resolve = React.useCallback(
    (code: string) => {
      setResult({ code, asset: findAssetByCode(assets, code) });
      if ('vibrate' in navigator) navigator.vibrate?.(40);
    },
    [assets],
  );

  React.useEffect(() => {
    if (!open) {
      setResult(null);
      setManual('');
    }
  }, [open]);

  // Scanning pauses while a result is shown; "Scan another" resumes it.
  const { state: camera, retry } = useBarcodeCamera(videoRef, { enabled: open, paused: !!result, onCode: resolve });
  const cameraFailed = camera !== 'starting' && camera !== 'on';

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col bg-foreground text-background data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[620px] sm:w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:overflow-hidden sm:rounded-2xl sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-[.98]">
          <DialogPrimitive.Title className="sr-only">Scan asset label</DialogPrimitive.Title>
          <div className="flex items-center px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
            <DialogPrimitive.Close className="rounded-full p-1.5 hover:bg-background/10" aria-label="Close">
              <X className="h-6 w-6" />
            </DialogPrimitive.Close>
            <p className="flex-1 text-center text-[15px] font-semibold">Scan asset label</p>
            <span className="w-9" />
          </div>

          <div className="relative flex flex-1 flex-col items-center justify-center gap-5 overflow-hidden px-6">
            <video ref={videoRef} playsInline muted className={camera === 'on' ? 'absolute inset-0 h-full w-full object-cover opacity-70' : 'hidden'} />
            <div className={`relative h-64 w-64 rounded-3xl border-[3px] transition-colors duration-200 ${result?.asset ? 'border-success bg-success/20' : result ? 'border-destructive' : 'border-background/90'}`}>
              {!result && camera === 'on' && <div className="absolute left-5 right-5 top-1/2 h-0.5 animate-scan-line bg-success" />}
              {cameraFailed && !result && (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-background/80">
                  <CameraOff className="h-8 w-8" />
                  {CAMERA_MESSAGES[camera]}
                  {camera !== 'unsupported' && (
                    <Button size="sm" variant="secondary" onClick={retry} className="bg-background/15 text-background hover:bg-background/25">
                      <RotateCcw /> Try again
                    </Button>
                  )}
                </div>
              )}
              {camera === 'starting' && !result && <p className="flex h-full items-center justify-center text-sm text-background/70">Starting camera…</p>}
            </div>
            {!result && camera === 'on' && <p className="relative text-sm text-background/80">Point at the QR or barcode on the asset</p>}
          </div>

          {result ? (
            <div className="animate-sheet-up rounded-t-3xl bg-card px-5 pb-safe pt-4 text-foreground sm:rounded-none">
              {result.asset ? (
                <div className="space-y-4">
                  <span className="mx-auto flex w-fit items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-[13px] font-medium text-success-strong">
                    <CheckCircle2 className="h-4 w-4" /> Found · {result.asset.assetTag}
                  </span>
                  <div className="flex items-center gap-3">
                    <AssetThumb category={result.asset.category} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold">{result.asset.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusBadge status={result.asset.status} />
                        <span className="truncate text-xs text-muted-foreground">{result.asset.assignedTo || displayLocation(result.asset.location)}</span>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => go(`/assets/${result.asset!.id}${result.asset!.status === 'available' ? '?action=checkout' : result.asset!.status === 'assigned' ? '?action=checkin' : ''}`)}>
                    {result.asset.status === 'available' ? 'Check out to someone' : result.asset.status === 'assigned' ? 'Check in' : 'Open asset'}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" onClick={() => go(`/assets/${result.asset!.id}`)}>View details</Button>
                    <Button variant="secondary" onClick={() => setResult(null)}>Scan another</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <span className="mx-auto flex w-fit items-center gap-1.5 rounded-full bg-destructive-soft px-3 py-1 text-[13px] font-medium text-destructive-strong">
                    <XCircle className="h-4 w-4" /> Not in register
                  </span>
                  <p className="text-center text-sm text-muted-foreground">
                    No asset matches <span className="font-mono text-foreground">{result.code}</span>.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" onClick={() => setResult(null)}>Try again</Button>
                    <Button onClick={() => go(`/assets/new?serial=${encodeURIComponent(result.code)}`)}>Add as new asset</Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form
              className="relative flex gap-2 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (manual.trim()) resolve(manual);
              }}
            >
              <label className="flex flex-1 items-center gap-2 rounded-xl bg-background/10 px-3">
                <Keyboard className="h-4 w-4 text-background/70" />
                <input
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  autoFocus={cameraFailed}
                  placeholder="Type tag or serial (e.g. AST-1042)"
                  className="h-11 flex-1 bg-transparent text-sm text-background outline-none placeholder:text-background/50"
                />
              </label>
              <Button type="submit" className="h-11 bg-background text-foreground hover:bg-background/90">
                <ScanLine /> Find
              </Button>
            </form>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
