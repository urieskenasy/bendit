
import React, { useState, useEffect } from 'react';
import { Payment, Tenant, Property, Building, Contract } from '@/api/entities';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  FileText, Plus, Search, Calendar, CreditCard, CheckCircle, 
  XCircle, AlertCircle, ChevronDown, Building2, User, Users, Home, Clock, RefreshCw
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, 
  DropdownMenuItem, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PaymentList from '../components/payments/PaymentList';
import PaymentForm from '../components/payments/PaymentForm';
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format, parseISO, addMonths } from "date-fns";
import { checkAllPaymentsStatus } from '../components/utils/paymentSync';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [relatedEntities, setRelatedEntities] = useState({
    tenants: [],
    properties: [],
    buildings: [],
    suppliers: [],
    buildingCommittees: [],
    owners: [],
    contracts: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState('all');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showFuturePayments, setShowFuturePayments] = useState(true);
  
  const { toast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // כאשר שדה showFuturePayments משתנה, עדכן את רשימת התשלומים בהתאם
    if (showFuturePayments) {
      generateFuturePayments();
    }
  }, [showFuturePayments, selectedTenant]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // טען קודם את הנתונים הבסיסיים
      const [paymentsData, tenantsData, propertiesData, buildingsData, contractsData] = await Promise.all([
        Payment.list('-date'),
        Tenant.list(),
        Property.list(),
        Building.list(),
        Contract.list()
      ]);

      // שמור את הנתונים הבסיסיים
      setPayments(paymentsData);
      setRelatedEntities(prev => ({
        ...prev,
        tenants: tenantsData || [],
        properties: propertiesData || [],
        buildings: buildingsData || [],
        contracts: contractsData || []
      }));

      // טען את שאר הנתונים בנפרד
      loadAdditionalData();

    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בטעינת נתונים",
        description: "אירעה שגיאה בטעינת הנתונים הבסיסיים. אנא נסה שוב.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdditionalData = async () => {
    // טען את שאר הנתונים בנפרד כדי להימנע מחריגת Rate Limit
    try {
      // טעינה בנפרד של כל סוג ישות למניעת Rate Limit
      const owners = await import('@/api/entities').then(module => module.Owner.list());
      setRelatedEntities(prev => ({ ...prev, owners: owners || [] }));
      
      // המתנה קצרה בין הבקשות
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const suppliers = await import('@/api/entities').then(module => module.Supplier.list());
      setRelatedEntities(prev => ({ ...prev, suppliers: suppliers || [] }));
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const committees = await import('@/api/entities').then(module => module.BuildingCommittee.list());
      setRelatedEntities(prev => ({ ...prev, buildingCommittees: committees || [] }));

    } catch (error) {
      console.error('Error loading additional data:', error);
      // אל תציג הודעת שגיאה למשתמש כי אלו נתונים משניים
    }
  };

  // פונקציה לייצור תשלומים עתידיים בהתבסס על חוזים קיימים
  const generateFuturePayments = async () => {
    if (!showFuturePayments) return;
    
    try {
      const existingPayments = [...payments];
      const virtualPayments = [];
      const today = new Date();
      
      // מצא חוזים פעילים
      const activeContracts = relatedEntities.contracts.filter(c => c.status === 'active');
      
      for (const contract of activeContracts) {
        // אם נבחר דייר ספציפי, בדוק שהחוזה שייך לדייר זה
        if (selectedTenant !== 'all' && contract.tenant_id !== selectedTenant) {
          continue;
        }
        
        const startDate = parseISO(contract.start_date);
        const endDate = parseISO(contract.end_date);
        
        if (endDate < today) continue; // חוזה שהסתיים
        
        // בדוק אילו תשלומים קיימים כבר עבור חוזה זה
        const contractPayments = existingPayments.filter(p => 
          p.related_to?.type === 'tenant' && 
          p.related_to?.id === contract.tenant_id &&
          p.property_id === contract.property_id
        );
        
        // מצא את התאריך האחרון שכבר יש תשלום עבורו
        let lastPaymentDate = new Date(startDate);
        if (contractPayments.length > 0) {
          const dueDates = contractPayments
            .map(p => p.due_date ? new Date(p.due_date) : null)
            .filter(Boolean);
            
          if (dueDates.length > 0) {
            lastPaymentDate = new Date(Math.max(...dueDates.map(d => d.getTime())));
          }
        }
        
        // חשב כמה תשלומים עתידיים צריך להוסיף
        const nextMonth = new Date(lastPaymentDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        if (nextMonth > endDate) continue; // אין צורך בתשלומים עתידיים נוספים
        
        // יצירת תשלומים עתידיים עד לסוף החוזה
        let currentDate = new Date(nextMonth);
        
        while (currentDate <= endDate) {
          // בדוק שהתאריך הוא בעתיד ושאין עדיין תשלום עבורו
          const existingPayment = contractPayments.find(p => {
            if (!p.due_date) return false;
            const pDate = new Date(p.due_date);
            return pDate.getMonth() === currentDate.getMonth() && 
                   pDate.getFullYear() === currentDate.getFullYear();
          });
          
          if (!existingPayment) {
            // הוסף תשלום וירטואלי
            const dueDate = new Date(currentDate);
            if (contract.payment_day) {
              dueDate.setDate(contract.payment_day);
            }
            
            const virtualPayment = {
              id: `virtual_${contract.id}_${dueDate.toISOString()}`,
              related_to: {
                type: 'tenant',
                id: contract.tenant_id
              },
              property_id: contract.property_id,
              owner_id: contract.owner_id,
              date: null,
              due_date: format(dueDate, 'yyyy-MM-dd'),
              amount: contract.monthly_rent,
              type: 'rent',
              payment_method: 'bank_transfer',
              status: 'pending',
              currency: 'ILS',
              building_committee_status: contract.includes_building_committee ? 'included' : 'unpaid',
              contract_id: contract.id,
              is_virtual: true,
              notes: 'תשלום עתידי (טרם נוצר)'
            };
            
            virtualPayments.push(virtualPayment);
          }
          
          // עבור לחודש הבא
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }
      
      // הוסף את התשלומים הוירטואליים לרשימת התשלומים
      if (virtualPayments.length > 0) {
        console.log(`נוצרו ${virtualPayments.length} תשלומים עתידיים וירטואליים.`);
        setPayments([...existingPayments, ...virtualPayments]);
      }
      
    } catch (error) {
      console.error('שגיאה בייצור תשלומים עתידיים:', error);
    }
  };

  const checkRecurringPayments = async () => {
    try {
      const today = new Date();
      const paymentsData = await Payment.list();
      
      // מצא תשלומים חוזרים
      const recurringPayments = paymentsData.filter(p => p.is_recurring);
      
      for (const payment of recurringPayments) {
        const lastPaymentDate = new Date(payment.date);
        let shouldCreateNewPayment = false;
        
        if (payment.recurrence_frequency === 'monthly') {
          // בדוק אם עבר חודש מהתשלום האחרון
          shouldCreateNewPayment = 
            today.getMonth() > lastPaymentDate.getMonth() ||
            today.getFullYear() > lastPaymentDate.getFullYear();
        } else if (payment.recurrence_frequency === 'yearly') {
          // בדוק אם עברה שנה מהתשלום האחרון
          shouldCreateNewPayment = today.getFullYear() > lastPaymentDate.getFullYear();
        }

        if (shouldCreateNewPayment && today.getDate() >= payment.recurrence_day) {
          // צור תשלום חדש
          const newPaymentDate = new Date(today.getFullYear(), today.getMonth(), payment.recurrence_day);
          
          const newPayment = {
            ...payment,
            date: newPaymentDate.toISOString().split('T')[0],
            due_date: newPaymentDate.toISOString().split('T')[0],
            status: 'paid' // ברירת מחדל - התשלום התקבל
          };
          
          delete newPayment.id; // הסר את ה-ID כדי ליצור רשומה חדשה
          await Payment.create(newPayment);
        }
      }
      
      // טען מחדש את הנתונים לאחר הוספת תשלומים חוזרים
      loadData();
    } catch (error) {
      console.error('Error checking recurring payments:', error);
    }
  };

  const loadData = async () => {
    try {
      // Get all payments
      const paymentsData = await Payment.list();
      
      // Sort by due date (closest first)
      const sortedPayments = paymentsData.sort((a, b) => {
        const dateA = new Date(a.due_date || a.date || '9999-12-31');
        const dateB = new Date(b.due_date || b.date || '9999-12-31');
        return dateA - dateB;
      });
      
      // Calculate balances for all payments if not already set
      const updatedPayments = await Promise.all(sortedPayments.map(async (payment) => {
        // Skip virtual payments
        if (payment.is_virtual) return payment;
        
        // If payment is marked as paid but doesn't have balance info, calculate it
        if (payment.status === 'paid' && payment.amount_paid !== undefined && payment.balance === undefined) {
          const contract = relatedEntities.contracts?.find(c => c.id === payment.contract_id);
          
          // Calculate components
          const amountPaid = payment.amount_paid || 0;
          const totalDue = payment.amount || 0;
          const balance = amountPaid - totalDue;
          
          const indexAmount = payment.index_details?.accumulated_index || 0;
          const billsAmount = payment.utility_bills?.total_amount || 0;
          
          // Find previous balance from prior payments
          let previousBalance = 0;
          const previousPayments = sortedPayments.filter(p => 
            p.related_to?.id === payment.related_to?.id && 
            p.related_to?.type === payment.related_to?.type &&
            p.property_id === payment.property_id &&
            p.id !== payment.id &&
            p.status === 'paid' &&
            new Date(p.due_date || p.date) < new Date(payment.due_date || payment.date)
          );
          
          if (previousPayments.length > 0) {
            const latestPrevious = previousPayments.sort((a, b) => 
              new Date(b.due_date || b.date) - new Date(a.due_date || a.date)
            )[0];
            
            previousBalance = latestPrevious.balance || 0;
          }
          
          // Calculate total balance
          const totalBalance = balance + previousBalance;
          
          // Update the payment
          const updatedPayment = {
            ...payment,
            balance: totalBalance,
            balance_details: {
              index_amount: indexAmount,
              bills_amount: billsAmount,
              previous_balance: previousBalance
            }
          };
          
          // Save the updated payment to the database
          await Payment.update(payment.id, updatedPayment);
          
          return updatedPayment;
        }
        
        return payment;
      }));
      
      setPayments(updatedPayments);
      
      // If showing future payments, create them
      if (showFuturePayments) {
        setTimeout(() => generateFuturePayments(), 300);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בטעינת נתונים",
        description: "אירעה שגיאה בטעינת הנתונים. אנא נסה שוב.",
      });
    }
  };

  const handleSubmit = async (paymentData) => {
    try {
      if (selectedPayment) {
        await Payment.update(selectedPayment.id, paymentData);
        toast({
          title: "התשלום עודכן בהצלחה",
          description: "פרטי התשלום עודכנו במערכת",
        });
      } else {
        await Payment.create(paymentData);
        toast({
          title: "התשלום נוצר בהצלחה",
          description: "התשלום החדש נוסף למערכת",
        });
      }
      setShowForm(false);
      setSelectedPayment(null);
      loadData();
    } catch (error) {
      console.error('Error saving payment:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בשמירת התשלום",
        description: "אירעה שגיאה בעת שמירת התשלום",
      });
    }
  };

  const handleEdit = (payment) => {
    // אם זה תשלום וירטואלי, יצור אותו קודם
    if (payment.is_virtual) {
      const realPayment = { ...payment };
      delete realPayment.is_virtual;
      delete realPayment.id;
      
      handleSubmit(realPayment);
      return;
    }
    
    setSelectedPayment(payment);
    setShowForm(true);
  };

  const handleDelete = async (paymentId) => {
    // אם זה תשלום וירטואלי, פשוט הסר אותו מהמערך
    if (paymentId.startsWith('virtual_')) {
      setPayments(prev => prev.filter(p => p.id !== paymentId));
      return;
    }
    
    try {
      await Payment.delete(paymentId);
      loadData();
      toast({
        title: "התשלום נמחק בהצלחה",
        description: "התשלום הוסר מהמערכת",
      });
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        variant: "destructive",
        title: "שגיאה במחיקת התשלום",
        description: "אירעה שגיאה בעת מחיקת התשלום",
      });
    }
  };

  const handleStatusChange = async (paymentId, newStatus, newBuildingCommitteeStatus) => {
    // אם זה תשלום וירטואלי, יצור אותו קודם
    if (paymentId.startsWith('virtual_')) {
      const virtualPayment = payments.find(p => p.id === paymentId);
      if (virtualPayment) {
        const realPayment = { ...virtualPayment };
        delete realPayment.is_virtual;
        delete realPayment.id;
        realPayment.status = newStatus;
        if (newBuildingCommitteeStatus) {
          realPayment.building_committee_status = newBuildingCommitteeStatus;
        }
        
        await handleSubmit(realPayment);
      }
      return;
    }
    
    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) return;
      
      const updatedPayment = {
        ...payment,
        status: newStatus || payment.status
      };
      
      if (newStatus === 'paid' && !payment.date) {
        updatedPayment.date = new Date().toISOString().split('T')[0];
      }
      
      if (newBuildingCommitteeStatus) {
        updatedPayment.building_committee_status = newBuildingCommitteeStatus;
      }
      
      await Payment.update(paymentId, updatedPayment);
      loadData();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בעדכון סטטוס התשלום",
        description: "אירעה שגיאה בעת עדכון סטטוס התשלום",
      });
    }
  };

  const getPropertiesForBuilding = (buildingId) => {
    return relatedEntities.properties.filter(property => property.building_id === buildingId);
  };

  const shouldShowFuturePayment = (payment) => {
    // אם showFuturePayments כבוי, הראה רק תשלומים שכבר שולמו או שתאריך התשלום בעבר
    if (!showFuturePayments && !payment.is_virtual) {
      if (payment.status === 'paid') return true;
      
      const dueDate = new Date(payment.due_date);
      const today = new Date();
      return dueDate <= today;
    }
    
    return true;
  };

  const filteredPayments = payments
    .filter(payment => {
      // התאמה של תשלומים עתידיים
      if (!shouldShowFuturePayment(payment)) return false;
      
      // Filter by status tab
      if (activeTab !== 'all' && payment.status !== activeTab) {
        // תשלומים וירטואליים תמיד בסטטוס 'pending'
        if (!(payment.is_virtual && activeTab === 'pending')) {
          return false;
        }
      }
      
      // Filter by date
      if (dateFilter !== 'all' && !payment.is_virtual) {
        const today = new Date();
        const paymentDate = new Date(payment.date || payment.due_date);
        
        if (dateFilter === 'thisMonth') {
          if (paymentDate.getMonth() !== today.getMonth() || 
              paymentDate.getFullYear() !== today.getFullYear()) {
            return false;
          }
        } else if (dateFilter === 'thisYear') {
          if (paymentDate.getFullYear() !== today.getFullYear()) {
            return false;
          }
        } else if (dateFilter === 'lastMonth') {
          const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
          const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
          if (paymentDate.getMonth() !== lastMonth || 
              paymentDate.getFullYear() !== lastMonthYear) {
            return false;
          }
        }
      }

      // Filter by owner
      if (selectedOwner !== 'all' && payment.owner_id !== selectedOwner) {
        return false;
      }

      // Filter by tenant
      if (selectedTenant !== 'all' && 
          !(payment.related_to?.type === 'tenant' && payment.related_to?.id === selectedTenant)) {
        return false;
      }

      // Filter by building
      if (selectedBuilding !== 'all') {
        const property = relatedEntities.properties.find(p => p.id === payment.property_id);
        if (!property || property.building_id !== selectedBuilding) {
          return false;
        }
      }

      // Filter by property
      if (selectedProperty !== 'all' && payment.property_id !== selectedProperty) {
        return false;
      }
      
      // Search term filtering
      if (!searchTerm) return true;
      
      // Search in related entities
      if (payment.related_to) {
        if (payment.related_to.type === 'tenant') {
          const tenant = relatedEntities.tenants.find(t => t.id === payment.related_to.id);
          if (tenant && tenant.full_name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return true;
          }
        } else if (payment.related_to.type === 'supplier') {
          const supplier = relatedEntities.suppliers.find(s => s.id === payment.related_to.id);
          if (supplier && supplier.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return true;
          }
        }
      }
      
      // Search in property
      if (payment.property_id) {
        const property = relatedEntities.properties.find(p => p.id === payment.property_id);
        if (property && property.address && property.address.street && 
            property.address.street.toLowerCase().includes(searchTerm.toLowerCase())) {
          return true;
        }
      }
      
      // Search in amount
      if (payment.amount && payment.amount.toString().includes(searchTerm)) {
        return true;
      }
      
      return false;
    });

  // הוסף פונקציה לעדכון כל התשלומים במערכת
  const handleRefreshAllPaymentsStatus = async () => {
    setIsLoading(true);
    try {
        await checkAllPaymentsStatus();
        // Refresh the data in the page
        loadData();
        toast({
            title: "סטטוס תשלומים עודכן",
            description: "סטטוס כל התשלומים במערכת עודכן בהצלחה"
        });
    } catch (error) {
        console.error("Error refreshing payment statuses:", error);
        toast({
            variant: "destructive",
            title: "שגיאה בעדכון סטטוס תשלומים",
            description: "אירעה שגיאה בעת עדכון סטטוס התשלומים"
        });
    } finally {
        setIsLoading(false);
    }
};
  
  // בתוך הרנדר, הוסף כפתור לרענון סטטוס
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          ניהול תשלומים
        </h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefreshAllPaymentsStatus} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            רענן סטטוס תשלומים
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 ml-2" />
            תשלום חדש
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between flex-wrap">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">הכל</TabsTrigger>
            <TabsTrigger value="paid" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              שולמו
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              ממתינים
            </TabsTrigger>
            <TabsTrigger value="late" className="flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              באיחור
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2 bg-white rounded-md border px-3 py-1">
            <Label htmlFor="show-future-payments" className="ml-2 whitespace-nowrap flex items-center gap-1">
              <Clock className="w-4 h-4" />
              הצג תשלומים עתידיים
            </Label>
            <Switch
              id="show-future-payments"
              checked={showFuturePayments}
              onCheckedChange={(checked) => {
                setShowFuturePayments(checked);
                if (checked) {
                  setTimeout(() => generateFuturePayments(), 300);
                } else {
                  setPayments(prev => prev.filter(p => !p.is_virtual));
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {dateFilter === 'all' && 'כל התאריכים'}
              {dateFilter === 'thisMonth' && 'החודש הנוכחי'}
              {dateFilter === 'lastMonth' && 'חודש קודם'}
              {dateFilter === 'thisYear' && 'השנה הנוכחית'}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setDateFilter('all')}>
              כל התאריכים
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateFilter('thisMonth')}>
              החודש הנוכחי
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateFilter('lastMonth')}>
              חודש קודם
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateFilter('thisYear')}>
              השנה הנוכחית
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Card className="p-2">
          <Select value={selectedOwner} onValueChange={setSelectedOwner}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <SelectValue placeholder="בעל נכס" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל בעלי הנכסים</SelectItem>
              {relatedEntities.owners.map(owner => (
                <SelectItem key={owner.id} value={owner.id}>
                  {owner.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        <Card className="p-2">
          <Select 
            value={selectedTenant} 
            onValueChange={(value) => {
              setSelectedTenant(value);
              // כשמשנים דייר, נרצה לעדכן את התשלומים העתידיים
              setTimeout(() => {
                if (showFuturePayments) {
                  // הסר תשלומים וירטואליים קיימים לפני יצירת חדשים
                  setPayments(prev => prev.filter(p => !p.is_virtual));
                  setTimeout(() => generateFuturePayments(), 300);
                }
              }, 300);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <SelectValue placeholder="דייר" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הדיירים</SelectItem>
              {relatedEntities.tenants.map(tenant => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        <Card className="p-2">
          <Select value={selectedBuilding} onValueChange={(value) => {
            setSelectedBuilding(value);
            setSelectedProperty('all'); // איפוס בחירת הנכס בעת שינוי בניין
          }}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <SelectValue placeholder="בניין" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הבניינים</SelectItem>
              {relatedEntities.buildings.map(building => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        <Card className="p-2">
          <Select 
            value={selectedProperty} 
            onValueChange={setSelectedProperty}
            disabled={selectedBuilding === 'all'}
          >
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                <SelectValue placeholder="נכס" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הנכסים</SelectItem>
              {selectedBuilding !== 'all' && getPropertiesForBuilding(selectedBuilding).map(property => (
                <SelectItem key={property.id} value={property.id}>
                  {property.address?.street} {property.address?.number} - {property.property_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        <Card className="p-2 md:w-64">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="חיפוש..."
              className="pr-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Card>
      </div>

      {showForm && (
        <PaymentForm
          payment={selectedPayment}
          relatedEntities={relatedEntities}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setSelectedPayment(null);
          }}
        />
      )}

      <PaymentList
        payments={filteredPayments}
        relatedEntities={relatedEntities}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
