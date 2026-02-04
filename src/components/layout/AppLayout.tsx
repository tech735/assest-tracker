import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { AddAssetDialog } from '../assets/AddAssetDialog';
import { AssignAssetDialog } from '../assets/AssignAssetDialog';
import { ReturnAssetDialog } from '../assets/ReturnAssetDialog';
import { useToast } from '@/hooks/use-toast';

export function AppLayout() {
  const { toast } = useToast();
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [assignAssetOpen, setAssignAssetOpen] = useState(false);
  const [returnAssetOpen, setReturnAssetOpen] = useState(false);

  const handleImportAssets = () => {
    toast({
      title: 'Coming Soon',
      description: 'The CSV import functionality is currently under development.',
    });
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onAddAsset={() => setAddAssetOpen(true)}
          onAssignAsset={() => setAssignAssetOpen(true)}
          onReturnAsset={() => setReturnAssetOpen(true)}
          onImportAssets={handleImportAssets}
        />
        <main className="flex-1 px-8 py-7 overflow-auto">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Dialogs */}
      <AddAssetDialog
        open={addAssetOpen}
        onOpenChange={setAddAssetOpen}
        showTrigger={false}
      />

      <AssignAssetDialog
        open={assignAssetOpen}
        onOpenChange={setAssignAssetOpen}
      />

      <ReturnAssetDialog
        open={returnAssetOpen}
        onOpenChange={setReturnAssetOpen}
      />
    </div>
  );
}
