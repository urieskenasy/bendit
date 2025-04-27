
import React from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO, isAfter, isBefore, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, addMonths } from 'date-fns';
import { heIL } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function CashflowWidget({ payments = [], size = 'medium' }) {
  const [period, setPeriod] = React.useState('6m');
  
  // הכנת נתונים לגרף
  const prepareData = () => {
    // מגדיר את טווח התאריכים בהתאם לבחירה
    const today = new Date();
    let start, end;
    
    switch (period) {
      case '3m':
        start = subMonths(today, 3);
        end = today;
        break;
      case '6m':
        start = subMonths(today, 6);
        end = today;
        break;
      case '12m':
        start = subMonths(today, 12);
        end = today;
        break;
      case 'future':
        start = today;
        end = addMonths(today, 6);
        break;
      default:
        start = subMonths(today, 6);
        end = today;
    }
    
    // יצירת מערך של כל החודשים בטווח
    const months = eachMonthOfInterval({ start, end });
    
    const monthlyData = months.map(month => {
      const startOfCurrentMonth = startOfMonth(month);
      const endOfCurrentMonth = endOfMonth(month);
      
      // מסנן תשלומים שבתוך החודש הנוכחי
      const monthlyIncome = payments
        .filter(payment => 
          payment.status === 'paid' &&
          payment.type === 'rent' &&
          payment.date && 
          isAfter(parseISO(payment.date), startOfCurrentMonth) && 
          isBefore(parseISO(payment.date), endOfCurrentMonth)
        )
        .reduce((sum, payment) => sum + (payment.amount || 0), 0);
        
      const monthlyExpense = payments
        .filter(payment => 
          payment.status === 'paid' &&
          ['maintenance', 'tax', 'committee', 'insurance'].includes(payment.type) &&
          payment.date && 
          isAfter(parseISO(payment.date), startOfCurrentMonth) && 
          isBefore(parseISO(payment.date), endOfCurrentMonth)
        )
        .reduce((sum, payment) => sum + (payment.amount || 0), 0);
        
      return {
        name: format(month, 'MMM yyyy', { locale: heIL }),
        הכנסות: monthlyIncome,
        הוצאות: monthlyExpense,
        רווח: monthlyIncome - monthlyExpense
      };
    });
    
    return monthlyData;
  };
  
  const data = prepareData();
  
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">תזרים מזומנים</h2>
        
        <Tabs value={period} onValueChange={setPeriod} className="w-auto">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="3m">3 חודשים</TabsTrigger>
            <TabsTrigger value="6m">6 חודשים</TabsTrigger>
            <TabsTrigger value="12m">שנה</TabsTrigger>
            <TabsTrigger value="future">תחזית</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className={size === 'xlarge' ? 'h-96' : 'h-72'}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="הכנסות" stroke="#4F46E5" strokeWidth={2} dot={{ strokeWidth: 2 }} />
            <Line type="monotone" dataKey="הוצאות" stroke="#EF4444" strokeWidth={2} dot={{ strokeWidth: 2 }} />
            {(size === 'large' || size === 'xlarge') && (
              <Line type="monotone" dataKey="רווח" stroke="#10B981" strokeWidth={2} dot={{ strokeWidth: 2 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
