import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Maintenance, Property, Building } from '@/api/entities';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export default function MaintenanceStatisticsChart() {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadChartData();
  }, []);
  
  const loadChartData = async () => {
    setIsLoading(true);
    try {
      const maintenanceData = await Maintenance.list();
      const propertyData = await Property.list();
      const buildingData = await Building.list();
      
      // החודשים האחרונים ל-6 חודשים אחורה
      const months = [];
      for (let i = 0; i < 6; i++) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);
        
        months.push({
          month: format(date, 'MM/yyyy'),
          start,
          end,
          name: format(date, 'MMMM') // שם החודש המלא
        });
      }
      
      // עיבוד הנתונים
      const formattedData = months.map(month => {
        const monthTasks = maintenanceData.filter(task => {
          const taskDate = task.reported_date ? parseISO(task.reported_date) : null;
          return taskDate && taskDate >= month.start && taskDate <= month.end;
        });
        
        // חלוקה לפי סוגים
        const propertyTasks = monthTasks.filter(task => task.related_to?.type === 'property').length;
        const buildingTasks = monthTasks.filter(task => task.related_to?.type === 'building').length;
        
        return {
          name: month.name,
          נכסים: propertyTasks,
          בניינים: buildingTasks,
          סך_הכל: propertyTasks + buildingTasks
        };
      });
      
      // סידור הנתונים בסדר כרונולוגי (מהישן לחדש)
      setChartData(formattedData.reverse());
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="bg-white shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">סטטיסטיקת משימות תחזוקה</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-blue-400 rounded-full border-t-transparent"></div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="נכסים" fill="#8884d8" />
                <Bar dataKey="בניינים" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}