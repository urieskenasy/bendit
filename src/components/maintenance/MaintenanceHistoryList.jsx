import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  AlertTriangle, 
  Building2, 
  CheckCircle, 
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function MaintenanceHistoryList({ maintenance }) {
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'open': return <AlertTriangle className="w-4 h-4 text-blue-600" />;
      case 'in_progress': return <Wrench className="w-4 h-4 text-amber-600" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-gray-600" />;
      default: return <Wrench className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityLabel = (priority) => {
    switch(priority) {
      case 'urgent': return 'דחוף';
      case 'high': return 'גבוהה';
      case 'medium': return 'בינונית';
      case 'low': return 'נמוכה';
      default: return priority;
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'open': return 'פתוח';
      case 'in_progress': return 'בטיפול';
      case 'completed': return 'הושלם';
      case 'cancelled': return 'בוטל';
      default: return status;
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      'maintenance': 'תחזוקה שוטפת',
      'repair': 'תיקון',
      'renovation': 'שיפוץ',
      'cleaning': 'ניקיון',
      'inspection': 'בדיקה'
    };
    return types[type] || type;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>תאריך דיווח</TableHead>
            <TableHead>כותרת</TableHead>
            <TableHead>סוג</TableHead>
            <TableHead>דחיפות</TableHead>
            <TableHead>סטטוס</TableHead>
            <TableHead>תאריך טיפול</TableHead>
            <TableHead>עלות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {maintenance.map((item) => (
            <TableRow key={item.id} className="hover:bg-muted/50">
              <TableCell>
                {item.reported_date ? format(new Date(item.reported_date), 'dd/MM/yyyy') : '-'}
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{item.title}</span>
                  {item.description && (
                    <span className="text-xs text-gray-500 line-clamp-1">
                      {item.description}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>{getTypeLabel(item.type)}</TableCell>
              <TableCell>
                <Badge className={getPriorityColor(item.priority)}>
                  {getPriorityLabel(item.priority)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {getStatusIcon(item.status)}
                  <span>{getStatusLabel(item.status)}</span>
                </div>
              </TableCell>
              <TableCell>
                {item.completed_date ? format(new Date(item.completed_date), 'dd/MM/yyyy') : '-'}
              </TableCell>
              <TableCell>
                {item.cost ? `₪${item.cost.toLocaleString()}` : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}