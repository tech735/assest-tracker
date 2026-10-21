import * as React from 'react';
import { Download, FileImage, FileText, Paperclip, Send, Trash2, Upload } from 'lucide-react';
import type { Asset, AssetFile, AssetFileKind } from '@/types/asset';
import { useAccess, useAddAssetNote, useAssetFiles, useDeleteAssetFile, useUploadAssetFile } from '@/hooks/useCollab';
import { getAssetFileUrl } from '@/services/collabService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PersonAvatar } from '@/components/app/primitives';
import { formatDate } from '@/lib/assetMeta';
import { cn } from '@/lib/utils';

/* ---------------- Note composer ---------------- */

export function NoteComposer({ asset }: { asset: Asset }) {
  const { toast } = useToast();
  const { access } = useAccess();
  const add = useAddAssetNote(asset.id);
  const [body, setBody] = React.useState('');
  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    try {
      await add.mutateAsync({ body: text, authorName: access?.name || access?.email || undefined });
      setBody('');
    } catch (e) {
      toast({ title: 'Couldn’t add note', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
    }
  };
  return (
    <div className="flex items-start gap-2.5 rounded-xl border bg-card px-3 py-2.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
      <PersonAvatar name={access?.name || access?.email || 'You'} size="sm" className="mt-1" />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
        }}
        rows={body.includes('\n') ? 3 : 1}
        placeholder="Add a note — e.g. “Dead pixel near the corner”"
        className="min-h-[32px] flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-faint focus-visible:ring-0"
        aria-label="Add a note"
      />
      <Button size="icon-sm" variant={body.trim() ? 'default' : 'ghost'} disabled={!body.trim()} loading={add.isPending} onClick={submit} aria-label="Post note">
        {!add.isPending && <Send />}
      </Button>
    </div>
  );
}

/* ---------------- Files ---------------- */

const KIND_LABEL: Record<AssetFileKind, string> = { invoice: 'Invoice', handover: 'Handover form', repair: 'Repair / quote', photo: 'Photo', other: 'Other' };
const fmtSize = (b?: number) => (b == null ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

export function AssetFilesPanel({ asset }: { asset: Asset }) {
  const { toast } = useToast();
  const { access, can } = useAccess();
  const { data: files = [], isLoading, error } = useAssetFiles(asset.id);
  const upload = useUploadAssetFile(asset.id);
  const remove = useDeleteAssetFile(asset.id);
  const [kind, setKind] = React.useState<AssetFileKind>('invoice');
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const canUpload = can('assets.edit') || can('maintenance.manage') || can('assets.checkout');

  const send = async (list: FileList | null) => {
    if (!list?.length) return;
    for (const f of Array.from(list)) {
      if (f.size > 20 * 1024 * 1024) {
        toast({ title: `${f.name} is over 20 MB`, variant: 'destructive' });
        continue;
      }
      try {
        await upload.mutateAsync({ file: f, kind: f.type.startsWith('image/') && kind === 'other' ? 'photo' : kind, by: access?.name || undefined });
      } catch (e) {
        toast({ title: `Couldn’t upload ${f.name}`, description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
      }
    }
  };
  const open = async (f: AssetFile, download = false) => {
    try {
      const url = await getAssetFileUrl(f.storagePath, download ? f.fileName : undefined);
      window.open(url, '_blank', 'noopener');
    } catch {
      toast({ title: 'Couldn’t open file', variant: 'destructive' });
    }
  };

  if (error) return <p className="text-sm text-muted-foreground">File attachments aren’t enabled yet — apply migration 0010 in Supabase.</p>;

  return (
    <div className="space-y-4">
      {canUpload && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); send(e.dataTransfer.files); }}
          className={cn('flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors sm:flex-row sm:text-left', dragging ? 'border-ring bg-primary-soft' : 'border-border-strong')}
        >
          <Upload className="h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="flex-1 text-sm text-muted-foreground">Drop invoices, repair quotes or photos here (max 20 MB)</p>
          <Select value={kind} onValueChange={(v) => setKind(v as AssetFileKind)}>
            <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(KIND_LABEL) as AssetFileKind[]).map((k) => <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="secondary" loading={upload.isPending} onClick={() => inputRef.current?.click()}>
            <Paperclip /> Browse
          </Button>
          <input ref={inputRef} type="file" multiple className="sr-only" onChange={(e) => { send(e.target.files); e.target.value = ''; }} />
        </div>
      )}
      {isLoading ? (
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
      ) : files.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No files yet.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {files.map((f) => {
            const Icon = f.mimeType?.startsWith('image/') ? FileImage : FileText;
            return (
              <li key={f.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <button onClick={() => open(f)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-medium hover:underline">{f.fileName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {KIND_LABEL[f.kind]} · {fmtSize(f.sizeBytes)} · {formatDate(f.createdAt)}{f.uploadedByName ? ` · ${f.uploadedByName}` : ''}
                  </span>
                </button>
                <Button size="icon-sm" variant="ghost" onClick={() => open(f, true)} aria-label={`Download ${f.fileName}`}>
                  <Download />
                </Button>
                {can('assets.edit') && (
                  <Button size="icon-sm" variant="ghost" onClick={() => remove.mutate(f)} aria-label={`Delete ${f.fileName}`}>
                    <Trash2 />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
