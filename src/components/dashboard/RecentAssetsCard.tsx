import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Asset, AssetStatus } from '@/types/asset';
import {
  Laptop,
  Smartphone,
  Monitor,
  Tablet,
  Headphones,
  Package,
} from 'lucide-react';

interface RecentAssetsCardProps {
  assets: Asset[];
}

const categoryIcons = {
  laptop: Laptop,
  desktop: Monitor,
  phone: Smartphone,
  tablet: Tablet,
  monitor: Monitor,
  accessory: Headphones,
  other: Package,
};

const statusVariants: Record<AssetStatus, 'available' | 'assigned' | 'repair' | 'lost' | 'retired'> = {
  available: 'available',
  assigned: 'assigned',
  repair: 'repair',
  lost: 'lost',
  retired: 'retired',
};

const statusLabels: Record<AssetStatus, string> = {
  available: 'Available',
  assigned: 'Assigned',
  repair: 'In Repair',
  lost: 'Lost',
  retired: 'Retired',
};

export function RecentAssetsCard({ assets }: RecentAssetsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Recent Assets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {assets.slice(0, 5).map((asset) => {
            const Icon = categoryIcons[asset.category] || Package;
            return (
              <div
                key={asset.id}
                className="flex items-center gap-4 p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{asset.name}</p>
                    <span className="text-xs text-muted-foreground">{asset.assetTag}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {asset.brand} · {asset.location === 'Warehouse' ? 'Central Warehouse' : asset.location}
                  </p>
                </div>
                <Badge variant={statusVariants[asset.status]}>
                  {statusLabels[asset.status]}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
