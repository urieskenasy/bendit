
import React from 'react';
import { Card } from '@/components/ui/card';
import { AlertCircle, Bell, Calendar, FileText, Wrench, X, Check } from 'lucide-react';
import { format, parseISO, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function AlertsWidget({ contracts = [], maintenance = [], payments = [], size = 'medium' }) {
  // יצירת התראות על בסיס הנתונים
  const generateAlerts = () => {
    const today = new Date();
    const alerts = [];
    
    // התראות על חוזים מסתיימים
    contracts
      .filter(c => c.status === 'active' && c.end_date)
      .forEach(contract => {
        const endDate = parseISO(contract.end_date);
        const daysToEnd = differenceInDays(endDate, today);
        
        if (isPast(endDate)) {
          alerts.push({
            id: `contract_expired_${contract.id}`,
            type: 'contract',
            priority: 'high',
            title: 'חוזה פג תוקף',
            description: `חוזה מספר ${contract.id.slice(-4)} פג תוקפו`,
            date: contract.end_date,
            entity_id: contract.id
          });
        } else if (daysToEnd <= 30) {
          alerts.push({
            id: `contract_ending_${contract.id}`,
            type: 'contract',
            priority: daysToEnd <= 7 ? 'high' : 'medium',
            title: 'חוזה מסתיים בקרוב',
            description: `חוזה מספר ${contract.id.slice(-4)} מסתיים בעוד ${daysToEnd} ימים`,
            date: contract.end_date,
            entity_id: contract.id
          });
        }
      });
    
    // התראות על תשלומים מאוחרים
    payments
      .filter(p => p.status === 'late' || (p.status === 'pending' && p.due_date && isPast(parseISO(p.due_date))))
      .forEach(payment => {
        const dueDate = payment.due_date ? parseISO(payment.due_date) : null;
        
        alerts.push({
          id: `payment_late_${payment.id}`,
          type: 'payment',
          priority: 'high',
          title: 'תשלום באיחור',
          description: `תשלום בסך ${payment.amount?.toLocaleString()} ₪ באיחור`,
          date: payment.due_date,
          entity_id: payment.id
        });
      });
    
    // התראות על משימות תחזוקה בעלות עדיפות גבוהה
    maintenance
      .filter(m => m.status !== 'completed' && m.status !== 'cancelled' && (m.priority === 'urgent' || m.priority === 'high'))
      .forEach(task => {
        alerts.push({
          id: `maintenance_${task.id}`,
          type: 'maintenance',
          priority: task.priority === 'urgent' ? 'high' : 'medium',
          title: task.title,
          description: task.description?.substring(0, 60) + (task.description?.length > 60 ? '...' : '') || '',
          date: task.reported_date,
          entity_id: task.id
        });
      });
    
    // מיון לפי עדיפות ותאריך
    return alerts.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0;
      }
      
      if (a.date && b.date) {
        return new Date(a.date) - new Date(b.date);
      }
      
      return 0;
    });
  };
  
  const alerts = generateAlerts();
  const maxAlerts = size === 'xlarge' ? 10 : (size === 'large' ? 5 : 3);
  const displayedAlerts = alerts.slice(0, maxAlerts);
  
  // פונקציה לקבלת הצבע והאייקון של ההתראה
  const getAlertStyle = (type, priority) => {
    const styles = {
      background: '',
      borderColor: '',
      icon: null
    };
    
    switch (type) {
      case 'contract':
        styles.icon = <FileText className="w-5 h-5 text-blue-500" />;
        styles.background = 'bg-blue-50';
        styles.borderColor = 'border-blue-200';
        break;
      case 'payment':
        styles.icon = <AlertCircle className="w-5 h-5 text-red-500" />;
        styles.background = 'bg-red-50';
        styles.borderColor = 'border-red-200';
        break;
      case 'maintenance':
        styles.icon = <Wrench className="w-5 h-5 text-yellow-500" />;
        styles.background = 'bg-yellow-50';
        styles.borderColor = 'border-yellow-200';
        break;
      default:
        styles.icon = <Bell className="w-5 h-5 text-gray-500" />;
        styles.background = 'bg-gray-50';
        styles.borderColor = 'border-gray-200';
    }
    
    return styles;
  };
  
  // פונקציה לפורמט תאריך
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    
    const date = parseISO(dateStr);
    
    if (isToday(date)) return 'היום';
    if (isTomorrow(date)) return 'מחר';
    if (isPast(date)) {
      const days = Math.abs(differenceInDays(date, new Date()));
      return `לפני ${days} ימים`;
    }
    
    return format(date, 'dd/MM/yyyy');
  };
  
  return (
    <Card className="p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-red-600" />
          <h2 className="text-xl font-semibold">התראות</h2>
        </div>
        {alerts.length > maxAlerts && (
          <Button variant="ghost" size="sm" className="text-sm">
            הצג הכל ({alerts.length})
          </Button>
        )}
      </div>
      
      {displayedAlerts.length > 0 ? (
        <div className={size === 'xlarge' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
          <AnimatePresence>
            {displayedAlerts.map((alert, index) => {
              const style = getAlertStyle(alert.type, alert.priority);
              
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${style.background} border ${style.borderColor} rounded-lg p-4 relative`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {style.icon}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{alert.title}</h3>
                        <Badge className={alert.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                          {alert.priority === 'high' ? 'דחוף' : 'בינוני'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                      {alert.date && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(alert.date)}
                        </div>
                      )}
                    </div>
                    {(size === 'large' || size === 'xlarge') && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-white/80">
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-white/80">
                          <X className="h-4 w-4 text-gray-400" />
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          אין התראות חדשות
        </div>
      )}
    </Card>
  );
}
