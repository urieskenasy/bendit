import React from 'react';
import { Card } from '@/components/ui/card';
import { Users, User, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInMonths, isAfter, addMonths, isBefore } from 'date-fns';

export default function TopTenantsWidget({ tenants = [], contracts = [], payments = [], properties = [], size = 'medium' }) {
  // חישוב ציון לכל שוכר
  const calculateTenantScore = (tenant) => {
    let score = 0;
    const today = new Date();
    
    // מציאת החוזה הנוכחי של השוכר
    const currentContract = contracts.find(c => 
      c.tenant_id === tenant.id && 
      c.status === 'active'
    );
    
    if (!currentContract) return { score: 0, tenant, contract: null };
    
    // חישוב משך זמן השכירות בחודשים
    if (currentContract.start_date) {
      const startDate = parseISO(currentContract.start_date);
      const months = differenceInMonths(today, startDate);
      score += Math.min(months, 36) / 2; // עד 18 נקודות למשך זמן (מקסימום 3 שנים)
    }
    
    // בדיקת תשלומים בזמן
    const tenantPayments = payments.filter(p => 
      p.related_to?.type === 'tenant' && 
      p.related_to.id === tenant.id
    );
    
    const onTimePayments = tenantPayments.filter(p => p.status === 'paid' && p.due_date);
    const latePayments = tenantPayments.filter(p => p.status === 'late' || (p.status === 'paid' && p.due_date && p.date && isAfter(parseISO(p.date), parseISO(p.due_date))));
    
    score += onTimePayments.length * 2; // 2 נקודות לכל תשלום בזמן
    score -= latePayments.length * 5; // הורדת 5 נקודות לכל תשלום באיחור
    
    // בדיקה האם החוזה מתחדש בקרוב
    if (currentContract.end_date) {
      const endDate = parseISO(currentContract.end_date);
      if (isAfter(endDate, today) && isBefore(endDate, addMonths(today, 3))) {
        score += 10; // 10 נקודות בונוס לחוזה שמסתיים בקרוב (אפשרות לחידוש)
      }
    }
    
    // בדיקת משימות תחזוקה (לא ממומש כאן)
    
    return { 
      score: Math.max(0, score), 
      tenant, 
      contract: currentContract,
      property: properties.find(p => p.id === currentContract.property_id),
      onTimePaymentsCount: onTimePayments.length,
      latePaymentsCount: latePayments.length
    };
  };
  
  // סינון שוכרים פעילים
  const activeTenants = tenants.filter(t => t.status === 'active');
  
  // חישוב הציון לכל שוכר
  const tenantsWithScore = activeTenants
    .map(calculateTenantScore)
    .filter(item => item.score > 0 && item.contract) // סינון שוכרים ללא חוזה פעיל
    .sort((a, b) => b.score - a.score); // מיון לפי ציון
    
  const topTenants = tenantsWithScore.slice(0, size === 'small' ? 3 : (size === 'medium' ? 5 : 10));
  
  const getPaymentStatus = (tenant) => {
    if (tenant.latePaymentsCount > tenant.onTimePaymentsCount * 0.3) {
      return {
        icon: <AlertCircle className="w-4 h-4 text-red-500" />,
        label: 'תשלומים באיחור',
        color: 'bg-red-100 text-red-800'
      };
    }
    
    if (tenant.latePaymentsCount > 0) {
      return {
        icon: <Clock className="w-4 h-4 text-orange-500" />,
        label: 'תשלומים משתנים',
        color: 'bg-orange-100 text-orange-800'
      };
    }
    
    return {
      icon: <CheckCircle className="w-4 h-4 text-green-500" />,
      label: 'תשלומים בזמן',
      color: 'bg-green-100 text-green-800'
    };
  };
  
  return (
    <Card className="p-6 h-full">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-semibold">שוכרים מובילים</h2>
      </div>
      
      {topTenants.length > 0 ? (
        <div className="space-y-4">
          {topTenants.map(({ tenant, score, contract, property, ...rest }) => {
            const paymentStatus = getPaymentStatus(rest);
            
            return (
              <div key={tenant.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-indigo-700" />
                  </div>
                  
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{tenant.full_name}</h3>
                      <Badge className="bg-indigo-100 text-indigo-800">
                        {Math.round(score)} נקודות
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600 mt-1">
                      {property?.property_number ? `דירה ${property.property_number}` : 'נכס לא ידוע'}
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-gray-500">
                        חוזה עד: {contract?.end_date ? format(parseISO(contract.end_date), 'dd/MM/yyyy') : 'לא ידוע'}
                      </div>
                      
                      <Badge className={paymentStatus.color}>
                        <span className="flex items-center gap-1">
                          {paymentStatus.icon}
                          {paymentStatus.label}
                        </span>
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          אין נתוני שוכרים להצגה
        </div>
      )}
    </Card>
  );
}