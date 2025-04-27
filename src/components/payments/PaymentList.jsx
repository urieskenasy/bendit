
import React, { useState } from 'react';
import { Payment } from '@/api/entities';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge, } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, CheckCircle2, Circle, ArrowUpCircle, Info } from 'lucide-react';
import { format, isValid } from 'date-fns';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import getBaseParameters from '@/components/utils/getBaseParameters';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import UtilityBillsDialog from './UtilityBillsDialog';
import { Calculator } from 'lucide-react';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const statusColors = {
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  late: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

const statusLabels = {
  paid: 'שולם',
  pending: 'ממתין',
  late: 'באיחור',
  cancelled: 'בוטל'
};

const typeLabels = {
  rent: 'שכר דירה',
  bills: 'חשבונות',
  deposit: 'ביטחון',
  maintenance: 'תחזוקה',
  tax: 'מיסים',
  committee: 'ועד בית',
  insurance: 'ביטוח',
  other: 'אחר'
};

const paymentMethodLabels = {
  cash: 'מזומן',
  check: "צ'ק",
  bank_transfer: 'העברה בנקאית',
  credit_card: 'כרטיס אשראי',
  other: 'אחר'
};

export default function PaymentList({ payments, relatedEntities, onEdit, onDelete, onStatusChange }) {
  const { toast } = useToast();
  const [partialPaymentData, setPartialPaymentData] = useState({
    paymentId: null,
    amountPaid: 0,
    paymentDate: format(new Date(), 'yyyy-MM-dd')
  });
  
  const getRelatedEntityName = (relatedTo) => {
    if (!relatedTo) return 'לא ידוע';
    
    switch (relatedTo.type) {
      case 'tenant':
        const tenant = relatedEntities.tenants?.find(t => t.id === relatedTo.id);
        return tenant ? tenant.full_name : 'דייר לא ידוע';
      case 'supplier':
        const supplier = relatedEntities.suppliers?.find(s => s.id === relatedTo.id);
        return supplier ? supplier.name : 'ספק לא ידוע';
      case 'building_committee':
        const committee = relatedEntities.buildingCommittees?.find(c => c.id === relatedTo.id);
        return committee ? `ועד בית: ${committee.building_address}` : 'ועד בית לא ידוע';
      case 'owner':
        const owner = relatedEntities.owners?.find(o => o.id === relatedTo.id);
        return owner ? owner.full_name : 'בעל נכס לא ידוע';
      default:
        return 'לא ידוע';
    }
  };

  const getPropertyInfo = (propertyId) => {
    if (!propertyId) return null;
    const property = relatedEntities.properties?.find(p => p.id === propertyId);
    if (!property) return null;

    const building = relatedEntities.buildings?.find(b => b.id === property.building_id);
    return {
      number: property.property_number,
      building: building?.name,
      fullAddress: `${building?.name} - ${property.property_number}`
    };
  };

  const getRecipientName = (payment) => {
    // אם זה תשלום שמגיע מדייר, נחפש את בעל הנכס המקבל
    if (payment.related_to?.type === 'tenant' && payment.owner_id) {
      const owner = relatedEntities.owners?.find(o => o.id === payment.owner_id);
      return owner ? owner.full_name : 'בעל נכס לא ידוע';
    }
    // אם זה תשלום לספק או לוועד בית, הם מקבלי התשלום
    else if (payment.related_to?.type === 'supplier' || payment.related_to?.type === 'building_committee') {
      return getRelatedEntityName(payment.related_to);
    }
    return '-';
  };

  const handleStatusChange = async (paymentId, newStatus) => {
    if (newStatus === 'paid') {
      // Open partial payment dialog
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        setPartialPaymentData({
          paymentId,
          amountPaid: payment.amount,
          paymentDate: format(new Date(), 'yyyy-MM-dd')
        });
        return; // Dialog will handle the status change
      }
    }
    
    try {
      // For other statuses, proceed as before
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        const updates = { 
          status: newStatus
        };
        
        await Payment.update(paymentId, {
          ...payment,
          ...updates
        });
        
        if (onStatusChange) {
          onStatusChange(paymentId, newStatus);
        }
        
        toast({
          title: "סטטוס התשלום עודכן",
          description: "סטטוס התשלום עודכן בהצלחה",
        });
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בעדכון סטטוס התשלום",
        description: "אירעה שגיאה בעת עדכון סטטוס התשלום",
      });
    }
  };

  const handlePartialPaymentSubmit = async () => {
    try {
      const payment = payments.find(p => p.id === partialPaymentData.paymentId);
      if (!payment) return;
      
      const amountPaid = parseFloat(partialPaymentData.amountPaid) || 0;
      const totalDue = payment.amount;
      const balance = amountPaid - totalDue;
      
      // Calculate balance components
      const indexAmount = payment.index_details?.accumulated_index || 0;
      const billsAmount = payment.utility_bills?.total_amount || 0;
      
      // Find previous balance from prior payments
      let previousBalance = 0;
      const previousPayments = payments.filter(p => 
        p.related_to?.id === payment.related_to?.id && 
        p.related_to?.type === payment.related_to?.type &&
        p.property_id === payment.property_id &&
        p.id !== payment.id &&
        p.status === 'paid'
      );
      
      if (previousPayments.length > 0) {
        const latestPrevious = previousPayments.sort((a, b) => 
          new Date(b.date || b.due_date) - new Date(a.date || a.due_date)
        )[0];
        
        previousBalance = latestPrevious.balance || 0;
      }
      
      // Calculate total balance including all components
      const totalBalance = balance + previousBalance;
      
      const updatedPayment = {
        ...payment,
        status: 'paid',
        date: partialPaymentData.paymentDate,
        amount_paid: amountPaid,
        payment_date: partialPaymentData.paymentDate,
        balance: totalBalance,
        balance_details: {
          index_amount: indexAmount,
          bills_amount: billsAmount,
          previous_balance: previousBalance
        }
      };
      
      await Payment.update(payment.id, updatedPayment);
      
      if (onStatusChange) {
        onStatusChange(payment.id, 'paid');
      }
      
      toast({
        title: "התשלום עודכן",
        description: `התשלום סומן כשולם${amountPaid < totalDue ? ' חלקית' : ''}`,
      });
      
      // Reset form
      setPartialPaymentData({
        paymentId: null,
        amountPaid: 0,
        paymentDate: format(new Date(), 'yyyy-MM-dd')
      });
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בעדכון התשלום",
        description: "אירעה שגיאה בעת עדכון התשלום",
      });
    }
  };

  const getBuildingCommitteeStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'שולם';
      case 'unpaid': return 'לא שולם';
      case 'included': return 'כלול במחיר';
      default: return 'לא ידוע';
    }
  };

  const getBuildingCommitteeStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      case 'included': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleBuildingCommitteeStatusChange = async (paymentId, newStatus) => {
    try {
      console.log(`עדכון סטטוס ועד בית: ${paymentId} ל-${newStatus}`);
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        const updatedPayment = {
          ...payment,
          building_committee_status: newStatus
        };
        
        await Payment.update(paymentId, updatedPayment);
        
        // הודע לקומפוננט האב שהיה שינוי
        if (onStatusChange) {
          onStatusChange(paymentId, payment.status, newStatus);
        }
        
        toast({
          title: "סטטוס ועד הבית עודכן",
          description: `תשלום ועד הבית סומן כ${getBuildingCommitteeStatusLabel(newStatus)}`,
        });
      }
    } catch (error) {
      console.error('Error updating building committee status:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בעדכון סטטוס ועד הבית",
        description: "אירעה שגיאה בעת עדכון סטטוס ועד הבית",
      });
    }
  };

  // שינוי בפונקציה שמשדרגת את עיצוב התשלומ להדגשת תשלומים עתידיים (וירטואליים)
  const getRowStyle = (payment) => {
    if (payment.is_virtual) {
      return "opacity-70 bg-blue-50/40";
    }
    return "";
  };

    const calculateAccumulatedIndex = async (payment, contract) => {
        if (!contract || !payment || !payment.date) return 0;
        if (!contract.indexation || contract.indexation.type === 'none') return 0;
        
        try {
            const baseParams = await getBaseParameters();
            const currentIndex = baseParams.consumer_price_index.value;
            const baseIndex = contract.indexation.base_index || baseParams.consumer_price_index.value;
            
            if (payment.index_details?.is_index_paid) return 0;
            
            const indexDiff = (currentIndex - baseIndex) / baseIndex;
            const monthlyAmount = payment.amount;
            
            return Math.round(monthlyAmount * indexDiff * 100) / 100;
        } catch (error) {
            console.error('Error calculating index:', error);
            return 0;
        }
    };

    const handleIndexPaidChange = async (payment, checked) => {
        try {
            const updatedPayment = {
                ...payment,
                index_details: {
                    ...payment.index_details,
                    is_index_paid: checked,
                    index_paid_until: checked ? new Date().toISOString().split('T')[0] : null
                }
            };

            await Payment.update(payment.id, updatedPayment);
            
            toast({
                title: checked ? "המדד סומן כשולם" : "סימון תשלום המדד בוטל",
                description: checked ? 
                    "המדד המצטבר סומן כשולם והתאפס" : 
                    "המדד המצטבר יחושב מחדש",
            });

            // Notify parent component to refresh data
            if (onStatusChange) {
                onStatusChange(payment.id, payment.status);
            }
        } catch (error) {
            console.error('Error updating index paid status:', error);
            toast({
                variant: "destructive",
                title: "שגיאה בעדכון סטטוס המדד",
                description: "אירעה שגיאה בעת עדכון סטטוס תשלום המדד",
            });
        }
    };

    const handleUtilityBillsUpdate = async (updatedPayment) => {
        try {
            await Payment.update(updatedPayment.id, updatedPayment);
            // Notify parent component to refresh data
            if (onStatusChange) {
                onStatusChange(updatedPayment.id, updatedPayment.status);
            }
            
            toast({
                title: "החשבונות עודכנו",
                description: "פרטי החשבונות נשמרו בהצלחה"
            });
        } catch (error) {
            console.error('Error updating utility bills:', error);
            toast({
                variant: "destructive",
                title: "שגיאה בעדכון החשבונות",
                description: "אירעה שגיאה בעת עדכון החשבונות"
            });
        }
    };

  // Format balance with sign and color
  const formatBalance = (balance) => {
    if (!balance && balance !== 0) return '-';
    
    const isPositive = balance > 0;
    const absValue = Math.abs(balance);
    const formattedValue = absValue.toLocaleString();
    
    return (
      <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
        {isPositive ? '+' : '-'}₪{formattedValue}
      </span>
    );
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>סטטוס</TableHead>
              <TableHead>ועד בית</TableHead>
              <TableHead>משלם</TableHead>
              <TableHead>מקבל התשלום</TableHead>
              <TableHead>נכס</TableHead>
              <TableHead>תאריך</TableHead>
              <TableHead>סכום</TableHead>
              <TableHead>שולם בפועל</TableHead>
              <TableHead>יתרה</TableHead>
              <TableHead>סוג</TableHead>
              <TableHead>מס׳ תשלום</TableHead>
              <TableHead>אמצעי תשלום</TableHead>
              <TableHead>חשבונות</TableHead>
              <TableHead>מדד מצטבר</TableHead>
              <TableHead>שולם המדד</TableHead>
              <TableHead>פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => {
              const property = getPropertyInfo(payment.property_id);
              const contract = relatedEntities.contracts?.find(c => c.id === payment.contract_id);
              const accumulatedIndex = calculateAccumulatedIndex(payment, contract);
              
              // Determine if payment is rent (to show utilities)
              const isRentPayment = payment.type === 'rent';
              
              // Check if payment has maintenance deduction
              const hasMaintDeduction = payment.notes && payment.notes.includes('הופחת סך');
              
              return (
                <TableRow key={payment.id} className={`${getRowStyle(payment)} ${hasMaintDeduction ? 'bg-amber-50' : ''}`}>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className={`${statusColors[payment.status]} px-3 rounded-full text-xs font-medium capitalize`}>
                          {payment.is_virtual ? "עתידי" : statusLabels[payment.status]}
                          {payment.status === 'paid' && payment.payment_date && (
                            <span className="ml-1 text-xs opacity-70">
                              {format(new Date(payment.payment_date), 'dd/MM')}
                            </span>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleStatusChange(payment.id, 'paid')}>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                          <span>שולם</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(payment.id, 'pending')}>
                          <Circle className="mr-2 h-4 w-4 text-yellow-500" />
                          <span>ממתין</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(payment.id, 'late')}>
                          <ArrowUpCircle className="mr-2 h-4 w-4 text-red-500" />
                          <span>באיחור</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className={`${getBuildingCommitteeStatusColor(payment.building_committee_status)} px-3 rounded-full text-xs font-medium`}
                        >
                          {getBuildingCommitteeStatusLabel(payment.building_committee_status || 'unpaid')}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleBuildingCommitteeStatusChange(payment.id, 'paid')}>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                          <span>שולם</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBuildingCommitteeStatusChange(payment.id, 'unpaid')}>
                          <Circle className="mr-2 h-4 w-4 text-red-500" />
                          <span>לא שולם</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBuildingCommitteeStatusChange(payment.id, 'included')}>
                          <Circle className="mr-2 h-4 w-4 text-blue-500" />
                          <span>כלול במחיר</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>

                  <TableCell>{getRelatedEntityName(payment.related_to)}</TableCell>
                  <TableCell>{getRecipientName(payment)}</TableCell>
                  <TableCell>{property ? property.fullAddress : '-'}</TableCell>
                  <TableCell>
                    {payment.date ? format(new Date(payment.date), 'dd/MM/yyyy') : 
                     payment.due_date ? format(new Date(payment.due_date), 'dd/MM/yyyy') : '-'}
                  </TableCell>
                  
                  <TableCell>₪{payment.amount?.toLocaleString()}
                    {hasMaintDeduction && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 ml-1 inline-block text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-right">
                            <p className="font-semibold">תשלום מופחת</p>
                            <p className="text-sm">{payment.notes}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  
                  {/* New Paid Amount cell */}
                  <TableCell>
                    {payment.status === 'paid' && payment.amount_paid !== undefined ? (
                      <span className={payment.amount_paid < payment.amount ? 'text-amber-600 font-medium' : ''}>
                        ₪{payment.amount_paid?.toLocaleString()}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  
                  {/* Balance cell */}
                  <TableCell>
                    {formatBalance(payment.balance)}
                    {payment.balance && payment.balance_details && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 ml-1 inline-block text-blue-500" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-right p-3">
                            <p className="font-semibold mb-2">פירוט היתרה:</p>
                            <div className="space-y-1 text-sm">
                              <p>הפרש תשלום: {formatBalance(payment.amount_paid - payment.amount)}</p>
                              {payment.balance_details.index_amount > 0 && (
                                <p>הצמדה למדד: {formatBalance(-payment.balance_details.index_amount)}</p>
                              )}
                              {payment.balance_details.bills_amount > 0 && (
                                <p>חשבונות: {formatBalance(-payment.balance_details.bills_amount)}</p>
                              )}
                              {payment.balance_details.previous_balance !== 0 && (
                                <p>יתרה קודמת: {formatBalance(payment.balance_details.previous_balance)}</p>
                              )}
                              <div className="border-t pt-1 mt-1">
                                <p className="font-medium">סה"כ: {formatBalance(payment.balance)}</p>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  
                  <TableCell>{typeLabels[payment.type] || payment.type}</TableCell>
                  <TableCell>
                    {payment.payment_number && payment.total_payments ? 
                     `${payment.payment_number}/${payment.total_payments}` : '-'}
                  </TableCell>
                  <TableCell>
                    {paymentMethodLabels[payment.payment_method] || payment.payment_method || '-'}
                  </TableCell>
                  
                  <TableCell>
                    {isRentPayment && (
                        <UtilityBillsDialog 
                            payment={payment}
                            contract={contract}
                            onSave={handleUtilityBillsUpdate}
                        />
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {contract?.indexation?.type !== 'none' ? (
                      <div className="flex items-center gap-2">
                        <span className={payment.index_details?.is_index_paid ? 
                            "text-gray-400 line-through" : 
                            accumulatedIndex > 0 ? "text-blue-600 font-medium" : ""
                        }>
                            ₪{accumulatedIndex.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">ללא הצמדה</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {contract?.indexation?.type !== 'none' && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={payment.index_details?.is_index_paid || false}
                          onCheckedChange={(checked) => handleIndexPaidChange(payment, checked)}
                          disabled={payment.is_virtual}
                        />
                        {payment.index_details?.index_paid_until && (
                          <span className="text-xs text-gray-500">
                            עד {format(new Date(payment.index_details.index_paid_until), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onEdit(payment)}
                        title={payment.is_virtual ? "צור תשלום" : "ערוך תשלום"}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      
                      {!payment.is_virtual ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                              <AlertDialogDescription>
                                פעולה זו לא ניתנת לביטול. תשלום זה יימחק לצמיתות.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>ביטול</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDelete(payment.id)}>
                                מחיקה
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(payment.id)}
                          title="הסר תשלום עתידי"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Partial Payment Dialog */}
      <Dialog 
        open={partialPaymentData.paymentId !== null}
        onOpenChange={(open) => {
          if (!open) setPartialPaymentData({ paymentId: null, amountPaid: 0, paymentDate: format(new Date(), 'yyyy-MM-dd') });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>עדכון תשלום</DialogTitle>
            <DialogDescription>
              הזן את הסכום ששולם בפועל ואת תאריך התשלום
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount-paid" className="text-right">
                סכום ששולם
              </Label>
              <Input
                id="amount-paid"
                type="number"
                value={partialPaymentData.amountPaid}
                onChange={(e) => setPartialPaymentData({
                  ...partialPaymentData, 
                  amountPaid: e.target.value
                })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-date" className="text-right">
                תאריך תשלום
              </Label>
              <Input
                id="payment-date"
                type="date"
                value={partialPaymentData.paymentDate}
                onChange={(e) => setPartialPaymentData({
                  ...partialPaymentData, 
                  paymentDate: e.target.value
                })}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter className="sm:justify-start">
            <Button variant="secondary" onClick={() => setPartialPaymentData({ 
              paymentId: null, amountPaid: 0, paymentDate: format(new Date(), 'yyyy-MM-dd') 
            })}>
              ביטול
            </Button>
            <Button type="button" onClick={handlePartialPaymentSubmit}>
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
