import { useState } from 'react';
import { Upload, FileText, Plus, X, Loader2, CheckCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLocations, useSettings, useAssets } from '@/hooks/useSupabaseData';
import { AssetCategory } from '@/types/asset';
import * as supabaseService from '@/services/supabaseService';

interface BulkAssetAddDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    showTrigger?: boolean;
}

interface BulkAsset {
    name: string;
    category: string;
    serialNumber: string;
    status: string;
    location: string;
    assignedTo?: string;
}

export function BulkAssetAddDialog({
    open: externalOpen,
    onOpenChange: setExternalOpen,
    showTrigger = true
}: BulkAssetAddDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'csv' | 'manual'>('csv');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [manualAssets, setManualAssets] = useState<BulkAsset[]>([
        { name: '', category: '', serialNumber: '', status: 'Available', location: '' }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedAssets, setProcessedAssets] = useState<BulkAsset[]>([]);
    const { toast } = useToast();
    const { data: locations = [] } = useLocations();
    const { data: settings } = useSettings();
    const { data: assets = [] } = useAssets();
    
    // Derive unique categories from current asset data with case-insensitive deduplication
    const uniqueCategories = Array.from(
        new Set(
            assets.map(asset => asset.category?.toLowerCase().trim()).filter(Boolean)
        )
    ).sort().map(cat => cat.charAt(0).toUpperCase() + cat.slice(1));

    const open = externalOpen !== undefined ? externalOpen : internalOpen;
    const setOpen = (val: boolean) => {
        if (setExternalOpen) setExternalOpen(val);
        setInternalOpen(val);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'text/csv') {
            setCsvFile(file);
        } else {
            toast({
                title: "Invalid file type",
                description: "Please upload a CSV file.",
                variant: "destructive",
            });
        }
    };

    const handleManualAssetChange = (index: number, field: keyof BulkAsset, value: string) => {
        const updatedAssets = [...manualAssets];
        updatedAssets[index] = { ...updatedAssets[index], [field]: value };
        setManualAssets(updatedAssets);
    };

    const addManualAssetRow = () => {
        setManualAssets([
            ...manualAssets,
            { name: '', category: '', serialNumber: '', status: 'Available', location: '' }
        ]);
    };

    const removeManualAssetRow = (index: number) => {
        if (manualAssets.length > 1) {
            setManualAssets(manualAssets.filter((_, i) => i !== index));
        }
    };

    const processCsvFile = async () => {
        if (!csvFile) return;

        setIsProcessing(true);
        try {
            const text = await csvFile.text();
            const lines = text.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim());
            
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

    const processManualAssets = () => {
        const validAssets = manualAssets.filter(asset => 
            asset.name && asset.category && asset.serialNumber && asset.location
        );
        
        if (validAssets.length === 0) {
            toast({
                title: "No valid assets",
                description: "Please fill in at least one complete asset entry.",
                variant: "destructive",
            });
            return;
        }

        setProcessedAssets(validAssets);
        toast({
            title: "Assets ready to add",
            description: `${validAssets.length} assets ready to be added.`,
        });
    };

    const confirmBulkAdd = async () => {
        setIsProcessing(true);
        try {
            // Transform bulk assets to proper Asset format
            const assetsToCreate = processedAssets.map(bulkAsset => {
                // Find location ID from location name
                const location = locations.find(loc => loc.name === bulkAsset.location);
                
                // Ensure location is properly selected
                if (!bulkAsset.location || !location) {
                    console.error(`Invalid location for asset ${bulkAsset.name}: ${bulkAsset.location}`);
                    throw new Error(`Invalid location: ${bulkAsset.location}. Please select a valid location.`);
                }
                
                return {
                    assetTag: '', // Let database generate this via trigger
                    serialNumber: bulkAsset.serialNumber,
                    name: bulkAsset.name,
                    brand: 'Unknown', // Default value for bulk import
                    model: 'Unknown', // Default value for bulk import
                    category: bulkAsset.category as AssetCategory,
                    status: bulkAsset.status as 'available' | 'assigned' | 'repair' | 'lost' | 'retired',
                    condition: 'good' as 'new' | 'good' | 'fair' | 'poor', // Default condition
                    location: location.name, // Use the actual location name
                    locationId: location.id, // Ensure locationId is set correctly
                    assignedTo: bulkAsset.assignedTo || null, // Use null instead of empty string
                    assignedToId: null,
                    purchaseDate: new Date().toISOString().split('T')[0], // Current date
                    purchaseCost: 0, // Default cost
                    vendor: 'Bulk Import', // Default vendor
                    warrantyStart: null,
                    warrantyEnd: null,
                    notes: 'Added via bulk import'
                };
            });

            // Create assets one by one to handle potential errors
            const createdAssets = [];
            for (const asset of assetsToCreate) {
                try {
                    console.log('Creating asset:', asset);
                    const createdAsset = await supabaseService.createAsset(asset);
                    console.log('Successfully created asset:', createdAsset);
                    createdAssets.push(createdAsset);
                } catch (error) {
                    console.error('Failed to create asset:', asset.name, error);
                    console.error('Asset data that failed:', JSON.stringify(asset, null, 2));
                    toast({
                        title: "Error creating asset",
                        description: `Failed to create asset: ${asset.name}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        variant: "destructive",
                    });
                }
            }

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
            
            // Reset form
            setCsvFile(null);
            setManualAssets([{ name: '', category: '', serialNumber: '', status: 'Available', location: '' }]);
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

    const handleDialogClose = () => {
        setOpen(false);
        // Reset state when closing
        setTimeout(() => {
            setCsvFile(null);
            setManualAssets([{ name: '', category: '', serialNumber: '', status: 'Available', location: '' }]);
            setProcessedAssets([]);
            setActiveTab('csv');
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Bulk Assets</DialogTitle>
                    <DialogDescription>
                        Add multiple assets at once using CSV upload or manual entry.
                    </DialogDescription>
                </DialogHeader>

                {processedAssets.length === 0 ? (
                    <>
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

                        {activeTab === 'csv' ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Upload CSV File</CardTitle>
                                    <CardDescription>
                                        Upload a CSV file with asset information. Expected columns: Name, Category, Serial Number, Status, Location, Assigned To (optional)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-600">
                                                {csvFile ? csvFile.name : "Choose a CSV file or drag and drop"}
                                            </p>
                                            <Input
                                                type="file"
                                                accept=".csv"
                                                onChange={handleFileUpload}
                                                className="max-w-xs mx-auto"
                                            />
                                        </div>
                                    </div>
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
                                <CardHeader>
                                    <CardTitle className="text-lg">Manual Asset Entry</CardTitle>
                                    <CardDescription>
                                        Enter asset details manually. Fill in all required fields for each asset.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {manualAssets.map((asset, index) => (
                                            <div key={index} className="border rounded-lg p-4 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="font-medium">Asset {index + 1}</h4>
                                                    {manualAssets.length > 1 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeManualAssetRow(index)}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <Label htmlFor={`name-${index}`}>Name *</Label>
                                                        <Input
                                                            id={`name-${index}`}
                                                            value={asset.name}
                                                            onChange={(e) => handleManualAssetChange(index, 'name', e.target.value)}
                                                            placeholder="Asset name"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor={`category-${index}`}>Category *</Label>
                                                        <Select
                                                            value={asset.category}
                                                            onValueChange={(value) => handleManualAssetChange(index, 'category', value)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select category" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {uniqueCategories.map((category) => (
                                                                    <SelectItem key={category} value={category}>
                                                                        {category}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor={`serial-${index}`}>Serial Number *</Label>
                                                        <Input
                                                            id={`serial-${index}`}
                                                            value={asset.serialNumber}
                                                            onChange={(e) => handleManualAssetChange(index, 'serialNumber', e.target.value)}
                                                            placeholder="Serial number"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor={`location-${index}`}>Location *</Label>
                                                        <Select
                                                            value={asset.location}
                                                            onValueChange={(value) => handleManualAssetChange(index, 'location', value)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select location" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {locations.map((location) => (
                                                                    <SelectItem key={location.id} value={location.name}>
                                                                        {location.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 flex justify-between">
                                        <Button
                                            variant="outline"
                                            onClick={addManualAssetRow}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Another Asset
                                        </Button>
                                        <Button
                                            onClick={processManualAssets}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                'Review Assets'
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center">
                                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                                Review Assets ({processedAssets.length})
                            </CardTitle>
                            <CardDescription>
                                Review the assets before adding them to your inventory.
                            </CardDescription>
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
                )}

                <DialogFooter>
                    {processedAssets.length > 0 && (
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
                    {processedAssets.length > 0 && (
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
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
