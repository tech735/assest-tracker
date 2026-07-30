import { useRef, useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle, ScanLine, X, Plus } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Attachment,
    AttachmentMedia,
    AttachmentContent,
    AttachmentTitle,
    AttachmentDescription,
    AttachmentActions,
    AttachmentAction,
} from '@/components/ui/attachment';
import { useToast } from '@/hooks/use-toast';
import { useLocations, useSettings, useAssets } from '@/hooks/useSupabaseData';
import { Asset, AssetCategory, AssetStatus, AssetCondition } from '@/types/asset';
import * as supabaseService from '@/services/supabaseService';

interface BulkAssetAddDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    showTrigger?: boolean;
}

// CSV path
interface BulkAsset {
    name: string;
    category: string;
    serialNumber: string;
    status: string;
    location: string;
    assignedTo?: string;
}

// Manual path: one or more templates, each applied to its own `quantity` of units, all scanned in one global flow
interface AssetTemplate {
    category: string;
    brand: string;
    model: string;
    price: string;
    locationId: string;
    condition: AssetCondition;
    quantity: string;
}

const emptyTemplate: AssetTemplate = {
    category: '',
    brand: '',
    model: '',
    price: '',
    locationId: '',
    condition: 'new',
    quantity: '1',
};

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const conditionOptions: { value: AssetCondition; label: string }[] = [
    { value: 'new', label: 'New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
];

export function BulkAssetAddDialog({
    open: externalOpen,
    onOpenChange: setExternalOpen,
    showTrigger = true
}: BulkAssetAddDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'csv' | 'manual'>('csv');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedAssets, setProcessedAssets] = useState<BulkAsset[]>([]);

    // Manual batch wizard state - one or more product templates, each applied to its
    // own quantity of units. The scan step is one global flow across all of them.
    const [manualStep, setManualStep] = useState<'template' | 'scan'>('template');
    const [templates, setTemplates] = useState<AssetTemplate[]>([{ ...emptyTemplate }]);
    const [serials, setSerials] = useState<string[]>([]);
    const serialInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const { toast } = useToast();
    const { data: locations = [] } = useLocations();
    const { data: settings } = useSettings();
    const { data: assets = [] } = useAssets();

    // Derive unique categories from settings + current asset data, case-insensitive deduplication
    const uniqueCategories = Array.from(
        new Set(
            [...(settings?.categories || []), ...assets.map(asset => asset.category || '')]
                .map(cat => cat?.toLowerCase().trim())
                .filter(Boolean)
        )
    ).sort().map(cat => cat.charAt(0).toUpperCase() + cat.slice(1));

    // Derive unique brands from current asset data
    const uniqueBrands = Array.from(
        new Set(assets.map(asset => asset.brand?.trim()).filter(Boolean))
    ).sort();

    const open = externalOpen !== undefined ? externalOpen : internalOpen;
    const setOpen = (val: boolean) => {
        if (setExternalOpen) setExternalOpen(val);
        setInternalOpen(val);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Browsers/OS report inconsistent MIME types for CSV (e.g. Excel exports on
        // Windows often use 'application/vnd.ms-excel' or an empty string), so fall
        // back to checking the file extension rather than relying on file.type alone.
        const isCsv = file.name.toLowerCase().endsWith('.csv') ||
            ['text/csv', 'application/vnd.ms-excel', 'application/csv', 'text/plain'].includes(file.type);

        if (isCsv) {
            setCsvFile(file);
        } else {
            toast({
                title: "Invalid file type",
                description: "Please upload a CSV file.",
                variant: "destructive",
            });
        }
    };

    const processCsvFile = async () => {
        if (!csvFile) return;

        setIsProcessing(true);
        try {
            const text = await csvFile.text();
            const lines = text.split('\n').filter(line => line.trim());

            const assets: BulkAsset[] = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                if (values.length >= 5) {
                    assets.push({
                        name: values[0] || '',
                        category: values[1] || '',
                        serialNumber: values[2] || '',
                        status: values[3] || 'Available',
                        location: values[4] || '',
                        assignedTo: values[5] || ''
                    });
                }
            }

            setProcessedAssets(assets);
            toast({
                title: "CSV processed successfully",
                description: `Found ${assets.length} assets to add.`,
            });
        } catch (error) {
            toast({
                title: "Error processing CSV",
                description: "Please check your CSV format and try again.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const confirmBulkAdd = async () => {
        setIsProcessing(true);
        try {
            // Transform bulk assets to proper Asset format. Rows with an unresolvable
            // location are skipped (not thrown) so one bad row doesn't block the rest
            // of the batch from being created.
            const skippedAssets: string[] = [];
            const assetsToCreate: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>[] = [];

            for (const bulkAsset of processedAssets) {
                const normalizedLocation = bulkAsset.location?.trim().toLowerCase();
                const location = locations.find(loc => {
                    const name = loc.name.toLowerCase();
                    return name === normalizedLocation ||
                        (name === 'warehouse' && normalizedLocation === 'central warehouse') ||
                        (name === 'central warehouse' && normalizedLocation === 'warehouse');
                });

                if (!bulkAsset.location || !location) {
                    console.error(`Invalid location for asset ${bulkAsset.name}: ${bulkAsset.location}`);
                    skippedAssets.push(`${bulkAsset.name || 'Unnamed asset'} (unknown location "${bulkAsset.location}")`);
                    continue;
                }

                assetsToCreate.push({
                    assetTag: '', // Let database generate this via trigger
                    serialNumber: bulkAsset.serialNumber,
                    name: bulkAsset.name,
                    brand: 'Unknown', // Default value for bulk import
                    model: 'Unknown', // Default value for bulk import
                    // Category/status enums are stored lowercase in the DB, but CSV values
                    // are typically capitalized - normalize here.
                    category: bulkAsset.category.trim().toLowerCase() as AssetCategory,
                    status: (bulkAsset.status || 'available').trim().toLowerCase() as AssetStatus,
                    condition: 'good' as AssetCondition, // Default condition
                    location: location.name, // Use the actual location name
                    locationId: location.id, // Ensure locationId is set correctly
                    assignedTo: bulkAsset.assignedTo || undefined,
                    assignedToId: undefined,
                    purchaseDate: new Date().toISOString().split('T')[0], // Current date
                    purchaseCost: 0, // Default cost
                    vendor: 'Bulk Import', // Default vendor
                    warrantyStart: undefined,
                    warrantyEnd: undefined,
                    notes: 'Added via bulk import'
                });
            }

            if (skippedAssets.length > 0) {
                toast({
                    title: `${skippedAssets.length} asset(s) skipped`,
                    description: skippedAssets.slice(0, 3).join('; ') + (skippedAssets.length > 3 ? ', ...' : ''),
                    variant: "destructive",
                });
            }

            const createdAssets = await createAssetsSequentially(assetsToCreate);

            if (createdAssets.length > 0) {
                toast({
                    title: "Assets added successfully",
                    description: `${createdAssets.length} out of ${processedAssets.length} assets have been added to your inventory.`,
                });
            } else {
                toast({
                    title: "No assets added",
                    description: "Failed to add any assets. Please check the data and try again.",
                    variant: "destructive",
                });
            }

            setCsvFile(null);
            setProcessedAssets([]);
            setOpen(false);
        } catch (error) {
            toast({
                title: "Error adding assets",
                description: "Please try again later.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Shared: create assets one by one so a single failure doesn't block the rest of the batch
    const createAssetsSequentially = async (assetsToCreate: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>[]) => {
        const createdAssets: Asset[] = [];
        for (const asset of assetsToCreate) {
            try {
                const createdAsset = await supabaseService.createAsset(asset);
                createdAssets.push(createdAsset);
            } catch (error) {
                console.error('Failed to create asset:', asset.serialNumber, error);
                toast({
                    title: "Error creating asset",
                    description: `Failed to create asset (serial: ${asset.serialNumber || 'n/a'}). Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    variant: "destructive",
                });
            }
        }
        return createdAssets;
    };

    // ── Manual batch wizard ──────────────────────────────────────────────

    const updateTemplateField = (index: number, field: keyof AssetTemplate, value: string) => {
        setTemplates(prev => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
    };

    const addTemplateRow = () => {
        setTemplates(prev => [...prev, { ...emptyTemplate }]);
    };

    const removeTemplateRow = (index: number) => {
        setTemplates(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
    };

    const quantities = templates.map(t => Math.max(0, parseInt(t.quantity, 10) || 0));
    const totalQuantity = quantities.reduce((sum, q) => sum + q, 0);

    // Each template's slice of the global `serials` array: { template, start, count }
    const templateRanges = templates.reduce<{ template: AssetTemplate; start: number; count: number }[]>(
        (ranges, t, i) => {
            const start = ranges.length > 0 ? ranges[ranges.length - 1].start + ranges[ranges.length - 1].count : 0;
            ranges.push({ template: t, start, count: quantities[i] });
            return ranges;
        },
        []
    );

    const isTemplateComplete = (t: AssetTemplate, qty: number) =>
        !!(t.category && t.brand && t.model.trim() && t.price && Number(t.price) >= 0 &&
            t.locationId && t.condition && qty > 0);

    const areAllTemplatesValid = templates.every((t, i) => isTemplateComplete(t, quantities[i]));

    const proceedToScan = () => {
        if (!areAllTemplatesValid) {
            toast({
                title: "Missing details",
                description: "Please fill in all required fields (a valid quantity of at least 1) for every product before continuing.",
                variant: "destructive",
            });
            return;
        }
        serialInputRefs.current = Array(totalQuantity).fill(null);
        setSerials(Array(totalQuantity).fill(''));
        setManualStep('scan');
        setTimeout(() => serialInputRefs.current[0]?.focus(), 50);
    };

    const updateSerial = (index: number, value: string) => {
        setSerials(prev => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    const handleSerialKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (serials[index]?.trim() && index < serials.length - 1) {
                serialInputRefs.current[index + 1]?.focus();
            }
        }
    };

    const capturedCount = serials.filter(s => s.trim()).length;
    const trimmedSerials = serials.map(s => s.trim());
    const hasDuplicateSerials = trimmedSerials.some(
        (s, i) => s && trimmedSerials.indexOf(s) !== i
    );
    const allSerialsCaptured = serials.length > 0 && capturedCount === serials.length;

    const resetManualWizard = () => {
        setTemplates([{ ...emptyTemplate }]);
        setSerials([]);
        setManualStep('template');
    };

    const confirmManualBatchAdd = async () => {
        if (!allSerialsCaptured) {
            toast({
                title: "Scan all units",
                description: `Please enter a serial number for all ${serials.length} unit(s) before continuing.`,
                variant: "destructive",
            });
            return;
        }
        if (hasDuplicateSerials) {
            toast({
                title: "Duplicate serial numbers",
                description: "Each unit needs a unique serial number.",
                variant: "destructive",
            });
            return;
        }

        setIsProcessing(true);
        try {
            const assetsToCreate: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>[] = [];

            for (const { template: t, start, count } of templateRanges) {
                const location = locations.find(loc => loc.id === t.locationId);
                if (!location) {
                    toast({ title: "Invalid location", description: `Please select a valid location for ${t.brand} ${t.model}.`, variant: "destructive" });
                    return;
                }

                for (let i = 0; i < count; i++) {
                    assetsToCreate.push({
                        assetTag: '', // Let database generate this via trigger
                        serialNumber: trimmedSerials[start + i],
                        name: `${t.brand} ${t.model}`.trim(),
                        brand: t.brand,
                        model: t.model.trim(),
                        category: t.category.trim().toLowerCase() as AssetCategory,
                        status: 'available' as AssetStatus,
                        condition: t.condition,
                        location: location.name,
                        locationId: location.id,
                        assignedTo: undefined,
                        assignedToId: undefined,
                        purchaseDate: new Date().toISOString().split('T')[0],
                        purchaseCost: parseFloat(t.price) || 0,
                        vendor: 'Manual Batch Entry',
                        warrantyStart: undefined,
                        warrantyEnd: undefined,
                        notes: 'Added via manual batch entry',
                    });
                }
            }

            const createdAssets = await createAssetsSequentially(assetsToCreate);

            if (createdAssets.length > 0) {
                toast({
                    title: "Assets added successfully",
                    description: `${createdAssets.length} out of ${assetsToCreate.length} assets have been added to your inventory.`,
                });
            } else {
                toast({
                    title: "No assets added",
                    description: "Failed to add any assets. Please check the data and try again.",
                    variant: "destructive",
                });
            }

            resetManualWizard();
            setOpen(false);
        } catch (error) {
            toast({
                title: "Error adding assets",
                description: "Please try again later.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDialogClose = () => {
        setOpen(false);
        // Reset state when closing
        setTimeout(() => {
            setCsvFile(null);
            setProcessedAssets([]);
            setActiveTab('csv');
            resetManualWizard();
        }, 300);
    };

    const inManualWizard = activeTab === 'manual';
    const showTabSwitcher = processedAssets.length === 0 && (activeTab === 'csv' || manualStep === 'template');

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="right" className="w-full sm:max-w-none sm:w-[40vw] p-0 flex flex-col gap-0">
                <div className="px-6 py-5 border-b border-border shrink-0 space-y-1">
                    <SheetTitle>Add Bulk Assets</SheetTitle>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-6">

                {showTabSwitcher && (
                    <div className="flex space-x-2 mb-6">
                        <Button
                            variant={activeTab === 'csv' ? 'default' : 'outline'}
                            onClick={() => setActiveTab('csv')}
                            className="flex-1"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            CSV Upload
                        </Button>
                        <Button
                            variant={activeTab === 'manual' ? 'default' : 'outline'}
                            onClick={() => setActiveTab('manual')}
                            className="flex-1"
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Manual Entry
                        </Button>
                    </div>
                )}

                {activeTab === 'csv' && (
                    processedAssets.length === 0 ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Upload CSV File</CardTitle>
                                <CardDescription>
                                    Upload a CSV file with asset information. Expected columns: Name, Category, Serial Number, Status, Location, Assigned To (optional)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <input
                                    ref={csvInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                {!csvFile ? (
                                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                                        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                                        <p className="text-sm text-muted-foreground mb-3">
                                            Choose a CSV file or drag and drop
                                        </p>
                                        <Button variant="outline" size="sm" onClick={() => csvInputRef.current?.click()}>
                                            Choose File
                                        </Button>
                                    </div>
                                ) : (
                                    <Attachment>
                                        <AttachmentMedia>
                                            <FileText className="w-4 h-4" />
                                        </AttachmentMedia>
                                        <AttachmentContent>
                                            <AttachmentTitle>{csvFile.name}</AttachmentTitle>
                                            <AttachmentDescription>{formatFileSize(csvFile.size)}</AttachmentDescription>
                                        </AttachmentContent>
                                        <AttachmentActions>
                                            <AttachmentAction
                                                aria-label={`Remove ${csvFile.name}`}
                                                onClick={() => setCsvFile(null)}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </AttachmentAction>
                                        </AttachmentActions>
                                    </Attachment>
                                )}
                                {csvFile && (
                                    <div className="mt-4 flex justify-end">
                                        <Button
                                            onClick={processCsvFile}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                'Process CSV'
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg flex items-center">
                                    <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                                    Review Assets ({processedAssets.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-64 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left p-2">Name</th>
                                                <th className="text-left p-2">Category</th>
                                                <th className="text-left p-2">Serial Number</th>
                                                <th className="text-left p-2">Status</th>
                                                <th className="text-left p-2">Location</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {processedAssets.map((asset, index) => (
                                                <tr key={index} className="border-b">
                                                    <td className="p-2">{asset.name}</td>
                                                    <td className="p-2">{asset.category}</td>
                                                    <td className="p-2">{asset.serialNumber}</td>
                                                    <td className="p-2">{asset.status}</td>
                                                    <td className="p-2">{asset.location}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )
                )}

                {inManualWizard && manualStep === 'template' && (
                    <div className="space-y-4">
                        {templates.map((t, index) => (
                            <Card key={index}>
                                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-4">
                                    <div>
                                        <CardTitle className="text-lg">Product {index + 1}</CardTitle>
                                    </div>
                                    {templates.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon-xs"
                                            onClick={() => removeTemplateRow(index)}
                                            aria-label={`Remove product ${index + 1}`}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor={`tpl-category-${index}`}>Product Type *</Label>
                                            <Select value={t.category} onValueChange={(v) => updateTemplateField(index, 'category', v)}>
                                                <SelectTrigger id={`tpl-category-${index}`}>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {uniqueCategories.map((category) => (
                                                        <SelectItem key={category} value={category}>{category}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor={`tpl-brand-${index}`}>Brand *</Label>
                                            <Select value={t.brand} onValueChange={(v) => updateTemplateField(index, 'brand', v)}>
                                                <SelectTrigger id={`tpl-brand-${index}`}>
                                                    <SelectValue placeholder="Select brand" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {uniqueBrands.length === 0 ? (
                                                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No brands found yet</div>
                                                    ) : (
                                                        uniqueBrands.map((brand) => (
                                                            <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor={`tpl-model-${index}`}>Model *</Label>
                                            <Input
                                                id={`tpl-model-${index}`}
                                                value={t.model}
                                                onChange={(e) => updateTemplateField(index, 'model', e.target.value)}
                                                placeholder="e.g. Latitude 5420"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor={`tpl-price-${index}`}>Price *</Label>
                                            <Input
                                                id={`tpl-price-${index}`}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={t.price}
                                                onChange={(e) => updateTemplateField(index, 'price', e.target.value)}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor={`tpl-location-${index}`}>Location *</Label>
                                            <Select value={t.locationId} onValueChange={(v) => updateTemplateField(index, 'locationId', v)}>
                                                <SelectTrigger id={`tpl-location-${index}`}>
                                                    <SelectValue placeholder="Select location" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {locations.map((location) => (
                                                        <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor={`tpl-condition-${index}`}>Condition *</Label>
                                            <Select value={t.condition} onValueChange={(v) => updateTemplateField(index, 'condition', v as AssetCondition)}>
                                                <SelectTrigger id={`tpl-condition-${index}`}>
                                                    <SelectValue placeholder="Select condition" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {conditionOptions.map((c) => (
                                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor={`tpl-quantity-${index}`}>Quantity *</Label>
                                            <Input
                                                id={`tpl-quantity-${index}`}
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={t.quantity}
                                                onChange={(e) => updateTemplateField(index, 'quantity', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={addTemplateRow}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Another Product
                            </Button>
                            <Button onClick={proceedToScan}>
                                <ScanLine className="w-4 h-4 mr-2" />
                                Continue to Scan
                            </Button>
                        </div>
                    </div>
                )}

                {inManualWizard && manualStep === 'scan' && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <ScanLine className="w-5 h-5 text-primary" />
                                Scan Serial Numbers ({capturedCount} of {totalQuantity} captured)
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Scan or type the serial number for each unit below, pressing Enter to move to the next one - the flow continues across every product.
                                {hasDuplicateSerials && (
                                    <span className="block mt-1 text-destructive">Duplicate serial numbers detected - each unit needs a unique serial.</span>
                                )}
                            </p>
                        </div>

                        {templateRanges.map(({ template: t, start, count }, tIndex) => (
                            <Card key={tIndex}>
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-base">{t.brand} {t.model}</CardTitle>
                                    <CardDescription>
                                        {count} unit{count === 1 ? '' : 's'} · {t.category}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {Array.from({ length: count }).map((_, localIndex) => {
                                            const index = start + localIndex;
                                            const serial = serials[index] ?? '';
                                            const isDuplicate = !!serial.trim() && hasDuplicateSerials &&
                                                trimmedSerials.indexOf(serial.trim()) !== index;
                                            return (
                                                <div key={index} className="flex items-center gap-3">
                                                    <Label htmlFor={`serial-${index}`} className="w-16 shrink-0 text-sm text-muted-foreground">
                                                        Unit {index + 1}
                                                    </Label>
                                                    <Input
                                                        id={`serial-${index}`}
                                                        name={`serial-${index}`}
                                                        autoComplete="off"
                                                        ref={(el) => { serialInputRefs.current[index] = el; }}
                                                        value={serial}
                                                        onChange={(e) => updateSerial(index, e.target.value)}
                                                        onKeyDown={(e) => handleSerialKeyDown(index, e)}
                                                        placeholder="Scan or type serial number"
                                                        className={isDuplicate ? 'border-destructive' : ''}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setManualStep('template')}>
                                Back
                            </Button>
                            <Button
                                onClick={confirmManualBatchAdd}
                                disabled={isProcessing || !allSerialsCaptured || hasDuplicateSerials}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Adding Assets...
                                    </>
                                ) : (
                                    `Add ${totalQuantity} Assets`
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                </div>

                <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-end gap-2">
                    {activeTab === 'csv' && processedAssets.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={() => setProcessedAssets([])}
                        >
                            Back
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleDialogClose}>
                        Cancel
                    </Button>
                    {activeTab === 'csv' && processedAssets.length > 0 && (
                        <Button
                            onClick={confirmBulkAdd}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Adding Assets...
                                </>
                            ) : (
                                `Add ${processedAssets.length} Assets`
                            )}
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
