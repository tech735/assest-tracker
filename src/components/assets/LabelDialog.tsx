import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import type { Asset } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const assetUrl = (asset: Pick<Asset, 'id'>) => `${window.location.origin}/assets/${asset.id}`;

function AssetLabel({ asset }: { asset: Asset }) {
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

/** Several labels at once (e.g. everything from one delivery), printed one after another. */
export function LabelsDialog({ assets, open, onOpenChange }: { assets: Asset[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{assets.length} asset label{assets.length === 1 ? '' : 's'}</DialogTitle>
          <DialogDescription>Each QR code opens its asset. Stick each label on the matching serial number.</DialogDescription>
        </DialogHeader>
        <div className="print-area -mx-1 flex-1 space-y-3 overflow-y-auto px-1">
          {assets.map((a) => <AssetLabel key={a.id} asset={a} />)}
        </div>
        <style>{`@media print { body * { visibility: hidden !important; } .print-area, .print-area * { visibility: visible !important; } .print-area { position: absolute; left: 0; top: 0; width: 90mm; overflow: visible !important; max-height: none !important; } .print-area .asset-label { break-inside: avoid; margin-bottom: 4mm; } }`}</style>
        <Button onClick={() => window.print()} className="w-full sm:w-auto sm:justify-self-end">
          <Printer /> Print {assets.length} label{assets.length === 1 ? '' : 's'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
