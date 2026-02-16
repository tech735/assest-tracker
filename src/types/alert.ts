export type AlertType = 'warranty' | 'overdue' | 'missing' | 'approval' | 'other';
export type AlertSeverity = 'low' | 'medium' | 'high';

export interface Alert {
    id: string;
    type: AlertType;
    title: string;
    description: string;
    assetId?: string;
    severity: AlertSeverity;
    isResolved: boolean;
    createdAt: string;
    updatedAt: string;
}
