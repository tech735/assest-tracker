import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import type { Asset } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const assetUrl = (asset: Pick<Asset, 'id'>) => `${window.location.origin}/assets/${asset.id}`;

export function AssetLabel({ asset }: { asset: Asset }) {
  return (
    <div className="asset-label flex items-center gap-4 rounded-lg border-2 border-foreground bg-white p-4 text-black">
      <QRCodeSVG value={assetUrl(asset)} size={84} level="M" marginSize={0} />
      <div className="min-w-0">
        <p className="font-mono text-lg font-semibold leading-tight">{asset.assetTag}</p>
        <p className="truncate text-sm font-medium">{asset.name}</p>
        <p className="text-xs">S/N {asset.serialNumber || '—'}</p>
        <p className="mt-1 text-[10px]">Property of KOTU · if found contact tech@kotu.co.in</p>
      </div>
    </div>
  );
}

/** Prints only the label (other content is hidden by the print stylesheet below). */
export function LabelDialog({ asset, open, onOpenChange }: { asset: Asset; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asset label</DialogTitle>
          <DialogDescription>The QR code opens this asset — scan it to check in or out.</DialogDescription>
        </DialogHeader>
        <div className="print-area">
          <AssetLabel asset={asset} />
        </div>
        <style>{`@media print { body * { visibility: hidden !important; } .print-area, .print-area * { visibility: visible !important; } .print-area { position: fixed; left: 0; top: 0; width: 90mm; } }`}</style>
        <Button onClick={() => window.print()} className="w-full sm:w-auto sm:justify-self-end">
          <Printer /> Print label
        </Button>
      </DialogContent>
    </Dialog>
  );
}
