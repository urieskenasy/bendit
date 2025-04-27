
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Wrench, 
  Edit2, 
  AlertTriangle, 
  Building2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RotateCw, 
  DollarSign,
  Trash2,
  User,
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { parseISO, differenceInDays } from 'date-fns';
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function MaintenanceList({ 
  maintenance, 
  properties, 
  buildings, 
  suppliers, 
  tenants, 
  owners, 
  onEdit, 
  onStatusChange, 
  onDelete,
  onCompletionUpdate,
  isLoading 
}) {
  const getPropertyInfo = (maintenanceItem) => {
    if (maintenanceItem.related_to?.type === 'property') {
      const property = properties.find(p => p.id === maintenanceItem.related_to.id);
      if (property) {
        const building = buildings.find(b => b.id === property.building_id);
        return {
          name: property.property_number,
          building: building?.name || 'לא ידוע'
        };
      }
    } else if (maintenanceItem.related_to?.type === 'building') {
      const building = buildings.find(b => b.id === maintenanceItem.related_to.id);
      return {
        name: 'בניין',
        building: building?.name || 'לא ידוע'
      };
    }
    return { name: 'לא ידוע', building: 'לא ידוע' };
  };

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'לא נבחר';
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'maintenance': return <Wrench className="w-5 h-5 text-indigo-600" />;
      case 'repair': return <Wrench className="w-5 h-5 text-red-600" />;
      case 'renovation': return <Building2 className="w-5 h-5 text-amber-600" />;
      case 'cleaning': return <Wrench className="w-5 h-5 text-blue-600" />;
      case 'inspection': return <Wrench className="w-5 h-5 text-green-600" />;
      default: return <Wrench className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPaymentByText = (paymentBy, tenantPortion) => {
    switch(paymentBy) {
      case 'owner': return 'בעל הנכס';
      case 'tenant': return 'השוכר';
      case 'both': return `חלוקה (${tenantPortion || 0}% שוכר)`;
      case 'building_committee': return 'ועד הבית';
      default: return 'לא ידוע';
    }
  };

  const getHandlingTime = (task) => {
    if (!task.reported_date) return null;
    
    const startDate = parseISO(task.reported_date);
    let endDate;
    
    if (task.status === 'completed' && task.completed_date) {
      endDate = parseISO(task.completed_date);
    } else {
      endDate = new Date();
    }
    
    const daysToHandle = differenceInDays(endDate, startDate);
    return daysToHandle;
  };
  
  const renderHandlingTimeIndicator = (task) => {
    if (task.status === 'cancelled') return null;
    
    const daysToHandle = getHandlingTime(task);
    if (daysToHandle === null) return null;
    
    let color = 'bg-green-500';
    let tooltip = 'זמן טיפול תקין';
    
    if (daysToHandle > 14) {
      color = 'bg-red-500';
      tooltip = 'זמן טיפול ארוך מהרגיל';
    } else if (daysToHandle > 7) {
      color = 'bg-yellow-500';
      tooltip = 'זמן טיפול ממוצע';
    }
    
    return (
      <div className="flex items-center gap-1" title={tooltip}>
        <div className={`${color} w-2 h-2 rounded-full`}></div>
        <span className="text-xs text-gray-500">{daysToHandle} ימים</span>
      </div>
    );
  };

  const handleCompleteTask = async (item) => {
    await onStatusChange(item, 'completed');
  };

  // Quick completion with payment info
  const [selectedTask, setSelectedTask] = useState(null);
  const [quickCompletionData, setQuickCompletionData] = useState({
    paid_by: '',
    payment_method: 'cash',
    cost: 0,
    responsibility: 'owner' // Default responsibility is owner
  });

  const handleQuickCompletionSubmit = async () => {
    if (!selectedTask) return;
    
    try {
      // Update the task with completion information
      const updatedTask = {
        ...selectedTask,
        status: 'completed',
        completed_date: format(new Date(), 'yyyy-MM-dd'),
        payment_info: {
          ...selectedTask.payment_info,
          paid_by: quickCompletionData.paid_by,
          payment_method: quickCompletionData.payment_method,
          cost: parseFloat(quickCompletionData.cost) || 0
        }
      };
      
      // Call the parent component's onStatusChange function to update and sync
      await onCompletionUpdate(updatedTask);
      
      // Reset the form
      setSelectedTask(null);
      setQuickCompletionData({
        paid_by: '',
        payment_method: 'cash',
        cost: 0,
        responsibility: 'owner'
      });
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="text-gray-500">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (maintenance.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500">לא נמצאו משימות תחזוקה בפילטר הנוכחי</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {maintenance.map((item) => {
        const propertyInfo = getPropertyInfo(item);
        
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="card p-5 hover:shadow-lg transition-all duration-300 bg-white hover:border-indigo-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-indigo-100">
                    {getTypeIcon(item.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{item.title}</h3>
                    <p className="text-sm text-gray-500">
                      {propertyInfo.name} - {propertyInfo.building}
                    </p>
                  </div>
                </div>
                <div className="flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(item)}
                    className="rounded-full hover:bg-indigo-50"
                  >
                    <Edit2 className="w-4 h-4 text-indigo-500" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-indigo-50"
                      >
                        <RotateCw className="w-4 h-4 text-indigo-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onStatusChange(item, 'open')}>
                        פתוח
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStatusChange(item, 'in_progress')}>
                        בטיפול
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStatusChange(item, 'completed')}>
                        הושלם
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStatusChange(item, 'cancelled')}>
                        בוטל
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                        <AlertDialogTitle>מחיקת משימה</AlertDialogTitle>
                        <AlertDialogDescription>
                          האם אתה בטוח שברצונך למחוק את המשימה "{item.title}"?
                          פעולה זו לא ניתנת לביטול.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDelete(item.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          מחק
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {item.description && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                </div>
              )}

              <div className="mt-4 space-y-3 pt-4 border-t border-gray-100">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">דחיפות:</span>
                  <Badge className={getPriorityColor(item.priority)}>
                    {item.priority === 'urgent' && 'דחוף'}
                    {item.priority === 'high' && 'גבוהה'}
                    {item.priority === 'medium' && 'בינונית'}
                    {item.priority === 'low' && 'נמוכה'}
                  </Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">סטטוס:</span>
                  <Badge className={getStatusColor(item.status)}>
                    {item.status === 'open' && 'פתוח'}
                    {item.status === 'in_progress' && 'בטיפול'}
                    {item.status === 'completed' && 'הושלם'}
                    {item.status === 'cancelled' && 'בוטל'}
                  </Badge>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">ספק:</span>
                  <span className="text-sm font-medium text-gray-700">
                    {getSupplierName(item.supplier_id)}
                  </span>
                </div>
                
                {item.cost && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">עלות:</span>
                    <span className="text-sm font-medium text-gray-700 flex items-center">
                      ₪{item.cost.toLocaleString()}
                      <span className="text-xs text-gray-500 mr-1">
                        ({getPaymentByText(item.payment_by, item.tenant_portion)})
                      </span>
                    </span>
                  </div>
                )}

                {item.scheduled_date && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">מתוכנן ל:</span>
                    <span className="text-sm font-medium text-gray-700">
                      {format(new Date(item.scheduled_date), 'dd/MM/yyyy')}
                    </span>
                  </div>
                )}
                {/* אינדיקטור זמן טיפול */}
                {renderHandlingTimeIndicator(item)}
                
                {/* Payment info if available */}
                {item.payment_info?.cost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">תשלום:</span>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">
                        ₪{item.payment_info.cost.toLocaleString()}
                      </span>
                      {item.payment_info.paid_by && (
                        <span className="text-xs text-gray-500 mr-1">
                          ({item.payment_info.paid_by === 'tenant' ? 'דייר' : 
                            item.payment_info.paid_by === 'owner' ? 'בעלים' : 'ועד בית'})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick completion buttons */}
              {item.status !== 'completed' && item.status !== 'cancelled' && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:text-green-700"
                    onClick={() => handleCompleteTask(item)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    סיום
                  </Button>
                  
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-700"
                        onClick={() => setSelectedTask(item)}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        סיום + תשלום
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left">
                      <SheetHeader>
                        <SheetTitle>סיום משימה ותיעוד תשלום</SheetTitle>
                        <SheetDescription>
                          הזן את פרטי התשלום וסמן את המשימה כהושלמה
                        </SheetDescription>
                      </SheetHeader>
                      <div className="py-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="cost">עלות</Label>
                          <div className="flex items-center">
                            <CreditCard className="w-4 h-4 ml-2 text-gray-500" />
                            <Input
                              id="cost"
                              type="number"
                              placeholder="הזן עלות"
                              value={quickCompletionData.cost}
                              onChange={(e) => setQuickCompletionData(prev => ({
                                ...prev,
                                cost: e.target.value
                              }))}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="paid_by">שולם על ידי</Label>
                          <div className="flex items-center">
                            <User className="w-4 h-4 ml-2 text-gray-500" />
                            <Select
                              value={quickCompletionData.paid_by}
                              onValueChange={(value) => setQuickCompletionData(prev => ({
                                ...prev,
                                paid_by: value
                              }))}
                            >
                              <SelectTrigger id="paid_by" className="w-full">
                                <SelectValue placeholder="מי שילם?" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="tenant">דייר</SelectItem>
                                <SelectItem value="owner">בעל נכס</SelectItem>
                                <SelectItem value="building_committee">ועד בית</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="responsibility">אחריות לתשלום</Label>
                          <Select
                            value={quickCompletionData.responsibility}
                            onValueChange={(value) => setQuickCompletionData(prev => ({
                              ...prev,
                              responsibility: value
                            }))}
                          >
                            <SelectTrigger id="responsibility" className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner">בעל נכס</SelectItem>
                              <SelectItem value="tenant">דייר</SelectItem>
                              <SelectItem value="both">שניהם</SelectItem>
                              <SelectItem value="building_committee">ועד בית</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {quickCompletionData.paid_by === 'tenant' && quickCompletionData.responsibility === 'owner' && (
                            <Alert className="bg-amber-50 border-amber-200 text-amber-800 mt-2">
                              <AlertDescription className="text-xs">
                                הדייר שילם עבור תיקון באחריות בעל הנכס. 
                                הסכום יופחת מתשלום השכירות הבא.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="payment_method">אמצעי תשלום</Label>
                          <Select
                            value={quickCompletionData.payment_method}
                            onValueChange={(value) => setQuickCompletionData(prev => ({
                              ...prev,
                              payment_method: value
                            }))}
                          >
                            <SelectTrigger id="payment_method" className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">מזומן</SelectItem>
                              <SelectItem value="bank_transfer">העברה בנקאית</SelectItem>
                              <SelectItem value="check">צ'ק</SelectItem>
                              <SelectItem value="credit_card">כרטיס אשראי</SelectItem>
                              <SelectItem value="other">אחר</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="pt-4">
                          <Button 
                            onClick={handleQuickCompletionSubmit}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            סיים משימה
                          </Button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              )}

              {item.images && item.images.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="flex gap-2 overflow-x-auto py-2">
                    {item.images.map((img, idx) => (
                      <img 
                        key={idx}
                        src={img}
                        alt={`תמונה ${idx + 1}`}
                        className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                      />
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-4 text-xs text-gray-500">
                דווח: {item.reported_date ? format(new Date(item.reported_date), 'dd/MM/yyyy') : 'לא ידוע'}
                {item.reported_by && ` על ידי ${item.reported_by}`}
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
