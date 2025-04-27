import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  Activity, FileText, Building2, DollarSign, Wrench, 
  Users, Calendar, CheckCircle, XCircle, Clock, AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function RecentActivitiesWidget({ 
  contracts = [], 
  payments = [], 
  maintenance = [], 
  properties = [],
  tenants = [],
  size = 'medium' 
}) {
  // איסוף הפעילויות האחרונות ממקורות שונים
  const collectActivities = () => {
    const activities = [];
    
    // הוספת חוזים חדשים ומסתיימים
    contracts.forEach(contract => {
      if (contract.status === 'active') {
        activities.push({
          id: `contract_${contract.id}`,
          type: 'contract_created',
          date: contract.start_date,
          title: 'חוזה חדש',
          entity_id: contract.id,
          property_id: contract.property_id,
          tenant_id: contract.tenant_id
        });
      }
      
      if (contract.status === 'expired') {
        activities.push({
          id: `contract_expired_${contract.id}`,
          type: 'contract_expired',
          date: contract.end_date,
          title: 'חוזה הסתיים',
          entity_id: contract.id,
          property_id: contract.property_id,
          tenant_id: contract.tenant_id
        });
      }
    });
    
    // הוספת תשלומים אחרונים
    payments.forEach(payment => {
      if (payment.status === 'paid') {
        activities.push({
          id: `payment_${payment.id}`,
          type: 'payment_received',
          date: payment.date,
          title: 'תשלום התקבל',
          entity_id: payment.id,
          property_id: payment.property_id,
          amount: payment.amount,
          payment_type: payment.type
        });
      }
      else if (payment.status === 'late') {
        activities.push({
          id: `payment_late_${payment.id}`,
          type: 'payment_late',
          date: payment.due_date,
          title: 'תשלום באיחור',
          entity_id: payment.id,
          property_id: payment.property_id,
          amount: payment.amount,
          payment_type: payment.type
        });
      }
    });
    
    // הוספת משימות תחזוקה
    maintenance.forEach(task => {
      if (task.status === 'completed') {
        activities.push({
          id: `maintenance_completed_${task.id}`,
          type: 'maintenance_completed',
          date: task.completed_date,
          title: 'משימת תחזוקה הושלמה',
          entity_id: task.id,
          property_id: task.related_to?.type === 'property' ? task.related_to.id : null,
          task_title: task.title
        });
      }
      else if (task.status === 'open' || task.status === 'in_progress') {
        activities.push({
          id: `maintenance_created_${task.id}`,
          type: 'maintenance_created',
          date: task.reported_date,
          title: 'משימת תחזוקה חדשה',
          entity_id: task.id,
          property_id: task.related_to?.type === 'property' ? task.related_to.id : null,
          task_title: task.title,
          priority: task.priority
        });
      }
    });
    
    // סינון פעילויות שיש להן תאריך תקף
    return activities
      .filter(activity => activity.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };
  
  const getPropertyDetails = (property_id) => {
    if (!property_id) return 'לא ידוע';
    const property = properties.find(p => p.id === property_id);
    return property ? property.property_number : 'לא ידוע';
  };
  
  const getTenantDetails = (tenant_id) => {
    if (!tenant_id) return 'לא ידוע';
    const tenant = tenants.find(t => t.id === tenant_id);
    return tenant ? tenant.full_name : 'לא ידוע';
  };
  
  const getActivityIcon = (activity) => {
    switch (activity.type) {
      case 'contract_created':
        return <FileText className="text-blue-500" />;
      case 'contract_expired':
        return <XCircle className="text-red-500" />;
      case 'payment_received':
        return <DollarSign className="text-green-500" />;
      case 'payment_late':
        return <AlertCircle className="text-red-500" />;
      case 'maintenance_completed':
        return <CheckCircle className="text-green-500" />;
      case 'maintenance_created':
        return <Wrench className="text-orange-500" />;
      default:
        return <Calendar className="text-gray-500" />;
    }
  };
  
  const getActivityDescription = (activity) => {
    switch (activity.type) {
      case 'contract_created':
        return `חוזה חדש נחתם עבור ${getPropertyDetails(activity.property_id)} עם ${getTenantDetails(activity.tenant_id)}`;
      case 'contract_expired':
        return `חוזה הסתיים עבור ${getPropertyDetails(activity.property_id)} עם ${getTenantDetails(activity.tenant_id)}`;
      case 'payment_received':
        return `תשלום ${activity.payment_type === 'rent' ? 'שכירות' : activity.payment_type} בסך ${activity.amount?.toLocaleString()} ₪ התקבל עבור ${getPropertyDetails(activity.property_id)}`;
      case 'payment_late':
        return `תשלום ${activity.payment_type === 'rent' ? 'שכירות' : activity.payment_type} בסך ${activity.amount?.toLocaleString()} ₪ באיחור עבור ${getPropertyDetails(activity.property_id)}`;
      case 'maintenance_completed':
        return `משימת תחזוקה "${activity.task_title}" הושלמה ב${getPropertyDetails(activity.property_id)}`;
      case 'maintenance_created':
        return `משימת תחזוקה חדשה "${activity.task_title}" ב${getPropertyDetails(activity.property_id)}`;
      default:
        return 'פעילות לא ידועה';
    }
  };
  
  const getPriorityBadge = (priority) => {
    if (!priority) return null;
    
    let badgeStyle = '';
    let label = '';
    
    switch (priority) {
      case 'urgent':
        badgeStyle = 'bg-red-100 text-red-800';
        label = 'דחוף';
        break;
      case 'high':
        badgeStyle = 'bg-orange-100 text-orange-800';
        label = 'גבוה';
        break;
      case 'medium':
        badgeStyle = 'bg-blue-100 text-blue-800';
        label = 'בינוני';
        break;
      case 'low':
        badgeStyle = 'bg-green-100 text-green-800';
        label = 'נמוך';
        break;
      default:
        return null;
    }
    
    return <Badge className={badgeStyle}>{label}</Badge>;
  };
  
  const activities = collectActivities();
  const displayedActivities = activities.slice(0, size === 'small' ? 3 : (size === 'medium' ? 5 : 10));
  
  return (
    <Card className="p-6 h-full">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-semibold">פעילות אחרונה</h2>
      </div>
      
      {displayedActivities.length > 0 ? (
        <div className="space-y-5">
          {displayedActivities.map(activity => (
            <div key={activity.id} className="flex gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                {getActivityIcon(activity)}
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{activity.title}</h3>
                  {activity.priority && getPriorityBadge(activity.priority)}
                </div>
                <p className="text-sm text-gray-600 mt-1">{getActivityDescription(activity)}</p>
                <div className="text-xs text-gray-500 mt-1">
                  {activity.date ? format(parseISO(activity.date), 'dd/MM/yyyy') : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          אין פעילות אחרונה להצגה
        </div>
      )}
    </Card>
  );
}