import React from 'react';
import { Card } from '@/components/ui/card';
import { CalendarClock, CreditCard, ChevronRight, AlertCircle } from 'lucide-react';
import { format, isBefore, parseISO, addDays } from 'date-fns';
import { heIL } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function UpcomingPaymentsWidget({ payments = [], tenants = [], properties = [], size }) {
  const today = new Date();
  const next30Days = addDays(today, 30);
  
  // יצירת רשימת התשלומים הקרובים ב-30 הימים הבאים
  const upcomingPayments = payments
    .filter(payment => {
      if (!payment.due_date || payment.status !== 'pending') return false;
      const dueDate = parseISO(payment.due_date);
      return isBefore(dueDate, next30Days) && !isBefore(dueDate, today);
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  
  // יצירת רשימת התשלומים שאיחרו
  const overduePayments = payments
    .filter(payment => {
      if (!payment.due_date || payment.status === 'paid') return false;
      const dueDate = parseISO(payment.due_date);
      return isBefore(dueDate, today);
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    
  const maxItems = size === 'small' ? 3 : (size === 'medium' ? 5 : 8);
  
  // שילוב התשלומים המאוחרים והקרובים
  const displayPayments = [...overduePayments, ...upcomingPayments].slice(0, maxItems);
  
  const getPropertyDetails = (payment) => {
    if (!payment.property_id) return 'לא ידוע';
    const property = properties.find(p => p.id === payment.property_id);
    return property ? property.property_number : 'לא ידוע';
  };
  
  const getTenantDetails = (payment) => {
    if (!payment.related_to || payment.related_to.type !== 'tenant') return 'לא ידוע';
    const tenant = tenants.find(t => t.id === payment.related_to.id);
    return tenant ? tenant.full_name : 'לא ידוע';
  };
  
  const getPaymentTypeLabel = (type) => {
    const types = {
      rent: 'שכירות',
      bills: 'חשבונות',
      deposit: 'פיקדון',
      maintenance: 'תחזוקה',
      tax: 'מיסים',
      committee: 'ועד בית',
      insurance: 'ביטוח',
      other: 'אחר'
    };
    return types[type] || type;
  };
  
  return (
    <Card className="p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-orange-600" />
          <h2 className="text-xl font-semibold">תשלומים קרובים</h2>
        </div>
        <Link to={createPageUrl('Payments')}>
          <Button variant="outline" size="sm">לכל התשלומים</Button>
        </Link>
      </div>
      
      {displayPayments.length > 0 ? (
        <div className="space-y-3">
          {displayPayments.map(payment => {
            const dueDate = parseISO(payment.due_date);
            const isOverdue = isBefore(dueDate, today);
            
            return (
              <div 
                key={payment.id} 
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  isOverdue ? 'bg-red-50 border-red-200' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isOverdue ? 'bg-red-100' : 'bg-orange-100'}`}>
                    {isOverdue ? (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <CreditCard className="w-5 h-5 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">₪{payment.amount?.toLocaleString()}</span>
                      <Badge className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-100">
                        {getPaymentTypeLabel(payment.type)}
                      </Badge>
                      {isOverdue && (
                        <Badge className="text-xs bg-red-100 text-red-800 hover:bg-red-100">
                          באיחור
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {getPropertyDetails(payment)} - {getTenantDetails(payment)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="text-sm font-medium ml-4" dir="ltr">
                    {format(dueDate, 'dd/MM/yyyy')}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          אין תשלומים קרובים ב-30 הימים הקרובים
        </div>
      )}
    </Card>
  );
}