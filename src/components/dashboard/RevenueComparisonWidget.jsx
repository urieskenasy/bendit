import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isWithinInterval } from 'date-fns';
import { heIL } from 'date-fns/locale';

export default function RevenueComparisonWidget({ payments = [], size = 'medium' }) {
  const [period, setPeriod] = useState('6m');
  
  // הכנת נתונים לגרף
  const prepareData = () => {
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
      default:
        start = subMonths(today, 6);
        end = today;
    }
    
    // יצירת מערך של כל החודשים בטווח
    const months = eachMonthOfInterval({ start, end });
    
    // חישוב ההכנסות לכל חודש
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthlyIncome = payments
        .filter(payment => {
          if (!payment.date || payment.status !== 'paid' || payment.type !== 'rent') return false;
          const paymentDate = parseISO(payment.date);
          return isWithinInterval(paymentDate, { start: monthStart, end: monthEnd });
        })
        .reduce((sum, payment) => sum + (payment.amount || 0), 0);
        
      return {
        name: format(month, 'MMM', { locale: heIL }),
        revenue: monthlyIncome,
        month: month
      };
    });
  };
  
  const data = prepareData();
  
  // חישוב שינוי באחוזים בין החודש האחרון לקודם
  const calculateChange = () => {
    if (data.length < 2) return { percentage: 0, positive: true };
    
    const currentMonth = data[data.length - 1].revenue;
    const previousMonth = data[data.length - 2].revenue;
    
    if (previousMonth === 0) return { percentage: currentMonth > 0 ? 100 : 0, positive: currentMonth > 0 };
    
    const change = ((currentMonth - previousMonth) / previousMonth) * 100;
    return {
      percentage: Math.abs(Math.round(change * 10) / 10),
      positive: change >= 0
    };
  };
  
  const change = calculateChange();
  
  // חישוב צבע העמודות לפי השוואה לממוצע
  const getBarColors = () => {
    if (data.length === 0) return [];
    
    const avg = data.reduce((sum, item) => sum + item.revenue, 0) / data.length;
    
    return data.map(item => ({
      value: item.revenue,
      color: item.revenue >= avg ? '#4F46E5' : '#94A3B8'
    }));
  };
  
  const barColors = getBarColors();
  
  return (
    <Card className="p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-semibold">השוואת הכנסות</h2>
        </div>
        
        <Tabs value={period} onValueChange={setPeriod} className="w-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="3m">3 חודשים</TabsTrigger>
            <TabsTrigger value="6m">6 חודשים</TabsTrigger>
            <TabsTrigger value="12m">שנה</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
        <div className="bg-blue-50 rounded-lg p-4 flex-1">
          <div className="text-sm text-blue-600">הכנסות חודש אחרון</div>
          <div className="text-2xl font-bold text-blue-700">
            ₪{data.length > 0 ? data[data.length - 1].revenue.toLocaleString() : 0}
          </div>
          <div className={`flex items-center text-xs mt-1 ${change.positive ? 'text-green-600' : 'text-red-600'}`}>
            {change.positive ? (
              <ArrowUpRight className="w-3 h-3 mr-1" />
            ) : (
              <ArrowDownRight className="w-3 h-3 mr-1" />
            )}
            {change.percentage}% {change.positive ? 'מהחודש הקודם' : 'מהחודש הקודם'}
          </div>
        </div>
        
        <div className="bg-indigo-50 rounded-lg p-4 flex-1">
          <div className="text-sm text-indigo-600">הכנסות ממוצעות</div>
          <div className="text-2xl font-bold text-indigo-700">
            ₪{data.length > 0 ? Math.round(data.reduce((sum, item) => sum + item.revenue, 0) / data.length).toLocaleString() : 0}
          </div>
          <div className="text-xs text-indigo-600 mt-1">לתקופה הנבחרת</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 flex-1">
          <div className="text-sm text-green-600">סך הכנסות</div>
          <div className="text-2xl font-bold text-green-700">
            ₪{data.length > 0 ? data.reduce((sum, item) => sum + item.revenue, 0).toLocaleString() : 0}
          </div>
          <div className="text-xs text-green-600 mt-1">לתקופה הנבחרת</div>
        </div>
      </div>
      
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value) => [`₪${value.toLocaleString()}`, 'הכנסות']}
              labelFormatter={(label) => `חודש ${label}`}
            />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
              {barColors.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}