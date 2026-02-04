import { useState } from 'react';
import { FileText, Download, Calendar, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAssets, useAssignments, useLocations, useEmployees } from '@/hooks/useSupabaseData';
import { exportToCSV } from '@/lib/exportUtils';
import { useToast } from '@/hooks/use-toast';

const reports = [
  {
    id: '1',
    name: 'Inventory Report',
    description: 'Complete overview of all assets with current status, location, and assignment details',
    category: 'Inventory',
    lastGenerated: '2025-01-28',
  },
  {
    id: '2',
    name: 'Assignment Report',
    description: 'Track all asset assignments, including current assignments and history',
    category: 'Assignments',
    lastGenerated: '2025-01-25',
  },
  {
    id: '3',
    name: 'Aging Report',
    description: 'Assets grouped by age, showing depreciation and replacement timelines',
    category: 'Financial',
    lastGenerated: '2025-01-20',
  },
  {
    id: '4',
    name: 'Warranty Expiration Report',
    description: 'Assets with warranties expiring within the next 30, 60, or 90 days',
    category: 'Maintenance',
    lastGenerated: '2025-01-27',
  },
  {
    id: '5',
    name: 'Location Summary',
    description: 'Asset distribution across all locations with occupancy metrics',
    category: 'Inventory',
    lastGenerated: '2025-01-22',
  },
  {
    id: '6',
    name: 'Utilization Report',
    description: 'Asset utilization rates and idle asset identification',
    category: 'Operations',
    lastGenerated: '2025-01-15',
  },
];

const categoryColors: Record<string, 'default' | 'secondary' | 'outline'> = {
  Inventory: 'default',
  Assignments: 'secondary',
  Financial: 'outline',
  Maintenance: 'secondary',
  Operations: 'outline',
};

const Reports = () => {
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: assets = [], isLoading: assetsLoading } = useAssets();
  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();

  const isLoading = assetsLoading || assignmentsLoading || locationsLoading || employeesLoading;

  // Report generation functions
  const generateInventoryReport = () => {
    setGeneratingReport('1');
    try {
      const inventoryData = assets.map(asset => ({
        'Asset Tag': asset.assetTag,
        'Serial Number': asset.serialNumber,
        'Name': asset.name,
        'Brand': asset.brand,
        'Model': asset.model,
        'Category': asset.category,
        'Status': asset.status,
        'Condition': asset.condition,
        'Location': asset.location,
        'Assigned To': asset.assignedTo || 'Unassigned',
        'Purchase Date': asset.purchaseDate,
        'Purchase Cost': asset.purchaseCost,
        'Vendor': asset.vendor,
        'Warranty End': asset.warrantyEnd || 'N/A',
      }));
      
      exportToCSV(inventoryData, 'inventory_report');
      toast({
        title: "Inventory Report Generated",
        description: `Successfully exported ${inventoryData.length} assets`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate inventory report",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateAssignmentReport = () => {
    setGeneratingReport('2');
    try {
      const assignmentData = assignments.map(assignment => ({
        'Asset Tag': assignment.assetTag,
        'Asset Name': assignment.assetName,
        'Employee Name': assignment.employeeName,
        'Assigned Date': assignment.assignedDate,
        'Return Date': assignment.returnDate || 'N/A',
        'Condition': assignment.condition,
        'Notes': assignment.notes || 'N/A',
      }));
      
      exportToCSV(assignmentData, 'assignment_report');
      toast({
        title: "Assignment Report Generated",
        description: `Successfully exported ${assignmentData.length} assignments`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate assignment report",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateAgingReport = () => {
    setGeneratingReport('3');
    try {
      const today = new Date();
      const agingData = assets.map(asset => {
        const purchaseDate = new Date(asset.purchaseDate);
        const ageInDays = Math.floor((today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        const ageInYears = Math.floor(ageInDays / 365);
        
        let ageCategory = 'New (0-1 years)';
        if (ageInYears > 5) ageCategory = 'Old (5+ years)';
        else if (ageInYears > 3) ageCategory = 'Mature (3-5 years)';
        else if (ageInYears > 1) ageCategory = 'Moderate (1-3 years)';
        
        return {
          'Asset Tag': asset.assetTag,
          'Name': asset.name,
          'Category': asset.category,
          'Purchase Date': asset.purchaseDate,
          'Age in Days': ageInDays,
          'Age in Years': ageInYears,
          'Age Category': ageCategory,
          'Original Cost': asset.purchaseCost,
          'Current Value': asset.purchaseCost * Math.max(0.1, 1 - (ageInYears * 0.2)), // Simple depreciation
          'Condition': asset.condition,
          'Status': asset.status,
        };
      });
      
      exportToCSV(agingData, 'aging_report');
      toast({
        title: "Aging Report Generated",
        description: `Successfully exported ${agingData.length} assets`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate aging report",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateWarrantyReport = () => {
    setGeneratingReport('4');
    try {
      const today = new Date();
      const warrantyData = assets
        .filter(asset => asset.warrantyEnd)
        .map(asset => {
          const warrantyEnd = new Date(asset.warrantyEnd!);
          const daysUntilExpiry = Math.floor((warrantyEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          let urgency = 'Not Expiring Soon';
          if (daysUntilExpiry < 0) urgency = 'Expired';
          else if (daysUntilExpiry <= 30) urgency = 'Expiring Within 30 Days';
          else if (daysUntilExpiry <= 60) urgency = 'Expiring Within 60 Days';
          else if (daysUntilExpiry <= 90) urgency = 'Expiring Within 90 Days';
          
          return {
            'Asset Tag': asset.assetTag,
            'Name': asset.name,
            'Category': asset.category,
            'Warranty End': asset.warrantyEnd,
            'Days Until Expiry': daysUntilExpiry,
            'Urgency': urgency,
            'Location': asset.location,
            'Assigned To': asset.assignedTo || 'Unassigned',
          };
        })
        .sort((a, b) => a['Days Until Expiry'] - b['Days Until Expiry']);
      
      exportToCSV(warrantyData, 'warranty_expiration_report');
      toast({
        title: "Warranty Report Generated",
        description: `Successfully exported ${warrantyData.length} assets with warranty`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate warranty report",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateLocationSummary = () => {
    setGeneratingReport('5');
    try {
      const locationData = locations.map(location => {
        const locationAssets = assets.filter(asset => asset.locationId === location.id);
        const assignedAssets = locationAssets.filter(asset => asset.status === 'assigned');
        const availableAssets = locationAssets.filter(asset => asset.status === 'available');
        
        return {
          'Location Name': location.name,
          'Location Type': location.type,
          'Total Assets': locationAssets.length,
          'Assigned Assets': assignedAssets.length,
          'Available Assets': availableAssets.length,
          'In Repair Assets': locationAssets.filter(asset => asset.status === 'repair').length,
          'Lost Assets': locationAssets.filter(asset => asset.status === 'lost').length,
          'Retired Assets': locationAssets.filter(asset => asset.status === 'retired').length,
          'Total Employees': location.employeesCount,
          'Utilization Rate': locationAssets.length > 0 ? `${((assignedAssets.length / locationAssets.length) * 100).toFixed(1)}%` : '0%',
        };
      });
      
      exportToCSV(locationData, 'location_summary_report');
      toast({
        title: "Location Summary Generated",
        description: `Successfully exported ${locationData.length} locations`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate location summary",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(null);
    }
  };

  const generateUtilizationReport = () => {
    setGeneratingReport('6');
    try {
      const today = new Date();
      const utilizationData = assets.map(asset => ({
        'Asset Tag': asset.assetTag,
        'Name': asset.name,
        'Category': asset.category,
        'Status': asset.status,
        'Location': asset.location,
        'Assigned To': asset.assignedTo || 'Unassigned',
        'Utilization Status': asset.status === 'assigned' ? 'In Use' : asset.status === 'available' ? 'Idle' : 'Unavailable',
        'Last Assignment Date': assignments
          .filter(a => a.assetId === asset.id)
          .sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime())[0]?.assignedDate || 'Never',
        'Days Since Last Assignment': assignments
          .filter(a => a.assetId === asset.id)
          .sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime())[0] 
          ? Math.floor((today.getTime() - new Date(assignments
              .filter(a => a.assetId === asset.id)
              .sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime())[0].assignedDate).getTime()) / (1000 * 60 * 60 * 24))
          : 'N/A',
      }));
      
      exportToCSV(utilizationData, 'utilization_report');
      toast({
        title: "Utilization Report Generated",
        description: `Successfully exported ${utilizationData.length} assets`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate utilization report",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleGenerateReport = (reportId: string) => {
    switch (reportId) {
      case '1': generateInventoryReport(); break;
      case '2': generateAssignmentReport(); break;
      case '3': generateAgingReport(); break;
      case '4': generateWarrantyReport(); break;
      case '5': generateLocationSummary(); break;
      case '6': generateUtilizationReport(); break;
      default: break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and download asset management reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            Schedule Report
          </Button>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Custom Report
          </Button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <Card key={report.id} className="border shadow-card hover:shadow-card-hover transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary mb-3">
                  <FileText className="w-5 h-5 text-secondary-foreground" />
                </div>
                <Badge variant={categoryColors[report.category] || 'outline'}>
                  {report.category}
                </Badge>
              </div>
              <CardTitle className="text-lg">{report.name}</CardTitle>
              <CardDescription className="line-clamp-2">{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Last generated: {new Date(report.lastGenerated).toLocaleDateString()}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => handleGenerateReport(report.id)}
                  disabled={generatingReport === report.id}
                >
                  {generatingReport === report.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Reports;
