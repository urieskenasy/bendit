import React from 'react';
import { Card } from '@/components/ui/card';
import { CircleDashed } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';

export default function OccupancyRateWidget({ properties = [], size = 'small' }) {
  // חישוב שיעור התפוסה
  const totalProperties = properties.length;
  const rentedProperties = properties.filter(p => p.rental_details?.status === 'rented').length;
  const occupancyRate = totalProperties > 0 ? Math.round((rentedProperties / totalProperties) * 100) : 0;
  
  // קביעת צבע בהתאם לשיעור התפוסה
  let progressColor = 'bg-green-500';
  if (occupancyRate < 70) progressColor = 'bg-orange-500';
  if (occupancyRate < 50) progressColor = 'bg-red-500';
  
  return (
    <Card className="p-6 h-full">
      <div className="flex items-center gap-2 mb-5">
        <CircleDashed className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold">שיעור תפוסה</h2>
      </div>
      
      <div className="flex flex-col items-center">
        <motion.div 
          className="w-32 h-32 relative mb-4 mt-2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="10"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={occupancyRate >= 70 ? "#22c55e" : (occupancyRate >= 50 ? "#f97316" : "#ef4444")}
              strokeWidth="10"
              strokeDasharray="283"
              strokeDashoffset="283"
              strokeLinecap="round"
              initial={{ strokeDashoffset: 283 }}
              animate={{ strokeDashoffset: 283 - (283 * occupancyRate / 100) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold">{occupancyRate}%</span>
          </div>
        </motion.div>
        
        <div className="text-center">
          <p className="text-gray-500">נכסים מושכרים</p>
          <p className="text-xl font-semibold">{rentedProperties}/{totalProperties}</p>
        </div>
        
        {size !== 'small' && (
          <div className="mt-4 w-full">
            <div className="flex justify-between text-sm mb-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
            <Progress value={occupancyRate} className={`h-2 ${progressColor}`} />
          </div>
        )}
      </div>
    </Card>
  );
}