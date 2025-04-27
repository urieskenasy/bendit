import React from 'react';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { BarChart3 } from 'lucide-react';

export default function ExpenseDistributionWidget({ payments = [], size = 'small' }) {
  // הגדרת קטגוריות הוצאות
  const expenseCategories = {
    maintenance: { label: 'תחזוקה', color: '#4F46E5' },
    tax: { label: 'מיסים', color: '#EC4899' },
    committee: { label: 'ועד בית', color: '#F97316' },
    insurance: { label: 'ביטוח', color: '#10B981' },
    bills: { label: 'חשבונות', color: '#06B6D4' },
    other: { label: 'אחר', color: '#94A3B8' }
  };
  
  // סינון רק הוצאות (לא תשלומי שכירות או פקדונות)
  const expenses = payments.filter(p => 
    p.type !== 'rent' && p.type !== 'deposit' && p.status === 'paid'
  );
  
  // חישוב סה"כ הוצאות לפי קטגוריה
  const expensesByCategory = {};
  
  expenses.forEach(expense => {
    const category = expense.type && expenseCategories[expense.type] ? expense.type : 'other';
    if (!expensesByCategory[category]) {
      expensesByCategory[category] = 0;
    }
    expensesByCategory[category] += (expense.amount || 0);
  });
  
  // הכנת הנתונים לגרף
  const data = Object.entries(expensesByCategory)
    .map(([key, value]) => ({
      name: expenseCategories[key].label,
      value,
      color: expenseCategories[key].color,
      category: key
    }))
    .filter(item => item.value > 0);
    
  // חישוב שיעור יחסי
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <Card className="p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-6 h-6 text-red-600" />
        <h2 className="text-xl font-semibold">התפלגות הוצאות</h2>
      </div>
      
      {total > 0 ? (
        <>
          <div className="h-40 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={size === 'small' ? 30 : 40}
                  outerRadius={size === 'small' ? 60 : 70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`₪${value.toLocaleString()} (${Math.round(value / total * 100)}%)`, 'סכום']}
                  labelFormatter={(label) => label}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-2">
            {data.map(item => (
              <div key={item.category} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <div className="flex items-center gap-1 text-sm">
                  <span>{item.name}</span>
                  <span className="font-medium">({Math.round(item.value / total * 100)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          אין נתוני הוצאות להצגה
        </div>
      )}
    </Card>
  );
}