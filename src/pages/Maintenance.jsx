
import React, { useState, useEffect } from 'react';
import { Maintenance, Property, Building, Supplier, Tenant, Owner, Contract, Payment } from '@/api/entities';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wrench, 
  Plus, 
  Search, 
  Filter, 
  Clock,
  AlertTriangle, 
  CheckCircle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MaintenanceList from '../components/maintenance/MaintenanceList';
import MaintenanceForm from '../components/maintenance/MaintenanceForm';
import { useToast } from "@/components/ui/use-toast"
import syncMaintenance from '../components/utils/maintenanceSync';
import { format } from 'date-fns';

export default function MaintenancePage() {
  const [maintenance, setMaintenance] = useState([]);
  const [properties, setProperties] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [owners, setOwners] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast()

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [
        maintenanceData,
        propertiesData,
        buildingsData,
        suppliersData,
        tenantsData,
        ownersData
      ] = await Promise.all([
        Maintenance.list(),
        Property.list(),
        Building.list(),
        Supplier.list(),
        Tenant.list(),
        Owner.list()
      ]);

      setMaintenance(maintenanceData);
      setProperties(propertiesData);
      setBuildings(buildingsData);
      setSuppliers(suppliersData);
      setTenants(tenantsData);
      setOwners(ownersData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (maintenanceData) => {
    try {
      let savedMaintenance;
      
      if (selectedMaintenance) {
        savedMaintenance = await Maintenance.update(selectedMaintenance.id, maintenanceData);
      } else {
        savedMaintenance = await Maintenance.create(maintenanceData);
      }
      
      // סנכרון המידע למערכת - ישויות קשורות, תזכורות וכו'
      try {
        await syncMaintenance(savedMaintenance);
      } catch (syncError) {
        console.error("Error syncing maintenance:", syncError);
        toast({
          variant: "warning",
          title: "אזהרה: סנכרון חלקי",
          description: "הקריאה נשמרה אך ייתכן שחלק מהנתונים הקשורים לא עודכנו"
        });
      }
      
      setShowForm(false);
      setSelectedMaintenance(null);
      loadData();
      
      toast({
        title: selectedMaintenance ? "המשימה עודכנה בהצלחה" : "המשימה נוצרה בהצלחה",
        description: "פרטי המשימה נשמרו במערכת",
      });
    } catch (error) {
      console.error('Error saving maintenance task:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בשמירת המשימה",
        description: error.message || "אירעה שגיאה בעת שמירת המשימה",
      });
    }
  };

  const handleEdit = (maintenance) => {
    setSelectedMaintenance(maintenance);
    setShowForm(true);
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  const filteredMaintenance = maintenance.filter(item => {
    // Filter by search term
    const matchesSearch = 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by property
    const matchesProperty = selectedProperty === 'all' || 
      (item.related_to?.type === 'property' && item.related_to.id === selectedProperty);

    // Filter by building
    const matchesBuilding = selectedBuilding === 'all' || 
      (item.related_to?.type === 'building' && item.related_to.id === selectedBuilding) ||
      (item.related_to?.type === 'property' && 
        properties.find(p => p.id === item.related_to.id)?.building_id === selectedBuilding);

    // Filter by status
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;

    // Filter by priority
    const matchesPriority = selectedPriority === 'all' || item.priority === selectedPriority;

    // Filter by tab
    const matchesTab = 
      (activeTab === 'active' && item.status !== 'completed' && item.status !== 'cancelled') ||
      (activeTab === 'completed' && (item.status === 'completed' || item.status === 'cancelled'));

    return matchesSearch && matchesProperty && matchesBuilding && 
           matchesStatus && matchesPriority && matchesTab;
  });

  const handleDelete = async (maintenanceId) => {
    try {
      await Maintenance.delete(maintenanceId);
      loadData();
      toast({
        title: "המשימה נמחקה בהצלחה",
        description: "המשימה הוסרה מהמערכת",
      });
    } catch (error) {
      console.error('Error deleting maintenance task:', error);
      toast({
        variant: "destructive",
        title: "שגיאה במחיקת המשימה",
        description: "אירעה שגיאה בעת מחיקת המשימה",
      });
    }
  };

  const handleStatusChange = async (item, newStatus) => {
    try {
      const updatedTask = {
        ...item,
        status: newStatus
      };
      
      // אם מסמנים כהושלם, עדכן גם את תאריך הסיום
      if (newStatus === 'completed' && !item.completed_date) {
        updatedTask.completed_date = format(new Date(), 'yyyy-MM-dd');
      }
      
      // אם משנים מ"הושלם" למשהו אחר, נקה את תאריך הסיום
      if (item.status === 'completed' && newStatus !== 'completed') {
        updatedTask.completed_date = null;
      }
      
      const savedTask = await Maintenance.update(item.id, updatedTask);
      
      // סנכרון המידע למערכת
      await syncMaintenance(savedTask);
      
      loadData();
      
      toast({
        title: `סטטוס המשימה עודכן ל${getStatusText(newStatus)}`,
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בעדכון סטטוס",
        description: "אירעה שגיאה בעת עדכון סטטוס המשימה",
      });
    }
  };

  // פונקציית עזר להצגת סטטוס בעברית
  const getStatusText = (status) => {
    const statuses = {
      'open': 'פתוח',
      'in_progress': 'בטיפול',
      'completed': 'הושלם',
      'cancelled': 'בוטל'
    };
    return statuses[status] || status;
  };

  // Updated function to handle completion with payment info and rent deduction
  const handleCompletionUpdate = async (updatedTask) => {
    try {
      // Save the updated task
      const savedTask = await Maintenance.update(updatedTask.id, updatedTask);
      
      // Create payment records if cost was entered
      if (updatedTask.payment_info?.cost > 0 && updatedTask.payment_info?.paid_by) {
        // Get property and related info
        const property = properties.find(p => 
          (updatedTask.related_to.type === 'property' && p.id === updatedTask.related_to.id) ||
          (updatedTask.related_to.type === 'building' && p.building_id === updatedTask.related_to.id)
        );

        // Only proceed if we found a property
        if (property) {
          // Find active contract and tenant
          const contracts = await Contract.list();
          const activeContract = contracts.find(c => 
            c.property_id === property.id && 
            c.status === 'active'
          );
          
          let tenantId = null;
          let monthlyRent = 0;
          if (activeContract?.tenants?.length > 0) {
            tenantId = activeContract.tenants[0].tenant_id;
            monthlyRent = activeContract.monthly_rent || 0;
          }
          
          // Create payment record for the maintenance
          const paymentData = {
            related_to: {
              type: updatedTask.payment_info.paid_by,
              id: updatedTask.payment_info.paid_by === 'tenant' ? tenantId : property.owner_id
            },
            property_id: property.id,
            amount: updatedTask.payment_info.cost,
            type: 'maintenance',
            date: updatedTask.completed_date || new Date().toISOString().split('T')[0],
            status: 'paid',
            payment_method: updatedTask.payment_info.payment_method,
            notes: `תשלום עבור תחזוקה: ${updatedTask.title}`
          };

          await Payment.create(paymentData);

          // If tenant paid but owner is responsible, create compensation
          const responsibility = updatedTask.payment_info.responsibility || 'owner';
          if (updatedTask.payment_info.paid_by === 'tenant' && 
              responsibility === 'owner' && tenantId) {
            
            // Get upcoming rent payments
            const payments = await Payment.list();
            const futureRentPayments = payments.filter(p => 
              p.related_to?.type === 'tenant' && 
              p.related_to?.id === tenantId &&
              p.type === 'rent' &&
              p.status === 'pending' &&
              p.amount > 0 &&
              new Date(p.due_date) > new Date()
            ).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
            
            // Find the next upcoming rent payment
            const nextRentPayment = futureRentPayments[0];
            
            if (nextRentPayment) {
              // Update the next payment with reduced amount
              const originalAmount = nextRentPayment.amount;
              const newAmount = originalAmount - updatedTask.payment_info.cost;
              
              await Payment.update(nextRentPayment.id, {
                ...nextRentPayment,
                amount: newAmount,
                notes: `${nextRentPayment.notes || ''} \nהופחת סך ${updatedTask.payment_info.cost} ש"ח עבור תשלום תחזוקה: ${updatedTask.title}`
              });
              
              toast({
                title: "התשלום הופחת מהשכירות הבאה",
                description: `תשלום התחזוקה בסך ${updatedTask.payment_info.cost} ש"ח הופחת מהשכירות הבאה (${format(new Date(nextRentPayment.due_date), 'dd/MM/yyyy')})`
              });
            } else {
              // If no future payment exists, create a credit record
              const nextMonth = new Date();
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              
              const compensationPayment = {
                related_to: {
                  type: 'tenant',
                  id: tenantId
                },
                property_id: property.id,
                contract_id: activeContract.id,
                amount: monthlyRent - updatedTask.payment_info.cost,
                type: 'rent',
                due_date: nextMonth.toISOString().split('T')[0],
                status: 'pending',
                notes: `תשלום שכירות עם הפחתה של ${updatedTask.payment_info.cost} ש"ח עבור תשלום תחזוקה: ${updatedTask.title}`
              };

              await Payment.create(compensationPayment);
              
              toast({
                title: "נוצר תשלום שכירות מופחת",
                description: `תשלום שכירות חדש נוצר עם הפחתה של ${updatedTask.payment_info.cost} ש"ח עבור תחזוקה`
              });
            }
          } else {
            toast({
              title: "התשלום נרשם",
              description: "תשלום התחזוקה נרשם במערכת"
            });
          }
        }
      }
      
      // Sync maintenance data
      try {
        await syncMaintenance(savedTask);
      } catch (syncError) {
        console.error("Error syncing maintenance:", syncError);
        toast({
          variant: "warning",
          title: "אזהרה: סנכרון חלקי",
          description: "הקריאה נשמרה אך ייתכן שחלק מהנתונים הקשורים לא עודכנו"
        });
      }
      
      // Reload data
      loadData();
      
      toast({
        title: "המשימה הושלמה בהצלחה",
        description: "פרטי המשימה נשמרו במערכת"
      });
    } catch (error) {
      console.error('Error completing task with payment:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בסיום המשימה",
        description: error.message || "אירעה שגיאה בעת סיום המשימה"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="w-6 h-6" />
          תחזוקה ומשימות
        </h1>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 ml-2" />
          בקשה חדשה
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="active" className="flex-1">פעילות</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">הושלמו</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4 md:col-span-4">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="חיפוש..."
                className="pr-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
              <SelectTrigger>
                <SelectValue placeholder="בחר בניין" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הבניינים</SelectItem>
                {buildings.map(building => (
                  <SelectItem key={building.id} value={building.id}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={selectedProperty} 
              onValueChange={setSelectedProperty}
              disabled={selectedBuilding !== 'all' && selectedBuilding !== ''}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר נכס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הנכסים</SelectItem>
                {properties
                  .filter(property => 
                    selectedBuilding === 'all' || 
                    property.building_id === selectedBuilding
                  )
                  .map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.property_number}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="open">פתוח</SelectItem>
                <SelectItem value="in_progress">בטיפול</SelectItem>
                <SelectItem value="completed">הושלם</SelectItem>
                <SelectItem value="cancelled">בוטל</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger>
                <SelectValue placeholder="דחיפות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל רמות הדחיפות</SelectItem>
                <SelectItem value="urgent">דחוף</SelectItem>
                <SelectItem value="high">גבוהה</SelectItem>
                <SelectItem value="medium">בינונית</SelectItem>
                <SelectItem value="low">נמוכה</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>

      {showForm && (
        <MaintenanceForm
          maintenance={selectedMaintenance}
          properties={properties}
          buildings={buildings}
          suppliers={suppliers}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setSelectedMaintenance(null);
          }}
        />
      )}

      <MaintenanceList
        maintenance={filteredMaintenance}
        properties={properties}
        buildings={buildings}
        suppliers={suppliers}
        tenants={tenants}
        owners={owners}
        onEdit={handleEdit}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        onCompletionUpdate={handleCompletionUpdate}
        isLoading={isLoading}
      />
    </div>
  );
}
