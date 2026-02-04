import { useState } from 'react';
import { Search, Download, MoreHorizontal, Eye, Edit, UserMinus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useEmployees, useAssets } from '@/hooks/useSupabaseData';
import { AddEmployeeDialog } from '@/components/people/AddEmployeeDialog';
import { EditEmployeeDialog } from '@/components/people/EditEmployeeDialog';
import { OffboardEmployeeDialog } from '@/components/people/OffboardEmployeeDialog';
import { Employee } from '@/types/asset';
import { exportToCSV } from '@/lib/exportUtils';

const People = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // State for edit/offboard dialogs
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [offboardingEmployee, setOffboardingEmployee] = useState<Employee | null>(null);

  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployees();
  const { data: assets = [], isLoading: isLoadingAssets } = useAssets();

  const isLoading = isLoadingEmployees || isLoadingAssets;

  const departments = Array.from(new Set(employees.map((e) => e.department))).filter(Boolean);

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (!sortConfig) return 0;

    const { key, direction } = sortConfig;

    if (key === 'assets') {
      const aCount = assets.filter(asset => asset.assignedToId === a.id).length;
      const bCount = assets.filter(asset => asset.assignedToId === b.id).length;
      return direction === 'asc' ? aCount - bCount : bCount - aCount;
    }

    // Handle other keys
    const aValue = a[key as keyof Employee]?.toString().toLowerCase() || '';
    const bValue = b[key as keyof Employee]?.toString().toLowerCase() || '';

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-4 h-4 ml-2 text-muted-foreground/50" />;
    return sortConfig.direction === 'asc' ?
      <ArrowUp className="w-4 h-4 ml-2 text-primary" /> :
      <ArrowDown className="w-4 h-4 ml-2 text-primary" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading people...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">People</h1>
          <p className="text-muted-foreground">
            Manage employees and their asset assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => exportToCSV(filteredEmployees, 'people_export')}
            disabled={filteredEmployees.length === 0}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <AddEmployeeDialog />
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 border shadow-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, email, or department..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* People Table */}
      <Card className="border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="w-[300px] cursor-pointer hover:bg-muted/60 transition-colors"
                onClick={() => requestSort('name')}
              >
                <div className="flex items-center">
                  Employee <SortIcon columnKey="name" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/60 transition-colors"
                onClick={() => requestSort('department')}
              >
                <div className="flex items-center">
                  Department <SortIcon columnKey="department" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/60 transition-colors"
                onClick={() => requestSort('position')}
              >
                <div className="flex items-center">
                  Position <SortIcon columnKey="position" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/60 transition-colors"
                onClick={() => requestSort('location')}
              >
                <div className="flex items-center">
                  Location <SortIcon columnKey="location" />
                </div>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer hover:bg-muted/60 transition-colors"
                onClick={() => requestSort('assets')}
              >
                <div className="flex items-center justify-center">
                  Assets <SortIcon columnKey="assets" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/60 transition-colors"
                onClick={() => requestSort('status')}
              >
                <div className="flex items-center">
                  Status <SortIcon columnKey="status" />
                </div>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No employees found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              sortedEmployees.map((employee) => (
                <TableRow key={employee.id} className="transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={employee.avatarUrl} />
                        <AvatarFallback className="bg-muted text-primary text-sm">
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{employee.department}</TableCell>
                  <TableCell className="text-muted-foreground">{employee.position}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {employee.location === 'Warehouse' ? 'Central Warehouse' : employee.location}
                  </TableCell>
                  <TableCell className="text-center">
                    {assets.filter(a => a.assignedToId === employee.id).length} assets
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.status === 'active' ? 'success' : 'secondary'}>
                      {employee.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Eye className="w-4 h-4" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={() => setEditingEmployee(employee)}
                        >
                          <Edit className="w-4 h-4" /> Edit Employee
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-destructive"
                          onClick={() => setOffboardingEmployee(employee)}
                        >
                          <UserMinus className="w-4 h-4" /> Offboard
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {filteredEmployees.length} of {employees.length} employees</span>
      </div>

      {/* Dialogs */}
      {editingEmployee && (
        <EditEmployeeDialog
          employee={editingEmployee}
          open={!!editingEmployee}
          onOpenChange={(open) => !open && setEditingEmployee(null)}
        />
      )}
      {offboardingEmployee && (
        <OffboardEmployeeDialog
          employee={offboardingEmployee}
          open={!!offboardingEmployee}
          onOpenChange={(open) => !open && setOffboardingEmployee(null)}
        />
      )}
    </div>
  );
};

export default People;
