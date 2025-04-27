import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, PieChart, FileText, File } from 'lucide-react';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ExpenseReport({
  properties,
  payments,
  dateRange,
  selectedBuilding,
  selectedProperty
}) {
  const [view, setView] = useState('chart');

  // פונקציית עזר להצגת סוג התשלום בעברית
  const getPaymentTypeText = (type) => {
    const paymentTypes = {
      rent: 'שכירות',
      bills: 'חשבונות',
      deposit: 'פיקדון',
      maintenance: 'תחזוקה',
      tax: 'מיסים',
      committee: 'ועד בית',
      insurance: 'ביטוח',
      other: 'אחר'
    };
    return paymentTypes[type] || type;
  };

  // חישוב נתוני הדוח
  const reportData = useMemo(() => {
    console.log("Calculating expense report with:", {
      payments: payments.length,
      properties: properties.length
    });
    
    // פילטור נכסים לפי הבחירה
    const relevantProperties = properties.filter(property => {
      const isRelevantBuilding = selectedBuilding === 'all' || property.building_id === selectedBuilding;
      const isRelevantProperty = selectedProperty === 'all' || property.id === selectedProperty;
      return isRelevantBuilding && isRelevantProperty;
    });
    
    console.log(`Found ${relevantProperties.length} properties matching filters`);
    
    if (!relevantProperties.length) {
      return { properties: [], totalsByType: [], chartData: [] };
    }

    // פילטור תשלומים לפי טווח תאריכים ונכסים רלוונטיים
    const filteredPayments = payments.filter(payment => {
      const paymentDate = payment.date ? new Date(payment.date) : 
                         payment.due_date ? new Date(payment.due_date) : null;
      
      if (!paymentDate) return false;
      
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      
      // איפוס שעות בתאריכים להשוואה מדויקת
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      paymentDate.setHours(12, 0, 0, 0);
      
      // בדוק אם התאריך בטווח והנכס רלוונטי
      const isInDateRange = paymentDate >= fromDate && paymentDate <= toDate;
      const isRelevantProperty = relevantProperties.some(p => p.id === payment.property_id);
      
      // בדוק אם זו הוצאה (לא שכירות ולא פיקדון)
      const isExpense = payment.type !== 'rent' && payment.type !== 'deposit';
      
      // בדוק אם התשלום בוצע
      const isPaid = payment.status === 'paid';
      
      return isInDateRange && isRelevantProperty && isExpense && isPaid;
    });
    
    console.log(`Found ${filteredPayments.length} expense payments in date range`);

    // חישוב הוצאות לפי נכס
    const propertyData = relevantProperties.map(property => {
      // מצא את כל התשלומים לנכס זה
      const propertyPayments = filteredPayments.filter(payment => 
        payment.property_id === property.id
      );
      
      // חישוב סה"כ הוצאות
      const totalExpenses = propertyPayments.reduce((sum, payment) => 
        sum + (payment.amount || 0), 0
      );
      
      // חישוב הוצאות לפי סוג
      const expensesByType = {};
      propertyPayments.forEach(payment => {
        const type = payment.type;
        if (!expensesByType[type]) {
          expensesByType[type] = 0;
        }
        expensesByType[type] += (payment.amount || 0);
      });
      
      // פירוט תשלומים
      const paymentDetails = propertyPayments.map(payment => ({
        id: payment.id,
        date: payment.date,
        type: payment.type,
        amount: payment.amount,
        description: getPaymentTypeText(payment.type)
      })).sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return {
        property,
        totalExpenses,
        expensesByType,
        paymentDetails,
        paymentCount: propertyPayments.length
      };
    }).filter(data => data.totalExpenses > 0) // הצג רק נכסים עם הוצאות
    .sort((a, b) => b.totalExpenses - a.totalExpenses); // מיון לפי סה"כ הוצאות
    
    // חישוב סה"כ הוצאות לפי סוג
    const totalsByType = {};
    filteredPayments.forEach(payment => {
      const type = payment.type;
      if (!totalsByType[type]) {
        totalsByType[type] = 0;
      }
      totalsByType[type] += (payment.amount || 0);
    });
    
    // הכנת נתונים לתרשים
    const chartData = Object.keys(totalsByType).map(type => ({
      name: getPaymentTypeText(type),
      value: totalsByType[type],
      type
    })).sort((a, b) => b.value - a.value);
    
    return {
      properties: propertyData,
      totalsByType,
      chartData
    };
  }, [properties, payments, dateRange, selectedBuilding, selectedProperty]);

  // הורדת הדוח כקובץ CSV
  const downloadReport = () => {
    if (!reportData.properties.length) return;
    
    // כותרות העמודות
    const headers = ['נכס', 'סוג הוצאה', 'סכום', 'תאריך'];
    
    // שורות הנתונים
    const rows = reportData.properties.flatMap(propData => 
      propData.paymentDetails.map(payment => [
        propData.property.property_number,
        payment.description,
        payment.amount.toFixed(2),
        payment.date
      ])
    );
    
    // צור מחרוזת CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // הורד את הקובץ
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `דוח_הוצאות_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // מערך צבעים לגרף
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

  // חישוב סכום הוצאות כולל
  const totalExpenses = reportData.properties.reduce(
    (sum, propData) => sum + propData.totalExpenses, 0
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">דוח הוצאות</h2>
          <Badge className="bg-blue-100 text-blue-800">
            {reportData.properties.length} נכסים
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadReport}
            className="flex items-center gap-2"
            disabled={!reportData.properties.length}
          >
            <FileText className="w-4 h-4" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            disabled={!reportData.properties.length}
          >
            <File className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      {!reportData.properties.length ? (
        <Alert className="bg-amber-50 text-amber-800 border border-amber-200">
          <AlertDescription className="text-center py-8">
            לא נמצאו הוצאות בטווח התאריכים שנבחר
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Card className="p-4 bg-white shadow-sm">
            <h3 className="font-semibold mb-2">סה"כ הוצאות</h3>
            <div className="text-2xl font-bold">{totalExpenses.toLocaleString()} ₪</div>
          </Card>

          <Tabs value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="chart">תרשים</TabsTrigger>
              <TabsTrigger value="table">טבלה</TabsTrigger>
              <TabsTrigger value="detailed">מפורט</TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="pt-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-4 text-center">התפלגות הוצאות לפי סוג</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reportData.chartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip formatter={(value) => `${value.toLocaleString()} ₪`} />
                      <Legend />
                      <Bar dataKey="value" name="סכום" isAnimationActive={false}>
                        {reportData.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="table" className="pt-4">
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-right">סוג הוצאה</TableHead>
                      <TableHead className="text-right">סכום</TableHead>
                      <TableHead className="text-right">אחוז מסה"כ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.chartData.map((item, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.value.toLocaleString()} ₪</TableCell>
                        <TableCell>
                          {totalExpenses ? ((item.value / totalExpenses) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="detailed" className="pt-4">
              <div className="space-y-6">
                {reportData.properties.map((propData, index) => (
                  <Card key={index} className="overflow-hidden border rounded-lg">
                    <div className="bg-gray-50 p-4 border-b">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold">{propData.property.property_number}</h3>
                        <div className="space-x-4 rtl:space-x-reverse">
                          <span className="text-sm font-medium">סה"כ: {propData.totalExpenses.toLocaleString()} ₪</span>
                        </div>
                      </div>
                    </div>
                    
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="text-right">תאריך</TableHead>
                          <TableHead className="text-right">סוג הוצאה</TableHead>
                          <TableHead className="text-right">סכום</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {propData.paymentDetails.map((payment, paymentIndex) => (
                          <TableRow key={paymentIndex} className="hover:bg-gray-50">
                            <TableCell>{payment.date ? format(new Date(payment.date), 'dd/MM/yyyy') : '-'}</TableCell>
                            <TableCell>{payment.description}</TableCell>
                            <TableCell className="font-medium">{payment.amount.toLocaleString()} ₪</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}