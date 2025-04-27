import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useReportData } from './ReportContext';

export default function ReportBase({ title, children, filters, onFiltersChange }) {
  const { isLoading, lastUpdate, refreshData } = useReportData();

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            עודכן: {format(lastUpdate, 'HH:mm:ss')}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshData()}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            רענן
          </Button>
        </div>
      </div>

      {filters && (
        <div className="mb-6">
          {filters}
        </div>
      )}

      <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
        {children}
      </div>
    </Card>
  );
}