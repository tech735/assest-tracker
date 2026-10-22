import * as React from 'react';
import type { BarcodeFormat } from 'barcode-detector/ponyfill';

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type NativeDetector = { new (opts?: { formats?: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> };
declare global {
  interface Window {
    BarcodeDetector?: NativeDetector;
  }
}

// Asset labels (QR) plus the 1D/2D codes manufacturers print on serial-number stickers.
const FORMATS: BarcodeFormat[] = ['qr_code', 'code_128', 'code_39', 'code_93', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'codabar', 'data_matrix', 'pdf417'];

/**
 * The browser's own BarcodeDetector where it exists (Android, macOS, ChromeOS); otherwise the bundled
 * ZXing reader (Windows Chrome/Edge, iPhone, Firefox). The fallback and its WASM load on first use,
 * from this site rather than a CDN.
 */
async function createDetector(): Promise<Detector> {
  const Native = window.BarcodeDetector;
  if (Native) {
    try {
      const supported = (await Native.getSupportedFormats?.()) ?? FORMATS;
      const formats = FORMATS.filter((f) => supported.includes(f));
      if (formats.includes('qr_code')) return new Native({ formats });
    } catch {
      /* fall through to the bundled reader */
    }
  }
  const [{ BarcodeDetector, setZXingModuleOverrides }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ]);
  setZXingModuleOverrides({ locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) });
  return new BarcodeDetector({ formats: FORMATS });
}

export type CameraState = 'starting' | 'on' | 'unsupported' | 'denied' | 'nocamera' | 'error';

export const CAMERA_MESSAGES: Record<Exclude<CameraState, 'starting' | 'on'>, string> = {
  unsupported: 'This browser can’t open the camera. Type the tag or serial, or use a USB scanner.',
  denied: 'Camera access is blocked. Allow the camera for this site (the camera icon in the address bar), then try again.',
  nocamera: 'No camera found on this device. Type the tag or serial, or use a USB scanner.',
  error: 'The camera couldn’t start — it may be in use by another app. Close it and try again.',
};

/**
 * Streams the rear camera into `videoRef` and reports decoded codes. Scanning pauses while `paused`
 * is true (e.g. while a result is on screen); the camera stays on so resuming is instant.
 */
export function useBarcodeCamera(
  videoRef: React.RefObject<HTMLVideoElement>,
  { enabled = true, paused = false, onCode }: { enabled?: boolean; paused?: boolean; onCode: (code: string) => void },
) {
  const [state, setState] = React.useState<CameraState>('starting');
  const [attempt, setAttempt] = React.useState(0);
  const onCodeRef = React.useRef(onCode);
  onCodeRef.current = onCode;
  const pausedRef = React.useRef(paused);
  pausedRef.current = paused;

  React.useEffect(() => {
    if (!enabled) return;
    let stream: MediaStream | undefined;
    let timer = 0;
    let stopped = false;
    setState('starting');

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setState('unsupported');
      try {
        // Ask for HD: laptop webcams default to 640×480, too blurry for thin 1D barcode lines.
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      } catch (e) {
        const name = e instanceof DOMException ? e.name : '';
        return setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'nocamera' : 'error');
      }
      if (stopped || !videoRef.current) return stream.getTracks().forEach((t) => t.stop());
      try {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = await createDetector();
        if (stopped) return;
        setState('on');
        const tick = async () => {
          if (stopped) return;
          const video = videoRef.current;
          if (!pausedRef.current && video && video.readyState >= 2) {
            try {
              const codes = await detector.detect(video);
              const code = codes.find((c) => c.rawValue)?.rawValue;
              if (code && !stopped && !pausedRef.current) onCodeRef.current(code);
            } catch {
              /* frame not ready */
            }
          }
          // ~8 decodes a second: smooth on phones and laptops without pegging the CPU.
          timer = window.setTimeout(tick, 120);
        };
        tick();
      } catch {
        if (!stopped) setState('error');
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled, attempt, videoRef]);

  return { state, retry: () => setAttempt((n) => n + 1) };
}
