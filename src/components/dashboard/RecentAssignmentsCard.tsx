import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Assignment } from '@/types/asset';

interface RecentAssignmentsCardProps {
  assignments: Assignment[];
}

export function RecentAssignmentsCard({ assignments }: RecentAssignmentsCardProps) {
  return (
    <Card className="border shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Recent Assignments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No recent assignments</p>
          ) : (
            assignments.slice(0, 5).map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Avatar className="w-9 h-9">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${assignment.employeeName}`} />
                  <AvatarFallback className="text-xs bg-brand-blue/10 text-brand-blue">
                    {assignment.employeeName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{assignment.employeeName}</p>
                  <p className="text-sm text-muted-foreground">
                    {assignment.assetName}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="font-normal">
                    {assignment.assetTag}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(assignment.assignedDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
