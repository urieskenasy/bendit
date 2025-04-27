
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, Edit2, Calendar, Clock, Tag, AlertCircle, 
  CheckCircle, XCircle, Building2, User, FileText, Truck, 
  Repeat, Info, CalendarDays
} from 'lucide-react';
import { 
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, 
  DropdownMenuItem, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function ReminderList({ reminders, relatedEntities, onEdit, onStatusChange }) {
  const getReminderTypeName = (type, customType) => {
    switch (type) {
      case 'contract_renewal': return 'חידוש חוזה';
      case 'payment_due': return 'תשלום';
      case 'guarantee_expiry': return 'פקיעת ערבות';
      case 'maintenance': return 'תחזוקה';
      case 'insurance': return 'ביטוח';
      case 'custom': return customType || 'מותאם אישית';
      default: return type;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Clock className="w-3 h-3" />;
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      case 'cancelled': return <XCircle className="w-3 h-3" />;
      default: return <Info className="w-3 h-3" />;
    }
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case 'contract_renewal': return 'bg-indigo-50 text-indigo-600';
      case 'payment_due': return 'bg-green-50 text-green-600';
      case 'guarantee_expiry': return 'bg-purple-50 text-purple-600';
      case 'maintenance': return 'bg-amber-50 text-amber-600';
      case 'insurance': return 'bg-blue-50 text-blue-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const getRelatedEntityName = (relatedTo) => {
    if (!relatedTo || relatedTo.type === 'none') return null;
    
    switch (relatedTo.type) {
      case 'tenant':
        const tenant = relatedEntities.tenants.find(t => t.id === relatedTo.id);
        return tenant ? {
          icon: User,
          name: tenant.full_name,
          color: 'text-green-600'
        } : null;
      case 'property':
        const property = relatedEntities.properties.find(p => p.id === relatedTo.id);
        return property ? {
          icon: Building2,
          name: property.address,
          color: 'text-blue-600'
        } : null;
      case 'contract':
        const contract = relatedEntities.contracts.find(c => c.id === relatedTo.id);
        if (!contract) return null;
        const contractTenant = relatedEntities.tenants.find(t => t.id === contract.tenant_id);
        const contractProperty = relatedEntities.properties.find(p => p.id === contract.property_id);
        return {
          icon: FileText,
          name: `חוזה: ${contractTenant?.full_name || 'לא ידוע'} - ${contractProperty?.address || 'לא ידוע'}`,
          color: 'text-indigo-600'
        };
      case 'owner':
        const owner = relatedEntities.owners.find(o => o.id === relatedTo.id);
        return owner ? {
          icon: User,
          name: owner.full_name,
          color: 'text-purple-600'
        } : null;
      case 'supplier':
        const supplier = relatedEntities.suppliers.find(s => s.id === relatedTo.id);
        return supplier ? {
          icon: Truck,
          name: supplier.name,
          color: 'text-amber-600'
        } : null;
      default:
        return null;
    }
  };

  const isDueOrOverdue = (date) => {
    const today = new Date();
    const reminderDate = new Date(date);
    return reminderDate.toDateString() === today.toDateString() || reminderDate < today;
  };

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {reminders.map((reminder) => {
        const relatedEntity = getRelatedEntityName(reminder.related_to);
        const isUrgent = reminder.status === 'active' && isDueOrOverdue(reminder.date);
        const typeStyle = getTypeStyle(reminder.type);
        
        return (
          <motion.div
            key={reminder.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className={`card p-5 hover:shadow-lg transition-all duration-300 bg-white ${isUrgent ? 'border-red-300' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${typeStyle} rounded-lg`}>
                    <Bell className={`w-5 h-5`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{reminder.title}</h3>
                    <div className="flex gap-1 mt-2">
                      <Badge variant="outline" className="bg-gray-50 border border-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-xs">
                        {getReminderTypeName(reminder.type, reminder.custom_type)}
                      </Badge>
                      <Badge className={`${getStatusColor(reminder.status)} rounded-full px-2 py-0.5 text-xs flex items-center gap-1 border`}>
                        {getStatusIcon(reminder.status)}
                        <span className="mr-1">
                          {reminder.status === 'active' ? 'פעיל' :
                           reminder.status === 'completed' ? 'הושלם' : 'בוטל'}
                        </span>
                      </Badge>
                      
                      {/* סמן תזכורות שמסונכרנות עם קלנדר */}
                      {reminder.sync_with_calendar && (
                        <Badge className="bg-blue-100 text-blue-800 border border-blue-200 rounded-full px-2 py-0.5 text-xs flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          <span className="mr-1">מסונכרן</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="19" cy="12" r="1" />
                          <circle cx="5" cy="12" r="1" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border border-gray-200">
                      <DropdownMenuItem className="cursor-pointer rounded-lg focus:bg-gray-50" onClick={() => onEdit(reminder)}>
                        <Edit2 className="w-4 h-4 ml-2 text-gray-500" />
                        ערוך
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      
                      {reminder.status !== 'completed' && (
                        <DropdownMenuItem className="cursor-pointer rounded-lg focus:bg-green-50" onClick={() => onStatusChange(reminder, 'completed')}>
                          <CheckCircle className="w-4 h-4 ml-2 text-green-500" />
                          סמן כהושלם
                        </DropdownMenuItem>
                      )}
                      
                      {reminder.status !== 'active' && (
                        <DropdownMenuItem className="cursor-pointer rounded-lg focus:bg-blue-50" onClick={() => onStatusChange(reminder, 'active')}>
                          <Clock className="w-4 h-4 ml-2 text-blue-500" />
                          סמן כפעיל
                        </DropdownMenuItem>
                      )}
                      
                      {reminder.status !== 'cancelled' && (
                        <DropdownMenuItem className="cursor-pointer rounded-lg focus:bg-red-50" onClick={() => onStatusChange(reminder, 'cancelled')}>
                          <XCircle className="w-4 h-4 ml-2 text-red-500" />
                          בטל
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-5 space-y-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${isUrgent ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className={`text-sm ${isUrgent ? 'font-medium text-red-600' : 'text-gray-600'}`}>
                    {format(new Date(reminder.date), 'dd MMMM yyyy', { locale: he })}
                    {reminder.time && ` • ${reminder.time}`}
                  </span>
                </div>
                
                {reminder.is_recurring && (
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm text-gray-600">
                      חוזר {
                        reminder.recurrence_pattern === 'daily' ? 'יומי' :
                        reminder.recurrence_pattern === 'weekly' ? 'שבועי' :
                        reminder.recurrence_pattern === 'monthly' ? 'חודשי' : 'שנתי'
                      }
                    </span>
                  </div>
                )}
                
                {relatedEntity && (
                  <div className="flex items-center gap-2">
                    <relatedEntity.icon className={`w-4 h-4 ${relatedEntity.color}`} />
                    <span className="text-sm text-gray-600">{relatedEntity.name}</span>
                  </div>
                )}
                
                {reminder.priority !== 'medium' && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`w-4 h-4 ${
                      reminder.priority === 'high' ? 'text-red-500' : 'text-emerald-500'
                    }`} />
                    <span className="text-sm text-gray-600">
                      עדיפות {reminder.priority === 'high' ? 'גבוהה' : 'נמוכה'}
                    </span>
                  </div>
                )}
                
                {reminder.tags && reminder.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {reminder.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="bg-gray-50 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full">
                        <Tag className="w-3 h-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {reminder.description && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
                    {reminder.description}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
