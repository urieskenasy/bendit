
import React, { useState, useEffect } from 'react';
import { SystemLog } from '@/api/entities';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import LoggerService, { LogTypes, LogSeverity } from '../components/utils/loggerService';
import { Search, RefreshCw, Filter, ArrowDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function SystemLogsPage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    loadLogs();
  }, [page, selectedType, selectedSeverity]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const allLogs = await SystemLog.list('-timestamp');
      let filtered = allLogs;
      
      if (selectedType !== 'all') {
        filtered = filtered.filter(log => log.type === selectedType);
      }
      
      if (selectedSeverity !== 'all') {
        filtered = filtered.filter(log => log.severity === selectedSeverity);
      }
      
      if (searchTerm) {
        filtered = filtered.filter(log => 
          log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.details.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setTotalLogs(filtered.length);
      
      // Paginate
      const start = (page - 1) * pageSize;
      const paginatedLogs = filtered.slice(start, start + pageSize);
      setLogs(paginatedLogs);
      
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1); // Reset to first page on search
    loadLogs();
  };

  const viewLogDetails = (log) => {
    setSelectedLog(log);
    setShowDetailsDialog(true);
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case LogSeverity.CRITICAL:
        return <Badge variant="destructive">קריטי</Badge>;
      case LogSeverity.ERROR:
        return <Badge className="bg-red-100 text-red-800">שגיאה</Badge>;
      case LogSeverity.WARNING:
        return <Badge className="bg-orange-100 text-orange-800">אזהרה</Badge>;
      case LogSeverity.INFO:
        return <Badge className="bg-blue-100 text-blue-800">מידע</Badge>;
      case LogSeverity.VERBOSE:
        return <Badge className="bg-gray-100 text-gray-800">מפורט</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  const getLogTypeDisplay = (type) => {
    const typesMap = {
      entity_created: 'יצירת ישות',
      entity_updated: 'עדכון ישות',
      entity_deleted: 'מחיקת ישות',
      sync_started: 'התחלת סנכרון',
      sync_completed: 'סיום סנכרון',
      sync_failed: 'שגיאת סנכרון',
      payment_generated: 'יצירת תשלום',
      reminder_triggered: 'הפעלת תזכורת',
      error: 'שגיאה',
      warning: 'אזהרה',
      info: 'מידע'
    };
    
    return typesMap[type] || type;
  };

  const maxPages = Math.ceil(totalLogs / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">לוג מערכת</h1>
        <Button 
          onClick={loadLogs} 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          רענון
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-grow">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="חיפוש לפי הודעה או פרטים..."
              className="pr-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="סוג אירוע" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל האירועים</SelectItem>
                {Object.keys(LogTypes).map(key => (
                  <SelectItem key={key} value={LogTypes[key]}>
                    {getLogTypeDisplay(LogTypes[key])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="רמת חומרה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הרמות</SelectItem>
                {Object.keys(LogSeverity).map(key => (
                  <SelectItem key={key} value={LogSeverity[key]}>
                    {LogSeverity[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button onClick={handleSearch} className="flex-shrink-0">
              <Filter className="w-4 h-4 ml-2" />
              סנן
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>זמן</TableHead>
                <TableHead>סוג</TableHead>
                <TableHead>רמת חומרה</TableHead>
                <TableHead className="w-[40%]">הודעה</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex justify-center">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    לא נמצאו רשומות לוג התואמות את החיפוש
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow 
                    key={log.id} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => viewLogDetails(log)}
                  >
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>{getLogTypeDisplay(log.type)}</TableCell>
                    <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                    <TableCell className="truncate max-w-xs">
                      {log.message}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          viewLogDetails(log);
                        }}
                      >
                        פרטים
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalLogs > pageSize && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              מציג {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalLogs)} מתוך {totalLogs} רשומות
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                הקודם
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page >= maxPages}
                onClick={() => setPage(p => Math.min(maxPages, p + 1))}
              >
                הבא
              </Button>
            </div>
          </div>
        )}
      </Card>

      {showDetailsDialog && selectedLog && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedLog.message}</DialogTitle>
              <DialogDescription>
                {format(new Date(selectedLog.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                {' • '}
                {getLogTypeDisplay(selectedLog.type)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div>
                <h3 className="text-sm font-medium mb-1">רמת חומרה</h3>
                <div>{getSeverityBadge(selectedLog.severity)}</div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-1">פרטים</h3>
                <div className="bg-gray-50 p-3 rounded-md whitespace-pre-wrap font-mono text-sm max-h-60 overflow-y-auto">
                  {selectedLog.details ? (
                    <pre>{JSON.stringify(JSON.parse(selectedLog.details), null, 2)}</pre>
                  ) : (
                    <span className="text-gray-500">אין פרטים נוספים</span>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-1">ישויות קשורות</h3>
                <div className="bg-gray-50 p-3 rounded-md whitespace-pre-wrap font-mono text-sm">
                  {selectedLog.related_entities ? (
                    <pre>{JSON.stringify(JSON.parse(selectedLog.related_entities), null, 2)}</pre>
                  ) : (
                    <span className="text-gray-500">אין ישויות קשורות</span>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
  );
}
