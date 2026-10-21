import * as React from 'react';
import { Eraser } from 'lucide-react';

/** Draw-to-sign canvas (mouse, touch, stylus). Emits a PNG data URL, or '' when cleared. */
export function SignaturePad({ onChange, height = 160 }: { onChange: (dataUrl: string) => void; height?: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const drawing = React.useRef(false);
  const last = React.useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = React.useState(true);

  const setup = React.useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const { width } = c.getBoundingClientRect();
    c.width = width * ratio;
    c.height = height * ratio;
    const ctx = c.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#12151B';
  }, [height]);

  React.useEffect(() => {
    setup();
  }, [setup]);

  const point = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (empty) setEmpty(false);
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (!empty) onChange(canvasRef.current!.toDataURL('image/png'));
  };
  const clear = () => {
    const c = canvasRef.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange('');
  };

  return (
    <div className="relative rounded-xl border-2 border-dashed border-border-strong bg-white">
      <canvas
        ref={canvasRef}
        style={{ height, touchAction: 'none' }}
        className="block w-full cursor-crosshair rounded-xl"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        aria-label="Signature area — draw your signature"
      />
      {empty && <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-faint">Sign here with your finger, stylus or mouse</p>}
      {!empty && (
        <button type="button" onClick={clear} className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-card px-2 py-1 text-xs font-medium text-muted-foreground shadow-xs hover:text-foreground">
          <Eraser className="h-3.5 w-3.5" /> Clear
        </button>
      )}
    </div>
  );
}
