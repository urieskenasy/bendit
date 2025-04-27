import React from 'react';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ChartPie, Home, Store, LandPlot, Briefcase, Car, Package } from 'lucide-react';

export default function PropertyTypeDistributionWidget({ properties = [], size = 'small' }) {
  // חישוב התפלגות סוגי הנכסים
  const propertyTypes = {
    apartment: { count: 0, label: 'דירות', color: '#4F46E5', icon: <Home className="w-4 h-4" /> },
    office: { count: 0, label: 'משרדים', color: '#06B6D4', icon: <Briefcase className="w-4 h-4" /> },
    store: { count: 0, label: 'חנויות', color: '#10B981', icon: <Store className="w-4 h-4" /> },
    warehouse: { count: 0, label: 'מחסנים', color: '#F97316', icon: <Package className="w-4 h-4" /> },
    parking: { count: 0, label: 'חניות', color: '#EC4899', icon: <Car className="w-4 h-4" /> },
    other: { count: 0, label: 'אחר', color: '#94A3B8', icon: <LandPlot className="w-4 h-4" /> }
  };
  
  // ספירת הנכסים לפי סוג
  properties.forEach(property => {
    const type = property.type && propertyTypes[property.type] ? property.type : 'other';
    propertyTypes[type].count++;
  });
  
  // הכנת הנתונים לגרף
  const data = Object.entries(propertyTypes)
    .map(([key, value]) => ({
      name: value.label,
      value: value.count,
      color: value.color,
      icon: value.icon,
      type: key
    }))
    .filter(item => item.value > 0);
  
  // סידור התרשים באחוזים
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <Card className="p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <ChartPie className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-semibold">התפלגות סוגי נכסים</h2>
      </div>
      
      {properties.length > 0 ? (
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
                  formatter={(value) => [`${value} (${Math.round(value / total * 100)}%)`, 'כמות']}
                  labelFormatter={(label) => label}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-2">
            {data.map(item => (
              <div key={item.type} className="flex items-center gap-2">
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
          אין נתונים להצגה
        </div>
      )}
    </Card>
  );
}