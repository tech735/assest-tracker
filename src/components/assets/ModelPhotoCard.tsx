import * as React from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import type { Asset } from '@/types/asset';
import { useAssets } from '@/hooks/useSupabaseData';
import { useAccess } from '@/hooks/useCollab';
import { useModelPhoto, useRemoveModelPhoto, useSetModelPhoto } from '@/hooks/usePurchases';
import { modelKey } from '@/lib/image';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/app/primitives';
import { DeviceArt, deviceKind } from '@/components/app/DeviceArt';

/** Product photo for the asset's brand + model — one photo, shown for every unit of that model. */
export function ModelPhotoCard({ asset }: { asset: Asset }) {
  const { toast } = useToast();
  const { can, access } = useAccess();
  const { data: assets = [] } = useAssets();
  const photo = useModelPhoto(asset);
  const setPhoto = useSetModelPhoto();
  const remove = useRemoveModelPhoto();
  const input = React.useRef<HTMLInputElement>(null);
  const canEdit = can('assets.edit');
  const model = [asset.brand, asset.model].filter(Boolean).join(' ');
  const key = modelKey(asset.brand, asset.model);
  const units = React.useMemo(() => assets.filter((a) => a.model && modelKey(a.brand, a.model) === key).length, [assets, key]);

  if (!photo && !canEdit) return null;

  const upload = async (file?: File) => {
    if (!file) return;
    try {
      await setPhoto.mutateAsync({ brand: asset.brand || '', model: asset.model, file, byName: access?.name || undefined, previous: photo });
      toast({ title: 'Photo saved', description: `Shown for every ${model}.` });
    } catch (e) {
      toast({ title: 'Couldn’t save the photo', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
    } finally {
      if (input.current) input.current.value = '';
    }
  };

  const drop = async () => {
    if (!photo) return;
    try {
      await remove.mutateAsync(photo);
      toast({ title: 'Photo removed' });
    } catch (e) {
      toast({ title: 'Couldn’t remove the photo', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };

  return (
    <SectionCard
      title="Product photo"
      action={
        canEdit && photo && (
          <Button size="icon-sm" variant="ghost" onClick={drop} disabled={remove.isPending} aria-label="Remove photo">
            <Trash2 />
          </Button>
        )
      }
    >
      <div className="flex h-44 items-center justify-center overflow-hidden rounded-lg border bg-white p-3">
        {photo ? (
          <img src={photo.url} alt={model} className="max-h-full max-w-full object-contain" />
        ) : (
          <DeviceArt kind={deviceKind(asset)} className="max-h-28 max-w-[200px] opacity-60" />
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {!asset.model
          ? 'Add a model to this asset to give it a product photo.'
          : photo
            ? `Shown for ${units > 1 ? `all ${units}` : 'every'} ${model}${photo.updatedByName ? ` · added by ${photo.updatedByName}` : ''}.`
            : `One photo covers every ${model}${units > 1 ? ` (${units} here)` : ''}.`}
      </p>
      {canEdit && asset.model && (
        <>
          <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={() => input.current?.click()} loading={setPhoto.isPending}>
            <ImagePlus /> {photo ? 'Replace photo' : 'Add photo'}
          </Button>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="sr-only" aria-label="Product photo" onChange={(e) => upload(e.target.files?.[0])} />
        </>
      )}
    </SectionCard>
  );
}
