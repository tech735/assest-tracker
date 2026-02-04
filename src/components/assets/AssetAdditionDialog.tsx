import { useState } from 'react';
import { Plus, Upload, FileText, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AddAssetDialog } from './AddAssetDialog';
import { BulkAssetAddDialog } from './BulkAssetAddDialog';

interface AssetAdditionDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    showTrigger?: boolean;
}

export function AssetAdditionDialog({
    open: externalOpen,
    onOpenChange: setExternalOpen,
    showTrigger = true
}: AssetAdditionDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [showSingleAdd, setShowSingleAdd] = useState(false);
    const [showBulkAdd, setShowBulkAdd] = useState(false);

    const open = externalOpen !== undefined ? externalOpen : internalOpen;
    const setOpen = (val: boolean) => {
        if (setExternalOpen) setExternalOpen(val);
        setInternalOpen(val);
    };

    const handleSingleAdd = () => {
        setShowSingleAdd(true);
        setOpen(false);
    };

    const handleBulkAdd = () => {
        setShowBulkAdd(true);
        setOpen(false);
    };

    const handleDialogClose = () => {
        setOpen(false);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                {showTrigger && (
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-brand-blue hover:bg-brand-blue/90">
                            <Plus className="w-4 h-4" />
                            Add Asset
                        </Button>
                    </DialogTrigger>
                )}
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add Assets</DialogTitle>
                        <DialogDescription>
                            Choose how you want to add assets to your inventory.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                        <Card 
                            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-brand-blue/50"
                            onClick={handleSingleAdd}
                        >
                            <CardHeader className="text-center pb-4">
                                <div className="mx-auto w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center mb-3">
                                    <Plus className="w-6 h-6 text-brand-blue" />
                                </div>
                                <CardTitle className="text-lg">Single Asset</CardTitle>
                                <CardDescription>
                                    Add one asset at a time with detailed information
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>• Complete asset details</p>
                                    <p>• Individual specifications</p>
                                    <p>• Immediate validation</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card 
                            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-brand-blue/50"
                            onClick={handleBulkAdd}
                        >
                            <CardHeader className="text-center pb-4">
                                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                                    <Upload className="w-6 h-6 text-green-600" />
                                </div>
                                <CardTitle className="text-lg">Bulk Assets</CardTitle>
                                <CardDescription>
                                    Add multiple assets at once via CSV or manual entry
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>• CSV file upload</p>
                                    <p>• Quick manual entry</p>
                                    <p>• Batch processing</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleDialogClose}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {showSingleAdd && (
                <AddAssetDialog
                    open={showSingleAdd}
                    onOpenChange={(open) => {
                        setShowSingleAdd(open);
                        if (!open) setOpen(true);
                    }}
                    showTrigger={false}
                />
            )}

            {showBulkAdd && (
                <BulkAssetAddDialog
                    open={showBulkAdd}
                    onOpenChange={(open) => {
                        setShowBulkAdd(open);
                        if (!open) setOpen(true);
                    }}
                    showTrigger={false}
                />
            )}
        </>
    );
}
