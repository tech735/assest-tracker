import { useState, useEffect } from 'react';
import { Save, Users, Tag, MapPin, Shield, Bell, Database, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useSettings, useUpdateSettings } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { toast } = useToast();
  const { data: settings, isLoading, isError } = useSettings();
  const updateSettings = useUpdateSettings();

  const [localConfig, setLocalConfig] = useState<any>(null);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    if (settings) {
      setLocalConfig(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(localConfig);
      toast({
        title: 'Settings Saved',
        description: 'Your preferences have been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    if (localConfig.categories.includes(newCategory.trim())) {
      toast({
        title: 'Duplicate Category',
        description: 'This category already exists.',
        variant: 'destructive',
      });
      return;
    }
    setLocalConfig({
      ...localConfig,
      categories: [...localConfig.categories, newCategory.trim()]
    });
    setNewCategory('');
  };

  const deleteCategory = (categoryToDelete: string) => {
    setLocalConfig({
      ...localConfig,
      categories: localConfig.categories.filter((c: string) => c !== categoryToDelete)
    });
  };

  if (isLoading && !localConfig) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-blue mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center space-y-4">
        <p className="text-destructive font-medium">Failed to load settings from the database.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!localConfig) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your asset portal configuration and preferences
          </p>
        </div>
        <Button
          className="gap-2 bg-brand-blue hover:bg-brand-blue/90"
          onClick={handleSave}
          disabled={updateSettings.isPending}
        >
          {updateSettings.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Organization Settings
              </CardTitle>
              <CardDescription>
                Configure your organization's asset management preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={localConfig.orgName}
                    onChange={(e) => setLocalConfig({ ...localConfig, orgName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagPrefix">Asset Tag Prefix</Label>
                  <Input
                    id="tagPrefix"
                    value={localConfig.tagPrefix}
                    onChange={(e) => setLocalConfig({ ...localConfig, tagPrefix: e.target.value })}
                    placeholder="e.g., AST-, ASSET-"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={localConfig.currency}
                    onChange={(e) => setLocalConfig({ ...localConfig, currency: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={localConfig.timezone}
                    onChange={(e) => setLocalConfig({ ...localConfig, timezone: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Settings */}
        <TabsContent value="categories" className="space-y-6">
          <Card className="border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Asset Categories
              </CardTitle>
              <CardDescription>
                Manage asset categories and custom fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {localConfig.categories.map((category: string, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="font-medium">{category}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteCategory(category)}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="New category name (e.g., Tablet, Camera)"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                  />
                </div>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={addCategory}
                >
                  <Tag className="w-4 h-4" />
                  Add Category
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Settings */}
        <TabsContent value="roles" className="space-y-6">
          <Card className="border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                User Roles
              </CardTitle>
              <CardDescription>
                Define roles and their access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {localConfig.roles.map((role: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">{role.name}</p>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure when and how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Warranty Expiration Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when asset warranties are expiring
                    </p>
                  </div>
                  <Switch
                    checked={localConfig.notifications.warrantyAlerts}
                    onCheckedChange={(checked) =>
                      setLocalConfig({
                        ...localConfig,
                        notifications: { ...localConfig.notifications, warrantyAlerts: checked }
                      })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Assignment Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Notify when assets are assigned or returned
                    </p>
                  </div>
                  <Switch
                    checked={localConfig.notifications.assignmentNotifications}
                    onCheckedChange={(checked) =>
                      setLocalConfig({
                        ...localConfig,
                        notifications: { ...localConfig.notifications, assignmentNotifications: checked }
                      })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Low Stock Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Alert when available assets fall below threshold
                    </p>
                  </div>
                  <Switch
                    checked={localConfig.notifications.lowStockAlerts}
                    onCheckedChange={(checked) =>
                      setLocalConfig({
                        ...localConfig,
                        notifications: { ...localConfig.notifications, lowStockAlerts: checked }
                      })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Daily Email Digest</p>
                    <p className="text-sm text-muted-foreground">
                      Receive a daily summary of asset activities
                    </p>
                  </div>
                  <Switch
                    checked={localConfig.notifications.emailDigest}
                    onCheckedChange={(checked) =>
                      setLocalConfig({
                        ...localConfig,
                        notifications: { ...localConfig.notifications, emailDigest: checked }
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
