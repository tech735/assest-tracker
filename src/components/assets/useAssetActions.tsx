import * as React from 'react';
import type { Asset, AssetStatus } from '@/types/asset';
import { EditAssetDialog } from './EditAssetDialog';
import { DeleteAssetDialog } from './DeleteAssetDialog';
import { CheckOutDialog } from './CheckOutDialog';
import { ReturnAssetDialog } from './ReturnAssetDialog';
import { RepairAssetDialog } from './RepairAssetDialog';
import { LostAssetDialog } from './LostAssetDialog';
import { AddAssetDialog } from './AddAssetDialog';

export type AssetAction = 'edit' | 'clone' | 'assign' | 'return' | 'repair' | 'lost' | 'delete';

const cloneOf = (asset: Asset): Asset =>
  ({
    ...asset,
    name: `${asset.name} (Copy)`,
    serialNumber: '',
    status: 'available' as AssetStatus,
    assignedTo: undefined,
    assignedToId: undefined,
    purchaseCost: asset.purchaseCost || 0,
    vendor: asset.vendor || 'Unknown',
    notes: asset.notes ? `Cloned from: ${asset.name}\n${asset.notes}` : `Cloned from: ${asset.name}`,
  }) as Asset;

/**
 * One place that owns every per-asset dialog, so the list, quick view, detail page and
 * person profile all trigger the same flows. Render `dialogs` once in the page.
 */
export function useAssetActions() {
  const [state, setState] = React.useState<{ action: AssetAction; asset: Asset } | null>(null);
  const open = React.useCallback((action: AssetAction, asset: Asset) => setState({ action, asset }), []);
  const close = (o: boolean) => !o && setState(null);
  const is = (a: AssetAction) => state?.action === a;

  const dialogs = state ? (
    <>
      {is('edit') && <EditAssetDialog asset={state.asset} open onOpenChange={close} />}
      {is('delete') && <DeleteAssetDialog asset={state.asset} open onOpenChange={close} />}
      {is('assign') && <CheckOutDialog asset={state.asset} open onOpenChange={close} />}
      {is('return') && <ReturnAssetDialog assetId={state.asset.id} open onOpenChange={close} />}
      {is('repair') && <RepairAssetDialog asset={state.asset} open onOpenChange={close} />}
      {is('lost') && <LostAssetDialog asset={state.asset} open onOpenChange={close} />}
      {is('clone') && <AddAssetDialog asset={cloneOf(state.asset)} open onOpenChange={close} showTrigger={false} />}
    </>
  ) : null;

  return { open, dialogs };
}

/** The primary lifecycle action for an asset's current status. */
export const primaryAction = (status: AssetStatus): { action: AssetAction; label: string } | null => {
  switch (status) {
    case 'available':
      return { action: 'assign', label: 'Check out' };
    case 'assigned':
      return { action: 'return', label: 'Check in' };
    case 'repair':
      return { action: 'repair', label: 'Complete repair' };
    case 'lost':
      return { action: 'lost', label: 'Mark found' };
    default:
      return null;
  }
};
