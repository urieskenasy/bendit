
import React from 'react';
import { Card } from '@/components/ui/card';
import { DollarSign, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, subMonths } from 'date-fns';

export default function PaymentStatsWidget({ payments = [], size = 'medium' }) {
  // חישוב סטטיסטיקות
  const currentMonth = new Date();
  const previousMonth = subMonths(currentMonth, 1);
  
  const formatDate = (date) => format(new Date(date), 'MM/yyyy');
  const currentMonthFormatted = formatDate(currentMonth);
  const previousMonthFormatted = formatDate(previousMonth);
  
  const currentMonthPayments = payments.filter(p => 
    p.type === 'rent' && formatDate(p.date) === currentMonthFormatted
  );
  
  const previousMonthPayments = payments.filter(p => 
    p.type === 'rent' && formatDate(p.date) === previousMonthFormatted
  );
  
  const stats = {
    totalPayments: payments.length,
    pendingPayments: payments.filter(p => p.status === 'pending').length,
    latePayments: payments.filter(p => p.status === 'late').length,
    
    currentMonthIncome: currentMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    previousMonthIncome: previousMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    
    totalIncome: payments
      .filter(p => p.type === 'rent')
      .reduce((sum, p) => sum + (p.amount || 0), 0)
  };
  
  // חישוב אחוז שינוי בהכנסות
  const incomeChange = stats.previousMonthIncome 
    ? ((stats.currentMonthIncome - stats.previousMonthIncome) / stats.previousMonthIncome) * 100
    : 0;
  
  // עיגול ל-2 מספרים עשרוניים
  const roundedIncomeChange = Math.round(incomeChange * 100) / 100;
  
  return (
    <Card className="p-6 h-full">
      <div className="flex items-center gap-2 mb-6">
        <DollarSign className="w-6 h-6 text-green-600" />
        <h2 className="text-xl font-semibold">תשלומים</h2>
      </div>

      <div className={`grid ${size === 'large' ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">₪{stats.currentMonthIncome.toLocaleString()}</div>
          <div className="text-sm text-green-600">הכנסות החודש</div>
          {incomeChange !== 0 && (
            <div className={`flex items-center text-xs mt-1 ${incomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {incomeChange >= 0 ? (
                <ArrowUpRight className="w-3 h-3 mr-1" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-1" />
              )}
              {Math.abs(roundedIncomeChange)}% {incomeChange >= 0 ? 'מהחודש הקודם' : 'מהחודש הקודם'}
            </div>
          )}
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-700">{stats.pendingPayments}</div>
          <div className="text-sm text-yellow-600">תשלומים בהמתנה</div>
        </div>
        
        {size === 'large' && (
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-700">{stats.latePayments}</div>
            <div className="text-sm text-red-600">תשלומים באיחור</div>
          </div>
        )}
      </div>

      {size === 'large' && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">התפלגות תשלומים</h3>
          <div className="space-y-3">
            {/* בעתיד - אפשר להוסיף גרף התפלגות תשלומים */}
          </div>
        </div>
      )}
    </Card>
  );
}
