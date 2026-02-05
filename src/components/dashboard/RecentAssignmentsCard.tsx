import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Assignment } from '@/types/asset';

interface RecentAssignmentsCardProps {
  assignments: Assignment[];
}

export function RecentAssignmentsCard({ assignments }: RecentAssignmentsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">
              Last 30 days
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <p className="text-center py-6 text-muted-foreground">No recent activity</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] sm:w-[260px]">Type</TableHead>
                  <TableHead className="min-w-[150px]">Asset</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.slice(0, 5).map((assignment) => (
                  <TableRow key={assignment.id} className="transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${assignment.employeeName}`} />
                          <AvatarFallback className="bg-muted text-primary text-xs font-medium">
                            {assignment.employeeName.split(' ').map((n) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">Assigned</p>
                          <p className="text-xs text-muted-foreground truncate">{assignment.employeeName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{assignment.assetName}</p>
                        <p className="text-xs text-muted-foreground truncate">{assignment.assetTag}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="success" className="font-normal">
                        Success
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(assignment.assignedDate).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
