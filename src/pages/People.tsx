import { useState, useEffect } from 'react';
import { Search, Download, MoreHorizontal, Eye, Edit, UserMinus, ArrowUpDown, ArrowUp, ArrowDown, Printer, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
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
import { EmployeeProfileDialog } from '@/components/people/EmployeeProfileDialog';
import { Employee } from '@/types/asset';
import { exportToCSV } from '@/lib/exportUtils';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

const statusBadgeVariant = (status: Employee['status']) =>
  status === 'active' ? 'success' : status === 'offboarded' ? 'destructive' : 'secondary';

const statusLabel = (status: Employee['status']) =>
  status.charAt(0).toUpperCase() + status.slice(1);

const People = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [offboardingEmployee, setOffboardingEmployee] = useState<Employee | null>(null);
  const [viewingEmployeeId, setViewingEmployeeId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: employees = [], isLoading: isLoadingEmployees } = useEmployees();
  const { data: assets = [], isLoading: isLoadingAssets } = useAssets();

  useEffect(() => {
    const viewId = searchParams.get('view');
    if (viewId && employees.length > 0) {
      const employee = employees.find(e => e.id === viewId);
      if (employee) setViewingEmployeeId(employee.id);
    }
  }, [searchParams, employees]);

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
    const aValue = a[key as keyof Employee]?.toString().toLowerCase() || '';
    const bValue = b[key as keyof Employee]?.toString().toLowerCase() || '';
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, departmentFilter, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = sortedEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedEmployees.length / itemsPerPage);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-4 h-4 ml-2 text-muted-foreground/50" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-2 text-primary" />
      : <ArrowDown className="w-4 h-4 ml-2 text-primary" />;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">People</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => exportToCSV(filteredEmployees, 'people_export')}
            disabled={filteredEmployees.length === 0}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <AddEmployeeDialog />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search people..."
            className="pl-10 w-full rounded-full bg-card border-border/60 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] rounded-full bg-card border-border/60 shadow-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="offboarded">Offboarded</SelectItem>
            </SelectContent>
          </Select>

          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[160px] rounded-full bg-card border-border/60 shadow-sm">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Mobile card list (< lg) ───────────────────────── */}
      <div className="block lg:hidden rounded-xl overflow-hidden border border-border bg-card">
        {currentEmployees.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No employees found matching your criteria
          </p>
        ) : (
          <>
            {currentEmployees.map((employee, idx) => {
              const assetCount = assets.filter(a => a.assignedToId === employee.id).length;
              return (
                <div
                  key={employee.id}
                  className={`px-4 py-3 flex items-center gap-3 cursor-pointer active:bg-muted/50 transition-colors ${idx < currentEmployees.length - 1 ? 'border-b border-border' : ''}`}
                  onClick={() => setViewingEmployeeId(employee.id)}
                >
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={employee.avatarUrl} />
                    <AvatarFallback className="bg-muted text-primary text-sm">
                      {employee.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[15px] text-foreground leading-snug truncate">{employee.name}</span>
                      <Badge variant={statusBadgeVariant(employee.status)} className="shrink-0 text-[11px]">
                        {statusLabel(employee.status)}
                      </Badge>
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug truncate">{employee.email}</p>
                    <p className="text-[12px] text-muted-foreground leading-snug">
                      {employee.department} · {assetCount} {assetCount === 1 ? 'asset' : 'assets'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                </div>
              );
            })}

            {/* Mobile pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, sortedEmployees.length)} of {sortedEmployees.length}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 w-8 p-0">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 w-8 p-0">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Desktop table (≥ lg) ─────────────────────────── */}
      <div className="hidden lg:block">
        <Card className="border shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px] cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => requestSort('name')}>
                  <div className="flex items-center">Employee <SortIcon columnKey="name" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => requestSort('department')}>
                  <div className="flex items-center">Department <SortIcon columnKey="department" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => requestSort('position')}>
                  <div className="flex items-center">Position <SortIcon columnKey="position" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => requestSort('location')}>
                  <div className="flex items-center">Location <SortIcon columnKey="location" /></div>
                </TableHead>
                <TableHead className="text-center cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => requestSort('assets')}>
                  <div className="flex items-center justify-center">Assets <SortIcon columnKey="assets" /></div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => requestSort('status')}>
                  <div className="flex items-center">Status <SortIcon columnKey="status" /></div>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No employees found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                currentEmployees.map((employee) => (
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
                      <Badge variant={statusBadgeVariant(employee.status)}>
                        {statusLabel(employee.status)}
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
                          <DropdownMenuItem className="gap-2" onClick={() => setViewingEmployeeId(employee.id)}>
                            <Eye className="w-4 h-4" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => setEditingEmployee(employee)}>
                            <Edit className="w-4 h-4" /> Edit Employee
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => window.open(`/print-handover/employee/${employee.id}`, '_blank')}>
                            <Printer className="w-4 h-4" /> Print Handover Form
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => setOffboardingEmployee(employee)}>
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

        {/* Desktop Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {currentEmployees.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, sortedEmployees.length)} of {sortedEmployees.length} employees
          </div>
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={itemsPerPage}
            setPageSize={setItemsPerPage}
          />
        </div>
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
      {viewingEmployeeId && (() => {
        const viewingIndex = sortedEmployees.findIndex(e => e.id === viewingEmployeeId);
        if (viewingIndex === -1) return null;
        return (
          <EmployeeProfileDialog
            employees={sortedEmployees}
            currentIndex={viewingIndex}
            open={!!viewingEmployeeId}
            onOpenChange={(open) => !open && setViewingEmployeeId(null)}
            onNavigate={(index) => setViewingEmployeeId(sortedEmployees[index].id)}
          />
        );
      })()}
    </div>
  );
};

export default People;
