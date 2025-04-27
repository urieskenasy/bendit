import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, PieChart, File, FileText } from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function OwnerReport({
  owners,
  properties,
  payments,
  dateRange,
  selectedBuilding,
  selectedProperty,
  selectedOwner,
  setSelectedOwner
}) {
  const [view, setView] = useState('summary');
  
  // חישוב נתוני הדוח
  const reportData = useMemo(() => {
    console.log("Calculating owner report with:", {
      payments: payments.length,
      properties: properties.length,
      owners: owners.length
    });
    
    if (!owners.length || !properties.length) {
      console.log("Missing owners or properties data");
      return [];
    }
    
    const data = [];
    
    // פילטור תשלומים לפי טווח תאריכים
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
      
      return paymentDate >= fromDate && paymentDate <= toDate;
    });
    
    console.log(`Filtered ${filteredPayments.length} payments in date range ${dateRange.from} to ${dateRange.to}`);

    // פילטור נכסים לפי הבחירה
    const relevantProperties = properties.filter(property => {
      return (selectedBuilding === 'all' || property.building_id === selectedBuilding) &&
             (selectedProperty === 'all' || property.id === selectedProperty);
    });
    
    console.log(`Found ${relevantProperties.length} properties matching building/property filters`);

    // חישוב הכנסות לכל בעלים
    owners.forEach(owner => {
      // פילטור לפי בעלים ספציפי אם נבחר
      if (selectedOwner !== 'all' && owner.id !== selectedOwner) {
        return;
      }

      // מצא את כל הנכסים ששייכים לבעלים זה
      const ownerProperties = relevantProperties.filter(property => {
        return Array.isArray(property.owners) && 
               property.owners.some(o => o.owner_id === owner.id);
      });
      
      console.log(`Owner ${owner.full_name} has ${ownerProperties.length} properties`);

      if (ownerProperties.length === 0) {
        return; // אין לבעלים זה נכסים שעונים על הפילטרים
      }

      let totalIncome = 0;
      let totalExpenses = 0;
      const propertyDetails = [];

      // עבור עבור כל נכס של הבעלים
      ownerProperties.forEach(property => {
        // חישוב אחוז הבעלות על הנכס
        const ownerShare = property.owners?.find(o => o.owner_id === owner.id)?.percentage || 100;
        
        // תשלומי הכנסה (שכירות)
        const propertyIncomePayments = filteredPayments.filter(p => 
          p.property_id === property.id && 
          (p.type === 'rent' || p.type === 'deposit') &&
          p.status === 'paid'
        );
        
        // תשלומי הוצאה 
        const propertyExpensePayments = filteredPayments.filter(p => 
          p.property_id === property.id && 
          p.type !== 'rent' && 
          p.type !== 'deposit' &&
          p.status === 'paid'
        );
        
        console.log(`Property ${property.property_number}: ${propertyIncomePayments.length} income payments, ${propertyExpensePayments.length} expense payments`);
        
        // חישוב הכנסות בפועל - לפי אחוז הבעלות
        const propertyIncome = propertyIncomePayments.reduce((sum, payment) => {
          const amount = payment.amount || 0;
          return sum + (amount * (ownerShare / 100));
        }, 0);
        
        // חישוב הוצאות בפועל - לפי אחוז הבעלות
        const propertyExpenseTotal = propertyExpensePayments.reduce((sum, payment) => {
          const amount = payment.amount || 0;
          // אם התשלום קשור לבעלים מסוים, בדוק אם זה הבעלים הנוכחי
          if (payment.owner_id && payment.owner_id !== owner.id) {
            return sum; // לא כולל תשלומים לבעלים אחרים
          }
          return sum + (amount * (ownerShare / 100));
        }, 0);

        console.log(`Property ${property.property_number}: Income=${propertyIncome}, Expenses=${propertyExpenseTotal}, Share=${ownerShare}%`);

        totalIncome += propertyIncome;
        totalExpenses += propertyExpenseTotal;

        // הוסף את הפרטים רק אם יש הכנסות או הוצאות
        if (propertyIncome > 0 || propertyExpenseTotal > 0) {
          const propertyPayments = [];
          
          // הוסף פירוט כל ההכנסות
          propertyIncomePayments.forEach(payment => {
            const amount = payment.amount * (ownerShare / 100);
            propertyPayments.push({
              date: payment.date,
              description: `הכנסה: ${payment.type === 'rent' ? 'שכירות' : 'פיקדון'}`,
              amount: amount,
              type: 'income'
            });
          });
          
          // הוסף פירוט כל ההוצאות
          propertyExpensePayments.forEach(payment => {
            // אם התשלום קשור לבעלים מסוים, בדוק אם זה הבעלים הנוכחי
            if (payment.owner_id && payment.owner_id !== owner.id) {
              return; // דלג על תשלומים לבעלים אחרים
            }
            const amount = payment.amount * (ownerShare / 100);
            propertyPayments.push({
              date: payment.date,
              description: `הוצאה: ${getPaymentTypeText(payment.type)}`,
              amount: amount,
              type: 'expense'
            });
          });
          
          propertyDetails.push({
            property_number: property.property_number,
            property_id: property.id,
            share: ownerShare,
            income: propertyIncome,
            expenses: propertyExpenseTotal,
            net: propertyIncome - propertyExpenseTotal,
            payments: propertyPayments.sort((a, b) => new Date(a.date) - new Date(b.date))
          });
        }
      });

      // הוסף את הבעלים לרשימה רק אם יש לו הכנסות או הוצאות
      if (propertyDetails.length > 0 || totalIncome > 0 || totalExpenses > 0) {
        data.push({
          owner,
          totalIncome,
          totalExpenses,
          netIncome: totalIncome - totalExpenses,
          propertyDetails: propertyDetails.sort((a, b) => b.net - a.net) // מיון לפי רווח נקי
        });
      }
    });

    console.log(`Final report has data for ${data.length} owners`);
    return data;
  }, [owners, properties, payments, dateRange, selectedBuilding, selectedProperty, selectedOwner]);

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

  // הורדת הדוח כקובץ CSV
  const downloadReport = () => {
    // כותרות העמודות
    const headers = ['בעלים', 'נכס', 'אחוז בעלות', 'הכנסות', 'הוצאות', 'רווח נקי'];
    
    // שורות הנתונים
    const rows = reportData.flatMap(ownerData => 
      ownerData.propertyDetails.map(detail => [
        ownerData.owner.full_name,
        detail.property_number,
        `${detail.share}%`,
        detail.income.toFixed(2),
        detail.expenses.toFixed(2),
        detail.net.toFixed(2)
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
    link.setAttribute('download', `דוח_בעלים_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // הורדת הדוח כקובץ PDF
  const downloadReportAsPdf = () => {
    // במציאות כאן היינו משתמשים בספריית יצירת PDF, 
    // אך לצורך הדגמה נשתמש בהתראה
    alert('הורדת הדוח כ-PDF תהיה זמינה בקרוב');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">דוח בעלים</h2>
          <Badge className="bg-blue-100 text-blue-800">
            {reportData.length} בעלים
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadReport}
            className="flex items-center gap-2"
            disabled={reportData.length === 0}
          >
            <FileText className="w-4 h-4" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadReportAsPdf}
            className="flex items-center gap-2"
            disabled={reportData.length === 0}
          >
            <File className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      {reportData.length === 0 ? (
        <Alert className="bg-amber-50 text-amber-800 border border-amber-200">
          <AlertDescription className="text-center py-8">
            לא נמצאו נתונים בטווח התאריכים שנבחר
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <Tabs value={view} onValueChange={setView} className="w-52">
              <TabsList>
                <TabsTrigger value="summary">סיכום</TabsTrigger>
                <TabsTrigger value="detailed">מפורט</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="w-52">
              <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="כל הבעלים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הבעלים</SelectItem>
                  {owners.map(owner => (
                    <SelectItem key={owner.id} value={owner.id}>{owner.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {view === 'summary' && (
            <Card className="overflow-hidden border rounded-lg">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="text-right">בעלים</TableHead>
                    <TableHead className="text-right">מספר נכסים</TableHead>
                    <TableHead className="text-right">סה"כ הכנסות</TableHead>
                    <TableHead className="text-right">סה"כ הוצאות</TableHead>
                    <TableHead className="text-right">רווח נקי</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((data, index) => (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{data.owner.full_name}</TableCell>
                      <TableCell>{data.propertyDetails.length}</TableCell>
                      <TableCell>{data.totalIncome.toLocaleString()} ₪</TableCell>
                      <TableCell>{data.totalExpenses.toLocaleString()} ₪</TableCell>
                      <TableCell className={data.netIncome >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {data.netIncome.toLocaleString()} ₪
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {view === 'detailed' && (
            <div className="space-y-6">
              {reportData.map((data, index) => (
                <Card key={index} className="overflow-hidden border rounded-lg">
                  <div className="bg-gray-50 p-4 border-b">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold">{data.owner.full_name}</h3>
                      <div className="space-x-4 rtl:space-x-reverse flex items-center">
                        <span className="text-sm font-medium">רווח נקי: <span className={data.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>{data.netIncome.toLocaleString()} ₪</span></span>
                      </div>
                    </div>
                  </div>
                  
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="text-right">נכס</TableHead>
                        <TableHead className="text-right">אחוז בעלות</TableHead>
                        <TableHead className="text-right">הכנסות</TableHead>
                        <TableHead className="text-right">הוצאות</TableHead>
                        <TableHead className="text-right">רווח נקי</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.propertyDetails.map((detail, detailIndex) => (
                        <TableRow key={detailIndex} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{detail.property_number}</TableCell>
                          <TableCell>{detail.share}%</TableCell>
                          <TableCell>{detail.income.toLocaleString()} ₪</TableCell>
                          <TableCell>{detail.expenses.toLocaleString()} ₪</TableCell>
                          <TableCell className={detail.net >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {detail.net.toLocaleString()} ₪
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}