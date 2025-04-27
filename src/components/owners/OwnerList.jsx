import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, CreditCard, Building2, Edit2, Trash2, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { generateOwnerProfitReport } from '../utils/ownerSync';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/components/ui/use-toast";

export default function OwnerList({ owners, onEdit, onDelete }) {
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('monthly');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const { toast } = useToast();
  
  const handleGenerateReport = async (owner) => {
    setSelectedOwner(owner);
    setReportData(null);
    setIsGeneratingReport(true);
    
    try {
      // Directly generate a simple report without calling the external function
      // This helps bypass the error until we fix the external function
      const now = new Date();
      
      // Get owner properties data from the owner object
      const activeProperties = owner.income_stats?.active_properties || 0;
      const rentedProperties = owner.income_stats?.rented_properties || 0;
      const monthlyIncome = owner.income_stats?.monthly_income || 0;
      
      // Estimated expenses (30% of income)
      const estimatedExpenses = Math.round(monthlyIncome * 0.3);
      const netProfit = monthlyIncome - estimatedExpenses;
      
      // Create a simple report
      const report = {
        owner_id: owner.id,
        owner_name: owner.full_name,
        period: reportPeriod,
        report_date: now.toISOString().split('T')[0],
        totalIncome: monthlyIncome * (reportPeriod === 'yearly' ? 12 : 1),
        totalExpenses: estimatedExpenses * (reportPeriod === 'yearly' ? 12 : 1),
        netProfit: netProfit * (reportPeriod === 'yearly' ? 12 : 1),
        properties: [
          {
            property_id: 'estimate',
            property_number: 'סה"כ נכסים',
            address: 'נתון מסכם',
            ownership_percentage: 100,
            income: monthlyIncome * (reportPeriod === 'yearly' ? 12 : 1),
            expenses: estimatedExpenses * (reportPeriod === 'yearly' ? 12 : 1),
            net_profit: netProfit * (reportPeriod === 'yearly' ? 12 : 1)
          }
        ]
      };
      
      setReportData(report);
      
      // Inform the user that this is an estimated report
      toast({
        title: "דוח משוער",
        description: "יוצג דוח משוער מבוסס על נתוני ההכנסה הכוללים",
      });
      
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        variant: "destructive",
        title: "שגיאה בייצור הדוח",
        description: "לא ניתן לייצר את הדוח כרגע. נסה שוב מאוחר יותר.",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const closeReportDialog = () => {
    setSelectedOwner(null);
    setReportData(null);
  };

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {owners.map((owner) => (
          <motion.div
            key={owner.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-5 hover:shadow-lg transition-all duration-300 bg-white hover:border-indigo-100">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-800 text-lg">{owner.full_name}</h3>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleGenerateReport(owner)}
                    className="rounded-full hover:bg-green-50"
                    title="דוח כספי"
                  >
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(owner)}
                    className="rounded-full hover:bg-blue-50"
                  >
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>מחיקת בעל נכס</AlertDialogTitle>
                        <AlertDialogDescription>
                          האם אתה בטוח שברצונך למחוק את בעל הנכס "{owner.full_name}"?
                          פעולה זו לא ניתנת לביטול.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDelete(owner.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          מחק
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              
              <div className="mt-2 text-sm text-gray-500">{owner.id_number}</div>
              
              <div className="mt-4 space-y-2 pt-4 border-t border-gray-100">
                {owner.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{owner.phone}</span>
                  </div>
                )}
                
                {owner.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{owner.email}</span>
                  </div>
                )}
                
                {owner.bank_account?.bank_name && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <span>
                      {owner.bank_account.bank_name}, סניף {owner.bank_account.branch}
                    </span>
                  </div>
                )}
              </div>
              
              {owner.income_stats && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">הכנסה חודשית:</span>
                    <span className="font-bold text-green-600">₪{owner.income_stats.monthly_income.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge className="bg-blue-100 text-blue-800">
                      {owner.income_stats.active_properties} נכסים
                    </Badge>
                    
                    <Badge className="bg-green-100 text-green-800">
                      {owner.income_stats.rented_properties} מושכרים
                    </Badge>
                    
                    <Badge className="bg-purple-100 text-purple-800">
                      {Math.round(owner.income_stats.average_percentage)}% בעלות ממוצעת
                    </Badge>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
      
      {/* דיאלוג דוח רווח והפסד */}
      <Dialog open={!!selectedOwner} onOpenChange={open => !open && closeReportDialog()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              דוח כספי - {selectedOwner?.full_name}
            </DialogTitle>
            <DialogDescription>
              {reportPeriod === 'monthly' ? 'דוח חודשי' : 'דוח שנתי'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-2">
            <div className="flex gap-2 mb-4">
              <Button 
                variant={reportPeriod === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setReportPeriod('monthly');
                  selectedOwner && handleGenerateReport(selectedOwner);
                }}
              >
                דוח חודשי
              </Button>
              <Button 
                variant={reportPeriod === 'yearly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setReportPeriod('yearly');
                  selectedOwner && handleGenerateReport(selectedOwner);
                }}
              >
                דוח שנתי
              </Button>
            </div>
            
            {isGeneratingReport ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                  <p className="text-gray-500">מייצר דוח...</p>
                </div>
              </div>
            ) : reportData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-xs text-gray-500">סה"כ הכנסות</p>
                    <p className="text-2xl font-bold text-green-600">₪{reportData.totalIncome.toLocaleString()}</p>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <p className="text-xs text-gray-500">סה"כ הוצאות</p>
                    <p className="text-2xl font-bold text-red-600">₪{reportData.totalExpenses.toLocaleString()}</p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-xs text-gray-500">רווח נטו</p>
                    <p className="text-2xl font-bold text-blue-600">₪{reportData.netProfit.toLocaleString()}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">פירוט לפי נכסים</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-right p-2 border">נכס</th>
                          <th className="text-right p-2 border">% בעלות</th>
                          <th className="text-right p-2 border">הכנסות</th>
                          <th className="text-right p-2 border">הוצאות</th>
                          <th className="text-right p-2 border">רווח נטו</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.properties.map((property, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-2 border">
                              {property.property_number}
                              <span className="text-xs text-gray-500 block">{property.address}</span>
                            </td>
                            <td className="p-2 border text-center">{property.ownership_percentage}%</td>
                            <td className="p-2 border text-left">₪{property.income.toLocaleString()}</td>
                            <td className="p-2 border text-left">₪{property.expenses.toLocaleString()}</td>
                            <td className="p-2 border text-left font-medium">
                              <span className={property.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                ₪{property.net_profit.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-blue-50 font-bold">
                          <td colSpan="2" className="p-2 border text-right">סה"כ</td>
                          <td className="p-2 border text-left">₪{reportData.totalIncome.toLocaleString()}</td>
                          <td className="p-2 border text-left">₪{reportData.totalExpenses.toLocaleString()}</td>
                          <td className="p-2 border text-left">
                            <span className={reportData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                              ₪{reportData.netProfit.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">אין נתונים להצגה</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" onClick={closeReportDialog}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}