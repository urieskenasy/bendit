import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Maintenance } from '@/api/entities';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function MaintenanceWidget() {
  const [maintenanceStats, setMaintenanceStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0,
    averageCompletionTime: 0,
    urgent: 0
  });
  const [latestTasks, setLatestTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMaintenanceData();
  }, []);

  const loadMaintenanceData = async () => {
    setIsLoading(true);
    try {
      const maintenanceData = await Maintenance.list();
      
      // חישוב סטטיסטיקות
      const stats = {
        total: maintenanceData.length,
        open: maintenanceData.filter(m => m.status === 'open').length,
        inProgress: maintenanceData.filter(m => m.status === 'in_progress').length,
        completed: maintenanceData.filter(m => m.status === 'completed').length,
        urgent: maintenanceData.filter(m => m.priority === 'urgent' && m.status !== 'completed').length
      };
      
      // חישוב זמן טיפול ממוצע
      const completedTasks = maintenanceData.filter(task => 
        task.status === 'completed' && task.reported_date && task.completed_date
      );
      
      if (completedTasks.length > 0) {
        const totalDays = completedTasks.reduce((sum, task) => {
          const reportDate = parseISO(task.reported_date);
          const completeDate = parseISO(task.completed_date);
          return sum + differenceInDays(completeDate, reportDate);
        }, 0);
        
        stats.averageCompletionTime = Math.round(totalDays / completedTasks.length);
      }
      
      // המשימות האחרונות
      const latestMaintenanceTasks = maintenanceData
        .filter(m => m.status !== 'completed' && m.status !== 'cancelled')
        .sort((a, b) => {
          const dateA = a.reported_date ? new Date(a.reported_date) : new Date(0);
          const dateB = b.reported_date ? new Date(b.reported_date) : new Date(0);
          return dateB - dateA;
        })
        .slice(0, 5);
      
      setMaintenanceStats(stats);
      setLatestTasks(latestMaintenanceTasks);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // פונקציית עזר לקבלת חיווי דחיפות צבעוני
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Card className="bg-white shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Wrench className="h-5 w-5 text-blue-600" />
          <span>מצב תחזוקה</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin h-8 w-8 border-4 border-blue-400 rounded-full border-t-transparent"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col p-3 bg-blue-50 rounded-lg">
                <span className="text-xs text-gray-500">משימות פתוחות</span>
                <span className="text-2xl font-bold">{maintenanceStats.open + maintenanceStats.inProgress}</span>
              </div>
              <div className="flex flex-col p-3 bg-green-50 rounded-lg">
                <span className="text-xs text-gray-500">הושלמו החודש</span>
                <span className="text-2xl font-bold">{maintenanceStats.completed}</span>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm">סטטוס משימות</span>
                <span className="text-xs text-gray-500">{maintenanceStats.total} סה"כ</span>
              </div>
              <div className="flex h-2 overflow-hidden bg-gray-200 rounded">
                <div className="bg-red-500" style={{ width: `${(maintenanceStats.open / maintenanceStats.total * 100) || 0}%` }}></div>
                <div className="bg-blue-500" style={{ width: `${(maintenanceStats.inProgress / maintenanceStats.total * 100) || 0}%` }}></div>
                <div className="bg-green-500" style={{ width: `${(maintenanceStats.completed / maintenanceStats.total * 100) || 0}%` }}></div>
              </div>
              <div className="flex text-xs mt-1 gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>ממתין ({maintenanceStats.open})</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>בטיפול ({maintenanceStats.inProgress})</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>הושלם ({maintenanceStats.completed})</span>
                </div>
              </div>
            </div>
            
            {maintenanceStats.averageCompletionTime > 0 && (
              <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <span className="text-sm">זמן טיפול ממוצע:</span>
                  <span className="font-semibold mr-1">{maintenanceStats.averageCompletionTime} ימים</span>
                </div>
              </div>
            )}
            
            {maintenanceStats.urgent > 0 && (
              <div className="flex items-center gap-2 mb-4 p-2 bg-red-50 rounded-lg border border-red-100">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">
                  {maintenanceStats.urgent} משימות דחופות ממתינות לטיפול
                </span>
              </div>
            )}
            
            {latestTasks.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">משימות אחרונות</h3>
                {latestTasks.map(task => (
                  <div key={task.id} className="p-2 hover:bg-gray-50 rounded border border-gray-100">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium truncate max-w-[70%]">{task.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority === 'urgent' ? 'דחוף' : 
                         task.priority === 'high' ? 'גבוה' :
                         task.priority === 'medium' ? 'בינוני' : 'נמוך'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">
                        {task.reported_date ? format(parseISO(task.reported_date), 'dd/MM/yy') : 'לא צוין תאריך'}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                        {task.status === 'open' ? 'פתוח' : 'בטיפול'}
                      </span>
                    </div>
                  </div>
                ))}
                
                <div className="mt-3 text-center">
                  <Link 
                    to={createPageUrl('Maintenance')}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    צפה בכל המשימות
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}