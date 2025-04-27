
import React, { useState, useEffect } from 'react';
import { Tenant, Property, Building } from '@/api/entities';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Plus, Search, UserCheck, UserX } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TenantList from '../components/tenants/TenantList';
import TenantForm from '../components/tenants/TenantForm';
import { toast } from "@/components/ui/use-toast"

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [buildings, setBuildings] = useState([]); // הוספת סטייט לבניינים
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [tenantsData, propertiesData, buildingsData] = await Promise.all([
      Tenant.list(),
      Property.list(),
      Building.list()
    ]);
    setTenants(tenantsData);
    setProperties(propertiesData);
    setBuildings(buildingsData);
  };

  const handleSubmit = async (tenantData) => {
    try {
      let result;
      
      // וודא שהנתונים הנדרשים קיימים
      const cleanedData = {
        ...tenantData,
        full_name: tenantData.full_name?.trim(),
        id_number: tenantData.id_number?.trim(),
        tenant_type: tenantData.tenant_type || 'private',
        id_type: tenantData.id_type || 'id_number',
        status: tenantData.status || 'active',
        payment_method: tenantData.payment_method || 'bank_transfer',
        // וודא שהמחיר נשמר כמספר ולא כמחרוזת
        monthly_rent: Number(parseFloat(tenantData.monthly_rent)) || 0,
        share_percentage: parseFloat(tenantData.share_percentage) || 100,
        utility_readings: {
          entry: {
            electricity: tenantData.utility_readings?.entry?.electricity ? parseFloat(tenantData.utility_readings.entry.electricity) : null,
            water: tenantData.utility_readings?.entry?.water ? parseFloat(tenantData.utility_readings.entry.water) : null,
            gas: tenantData.utility_readings?.entry?.gas ? parseFloat(tenantData.utility_readings.entry.gas) : null,
            date: tenantData.utility_readings?.entry?.date || null
          },
          exit: {
            electricity: tenantData.utility_readings?.exit?.electricity ? parseFloat(tenantData.utility_readings.exit.electricity) : null,
            water: tenantData.utility_readings?.exit?.water ? parseFloat(tenantData.utility_readings.exit.water) : null,
            gas: tenantData.utility_readings?.exit?.gas ? parseFloat(tenantData.utility_readings.exit.gas) : null,
            date: tenantData.utility_readings?.exit?.date || null
          }
        },
        bills_transferred: Boolean(tenantData.bills_transferred),
        bills_paid: Boolean(tenantData.bills_paid),
        contact_person: tenantData.tenant_type === 'commercial' ? {
          name: tenantData.contact_person?.name || '',
          phone: tenantData.contact_person?.phone || '',
          email: tenantData.contact_person?.email || '',
          role: tenantData.contact_person?.role || ''
        } : null,
        notes: tenantData.notes || ''
      };
      
      console.log("Saving tenant with cleaned data:", cleanedData);
      
      if (selectedTenant) {
        result = await Tenant.update(selectedTenant.id, cleanedData);
      } else {
        result = await Tenant.create(cleanedData);
      }
      
      setShowForm(false);
      setSelectedTenant(null);
      loadData();
      
      toast({
        title: selectedTenant ? "הדייר עודכן בהצלחה" : "הדייר נוסף בהצלחה",
        description: selectedTenant ? "פרטי הדייר עודכנו במערכת" : "דייר חדש נוסף למערכת",
      });
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast({
        title: "שגיאה בשמירת הדייר",
        description: "אירעה שגיאה בעת שמירת נתוני הדייר: " + (error.response?.data?.detail || error.message),
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedTenant(null);
  };

  const handleEdit = (tenant) => {
    setSelectedTenant(tenant);
    setShowForm(true);
  };

  const handleDelete = async (tenantId) => {
    try {
      await Tenant.delete(tenantId);
      loadData();
      toast({
        title: "הדייר נמחק בהצלחה",
        description: "הדייר הוסר מהמערכת",
      });
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast({
        variant: "destructive",
        title: "שגיאה במחיקת הדייר",
        description: "אירעה שגיאה בעת מחיקת הדייר",
      });
    }
  };

  const filteredTenants = tenants
    .filter(tenant => tenant.status === activeTab)
    .filter(tenant => 
      tenant.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.id_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6" />
          דיירים
        </h1>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 ml-2" />
          דייר חדש
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              דיירים פעילים
            </TabsTrigger>
            <TabsTrigger value="past" className="flex items-center gap-2">
              <UserX className="w-4 h-4" />
              דיירים היסטוריים
            </TabsTrigger>
          </TabsList>
        </Tabs>

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
        <TenantForm
          tenant={selectedTenant}
          properties={properties}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}

      <TenantList
        tenants={filteredTenants}
        properties={properties}
        buildings={buildings}
        onEdit={handleEdit}
        onDelete={handleDelete}
        activeTab={activeTab}
      />
    </div>
  );
}
