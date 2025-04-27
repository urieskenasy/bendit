
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { CalendarIcon, Droplets, Zap, Flame, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tenant, Property } from '@/api/entities';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Contract } from '@/api/entities';
import { Badge } from "@/components/ui/badge"
import syncTenant from '../utils/tenantSync';  // שינוי הייבוא ל-default import

export default function TenantForm({ tenant, properties, onSubmit, onCancel }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [existingTenants, setExistingTenants] = useState([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareError, setShareError] = useState('');
  const [showSyncContractDialog, setShowSyncContractDialog] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [activeContract, setActiveContract] = useState(null);
  
  // אתחול הטופס עם נתוני הדייר אם מדובר בעריכה, או ערכי ברירת מחדל אם מדובר בדייר חדש
  const [currentTenant, setCurrentTenant] = useState(tenant || {
    full_name: '',
    tenant_type: 'private',
    id_type: 'id_number',
    id_number: '',
    phone: '',
    email: '',
    property_id: '',
    status: 'active',
    contract_start: '',
    contract_end: '',
    monthly_rent: 0,
    price_per_sqm: null,
    total_price: null,
    share_percentage: 100,
    payment_method: 'bank_transfer',
    utility_readings: {
      entry: {
        electricity: null,
        water: null,
        gas: null,
        date: ''
      },
      exit: {
        electricity: null,
        water: null,
        gas: null,
        date: ''
      }
    },
    bills_transferred: false,
    bills_paid: false,
    contact_person: {
      name: '',
      phone: '',
      email: '',
      role: ''
    },
    notes: ''
  });

    // טעינת החוזים בעת טעינת הטופס
    useEffect(() => {
      if (tenant?.id) {
        loadTenantContracts();
      }
    }, [tenant]);
  
    const loadTenantContracts = async () => {
      try {
        const allContracts = await Contract.list();
        // מצא את כל החוזים של הדייר
        const tenantContracts = allContracts.filter(contract => 
          contract.tenants?.some(t => t.tenant_id === tenant.id)
        );
        
        setContracts(tenantContracts);
  
        // מצא את החוזה הפעיל האחרון
        const active = tenantContracts.find(contract => 
          contract.status === 'active' && 
          new Date(contract.end_date) >= new Date()
        );
        
        if (active) {
          setActiveContract(active);
          // עדכן את הטופס עם נתוני החוזה
          updateFormWithContractData(active);
        }
      } catch (error) {
        console.error('Error loading contracts:', error);
      }
    };
  
    const updateFormWithContractData = (contract) => {
      const tenantInContract = contract.tenants.find(t => t.tenant_id === tenant.id);
      if (!tenantInContract) return;
  
      setCurrentTenant(prev => ({
        ...prev,
        property_id: contract.property_id,
        contract_id: contract.id,
        contract_start: contract.start_date,
        contract_end: contract.end_date,
        monthly_rent: contract.monthly_rent,
        share_percentage: tenantInContract.share_percentage || 100,
        payment_method: contract.payment_terms?.payment_method || prev.payment_method,
        status: 'active'
      }));
    };

  useEffect(() => {
    if (currentTenant.property_id) {
      loadExistingTenants();
    }
  }, [currentTenant.property_id]);

  const loadExistingTenants = async () => {
    try {
      const allTenants = await Tenant.list();
      const propertyTenants = allTenants.filter(t => 
        t.property_id === currentTenant.property_id && 
        t.status === 'active' &&
        (!tenant || t.id !== tenant.id) // אל תכלול את הדייר הנוכחי אם מדובר בעריכה
      );
      setExistingTenants(propertyTenants);

      // חשב את סך האחוזים הקיימים
      const existingShare = propertyTenants.reduce((sum, t) => sum + (t.share_percentage || 0), 0);
      const remainingShare = 100 - existingShare;
      
      // עדכן את אחוז החלוקה של הדייר החדש
      if (!tenant) { // רק אם זה דייר חדש
        setCurrentTenant(prev => ({
          ...prev,
          share_percentage: remainingShare
        }));
      }
    } catch (error) {
      console.error('Error loading existing tenants:', error);
    }
  };

  const handlePropertyChange = async (propertyId) => {
    if (propertyId === currentTenant.property_id) return;

    // בדוק אם יש דיירים קיימים בנכס
    const allTenants = await Tenant.list();
    const propertyTenants = allTenants.filter(t => 
      t.property_id === propertyId && 
      t.status === 'active'
    );

    setCurrentTenant(prev => ({
      ...prev,
      property_id: propertyId,
      share_percentage: propertyTenants.length > 0 ? 0 : 100
    }));

    if (propertyTenants.length > 0) {
      setShowShareDialog(true);
    }
  };
  
  const handleChange = (field, value) => {
    setCurrentTenant(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleContactPersonChange = (field, value) => {
    setCurrentTenant(prev => ({
      ...prev,
      contact_person: {
        ...prev.contact_person,
        [field]: value
      }
    }));
  };

  const handleUtilityReadingChange = (type, field, value) => {
    // המר ערכים ריקים ל-null במקום מחרוזות ריקות
    const parsedValue = field !== 'date' 
      ? (value === '' ? null : parseFloat(value) || null) 
      : value;
    
    setCurrentTenant(prev => ({
      ...prev,
      utility_readings: {
        ...prev.utility_readings,
        [type]: {
          ...prev.utility_readings[type],
          [field]: parsedValue
        }
      }
    }));
  };
  
  const validateSharePercentage = (newShare) => {
    const existingShare = existingTenants.reduce((sum, t) => sum + (t.share_percentage || 0), 0);
    const totalSharePercentage = existingShare + newShare;
    
    if (totalSharePercentage > 100) {
      setShareError('סך כל האחוזים חייב להיות 100% או פחות');
      return false;
    }
    
    setShareError('');
    return true;
  };

  const handleSharePercentageChange = async (newShare) => {
    const shareNum = parseFloat(newShare) || 0;
    
    if (!validateSharePercentage(shareNum)) {
      return;
    }

    setCurrentTenant(prev => ({
      ...prev,
      share_percentage: shareNum
    }));
  };

  const handleSyncContract = async () => {
    // מצא את השותף עם החוזה הקיים
    const coTenantWithContract = existingTenants.find(t => t.contract_start && t.contract_end);
    
    if (!coTenantWithContract) {
      toast({
        variant: "destructive",
        title: "לא ניתן לסנכרן",
        description: "לא נמצא חוזה פעיל אצל השותפים לנכס"
      });
      return;
    }

    setSyncInProgress(true);
    try {
      // עדכן את הדייר הנוכחי עם פרטי החוזה של השותף
      const updatedTenant = {
        ...currentTenant,
        contract_start: coTenantWithContract.contract_start,
        contract_end: coTenantWithContract.contract_end,
        monthly_rent: parseFloat((coTenantWithContract.monthly_rent / (coTenantWithContract.share_percentage / 100) * (currentTenant.share_percentage / 100)).toFixed(2)),
        payment_method: coTenantWithContract.payment_method,
        bills_transferred: coTenantWithContract.bills_transferred,
        bills_paid: coTenantWithContract.bills_paid
      };

      setCurrentTenant(updatedTenant);

      toast({
        title: "החוזה סונכרן בהצלחה",
        description: "פרטי החוזה הועתקו מהשותף הקיים",
      });

      setShowSyncContractDialog(false);
      
      // עדכן את הטופס עם הערכים החדשים
      onSubmit(updatedTenant);
    } catch (error) {
      console.error('Error syncing contract:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בסנכרון החוזה",
        description: "אירעה שגיאה בעת סנכרון החוזה: " + (error.message || ""),
      });
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (existingTenants.length > 0) {
        const totalShare = existingTenants.reduce((sum, t) => sum + (t.share_percentage || 0), 0) + 
          (currentTenant.share_percentage || 0);
        
        if (totalShare > 100) {
          setShareError('סך כל האחוזים חייב להיות 100% או פחות');
          setIsLoading(false);
          return;
        }
      }

      // הכן את הנתונים לשליחה
      const cleanedData = {
        ...currentTenant,
        full_name: currentTenant.full_name?.trim(),
        id_number: currentTenant.id_number?.trim(),
        tenant_type: currentTenant.tenant_type || 'private',
        id_type: currentTenant.id_type || 'id_number',
        status: currentTenant.status || 'active',
        payment_method: currentTenant.payment_method || 'bank_transfer',
        monthly_rent: parseFloat(currentTenant.monthly_rent) || 0,
        share_percentage: parseFloat(currentTenant.share_percentage) || 100,
        utility_readings: {
          entry: {
            electricity: currentTenant.utility_readings?.entry?.electricity ? parseFloat(currentTenant.utility_readings.entry.electricity) : null,
            water: currentTenant.utility_readings?.entry?.water ? parseFloat(currentTenant.utility_readings.entry.water) : null,
            gas: currentTenant.utility_readings?.entry?.gas ? parseFloat(currentTenant.utility_readings.entry.gas) : null,
            date: currentTenant.utility_readings?.entry?.date || null
          },
          exit: {
            electricity: currentTenant.utility_readings?.exit?.electricity ? parseFloat(currentTenant.utility_readings.exit.electricity) : null,
            water: currentTenant.utility_readings?.exit?.water ? parseFloat(currentTenant.utility_readings.exit.water) : null,
            gas: currentTenant.utility_readings?.exit?.gas ? parseFloat(currentTenant.utility_readings.exit.gas) : null,
            date: currentTenant.utility_readings?.exit?.date || null
          }
        },
        bills_transferred: Boolean(currentTenant.bills_transferred),
        bills_paid: Boolean(currentTenant.bills_paid),
        contact_person: currentTenant.tenant_type === 'commercial' ? {
          name: currentTenant.contact_person?.name || '',
          phone: currentTenant.contact_person?.phone || '',
          email: currentTenant.contact_person?.email || '',
          role: currentTenant.contact_person?.role || ''
        } : null,
        notes: currentTenant.notes || ''
      };

      let savedTenant;
      
      if (tenant) {
        savedTenant = await Tenant.update(tenant.id, cleanedData);
      } else {
        savedTenant = await Tenant.create(cleanedData);
      }
      
      // סנכרון הדייר לאחר שמירה
      await syncTenant(savedTenant);
      
      toast({
        title: tenant ? "הדייר עודכן בהצלחה" : "הדייר נוצר בהצלחה",
        description: "כל הנתונים והקשרים עודכנו במערכת"
      });
      
      onSubmit(savedTenant);
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בשמירת הדייר",
        description: error.message || "אירעה שגיאה בעת שמירת פרטי הדייר"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getPropertyDetails = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? `${property.property_number} - ${property.location?.floor ? `קומה ${property.location.floor}` : ''}` : '';
  };
  
  return (
    <>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">פרטי דייר</TabsTrigger>
                <TabsTrigger value="contract">פרטי שכירות</TabsTrigger>
                <TabsTrigger value="utilities">מונים וחשבונות</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-6">
                {/* ... קוד קיים ... */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">פרטי דייר</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tenant_type">סוג דייר</Label>
                      <RadioGroup 
                        id="tenant_type" 
                        value={currentTenant.tenant_type} 
                        onValueChange={(value) => handleChange('tenant_type', value)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value="private" id="private" />
                          <Label htmlFor="private">דייר פרטי</Label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value="commercial" id="commercial" />
                          <Label htmlFor="commercial">דייר מסחרי</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="id_type">סוג מזהה</Label>
                      <RadioGroup 
                        id="id_type" 
                        value={currentTenant.id_type} 
                        onValueChange={(value) => handleChange('id_type', value)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value="id_number" id="id_number" />
                          <Label htmlFor="id_number">תעודת זהות</Label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value="company_number" id="company_number" />
                          <Label htmlFor="company_number">ח.פ.</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">
                        {currentTenant.tenant_type === 'commercial' ? 'שם חברה' : 'שם מלא'}
                      </Label>
                      <Input
                        id="full_name"
                        value={currentTenant.full_name}
                        onChange={(e) => handleChange('full_name', e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="id_number">
                        {currentTenant.id_type === 'company_number' ? 'מספר חברה (ח.פ.)' : 'תעודת זהות'}
                      </Label>
                      <Input
                        id="id_number"
                        value={currentTenant.id_number}
                        onChange={(e) => handleChange('id_number', e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">טלפון</Label>
                      <Input
                        id="phone"
                        value={currentTenant.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">דואר אלקטרוני</Label>
                      <Input
                        id="email"
                        type="email"
                        value={currentTenant.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* איש קשר לדייר מסחרי */}
                  {currentTenant.tenant_type === 'commercial' && (
                    <div className="border p-4 rounded-lg">
                      <h4 className="font-medium mb-3">פרטי איש קשר</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contact_name">שם איש קשר</Label>
                          <Input
                            id="contact_name"
                            value={currentTenant.contact_person?.name || ''}
                            onChange={(e) => handleContactPersonChange('name', e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="contact_role">תפקיד</Label>
                          <Input
                            id="contact_role"
                            value={currentTenant.contact_person?.role || ''}
                            onChange={(e) => handleContactPersonChange('role', e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="contact_phone">טלפון איש קשר</Label>
                          <Input
                            id="contact_phone"
                            value={currentTenant.contact_person?.phone || ''}
                            onChange={(e) => handleContactPersonChange('phone', e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="contact_email">דוא״ל איש קשר</Label>
                          <Input
                            id="contact_email"
                            type="email"
                            value={currentTenant.contact_person?.email || ''}
                            onChange={(e) => handleContactPersonChange('email', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="property_id">נכס</Label>
                    <Select
                      value={currentTenant.property_id}
                      onValueChange={handlePropertyChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר נכס" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {getPropertyDetails(property.id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {existingTenants.length > 0 && (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          שים לב: בנכס זה יש {existingTenants.length} דיירים נוספים
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {currentTenant.property_id && (
                    <div className="space-y-2">
                      <Label htmlFor="share_percentage">אחוז חלקו בנכס (%)</Label>
                      <div className="space-y-2">
                        <Input
                          id="share_percentage"
                          type="number"
                          min="0"
                          max="100"
                          value={currentTenant.share_percentage || 0}
                          onChange={(e) => handleSharePercentageChange(e.target.value)}
                        />
                        {existingTenants.length > 0 && (
                          <div className="text-sm text-gray-500 mt-1 p-2 border rounded">
                            <h4 className="font-semibold mb-2">דיירים נוספים בנכס:</h4>
                            {existingTenants.map((t, index) => (
                              <div key={t.id} className="flex justify-between items-center py-1">
                                <span>{t.full_name}</span>
                                <span>{t.share_percentage}%</span>
                              </div>
                            ))}
                            <div className="border-t mt-1 pt-1">
                              <div className="flex justify-between font-medium">
                                <span>סה"כ</span>
                                <span>
                                  {existingTenants.reduce((sum, t) => sum + (t.share_percentage || 0), 0) + 
                                    (currentTenant.share_percentage || 0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        {shareError && (
                          <p className="text-sm text-red-500">{shareError}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="contract" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">פרטי חוזה נוכחי</h3>
                  
                  {activeContract ? (
                    <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">חוזה פעיל</span>
                        <Badge>מס׳ {activeContract.contract_number}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>תאריך התחלה</Label>
                          <Input
                            type="date"
                            value={currentTenant.contract_start}
                            disabled
                          />
                        </div>
                        
                        <div>
                          <Label>תאריך סיום</Label>
                          <Input
                            type="date"
                            value={currentTenant.contract_end}
                            disabled
                          />
                        </div>
                        
                        <div>
                          <Label>שכר דירה חודשי</Label>
                          <Input
                            type="number"
                            value={currentTenant.monthly_rent}
                            disabled
                          />
                        </div>
                        
                        <div>
                          <Label>אחוז בנכס</Label>
                          <Input
                            type="number"
                            value={currentTenant.share_percentage}
                            disabled
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label>נכס</Label>
                        <Select
                          value={currentTenant.property_id}
                          disabled
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {getPropertyDetails(currentTenant.property_id)}
                            </SelectValue>
                          </SelectTrigger>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4 text-gray-500">
                      אין חוזה פעיל עבור דייר זה
                    </div>
                  )}

                  {contracts.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-2">היסטוריית חוזים</h4>
                      <div className="space-y-2">
                        {contracts.map(contract => (
                          <div
                            key={contract.id}
                            className="p-3 border rounded-lg flex justify-between items-center"
                          >
                            <div>
                              <div className="font-medium">חוזה {contract.contract_number}</div>
                              <div className="text-sm text-gray-500">
                                {format(new Date(contract.start_date), 'dd/MM/yyyy')} - {format(new Date(contract.end_date), 'dd/MM/yyyy')}
                              </div>
                            </div>
                            <Badge 
                              className={
                                contract.status === 'active' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {contract.status === 'active' ? 'פעיל' : 'הסתיים'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="utilities" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">קריאות מונים ביום הכניסה</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="entry_electricity" className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        קריאת חשמל בכניסה
                      </Label>
                      <Input
                        id="entry_electricity"
                        type="number"
                        value={currentTenant.utility_readings?.entry?.electricity ?? ''}
                        onChange={(e) => handleUtilityReadingChange('entry', 'electricity', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="entry_water" className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        קריאת מים בכניסה
                      </Label>
                      <Input
                        id="entry_water"
                        type="number"
                        value={currentTenant.utility_readings?.entry?.water ?? ''}
                        onChange={(e) => handleUtilityReadingChange('entry', 'water', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="entry_gas" className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        קריאת גז בכניסה
                      </Label>
                      <Input
                        id="entry_gas"
                        type="number"
                        value={currentTenant.utility_readings?.entry?.gas ?? ''}
                        onChange={(e) => handleUtilityReadingChange('entry', 'gas', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>תאריך קריאת מונים בכניסה</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-right font-normal"
                          >
                            {currentTenant.utility_readings?.entry?.date ? (
                              format(new Date(currentTenant.utility_readings.entry.date), 'dd/MM/yyyy')
                            ) : (
                              <span>בחר תאריך</span>
                            )}
                            <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={currentTenant.utility_readings?.entry?.date ? new Date(currentTenant.utility_readings.entry.date) : undefined}
                            onSelect={(date) => handleUtilityReadingChange('entry', 'date', date ? format(date, 'yyyy-MM-dd') : '')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="col-span-2">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id="bills_transferred"
                          checked={currentTenant.bills_transferred || false}
                          onCheckedChange={(checked) => handleChange('bills_transferred', checked)}
                        />
                        <Label htmlFor="bills_transferred">חשבונות הועברו לשוכר</Label>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-medium">קריאות מונים ביום היציאה</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="exit_electricity" className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        קריאת חשמל ביציאה
                      </Label>
                      <Input
                        id="exit_electricity"
                        type="number"
                        value={currentTenant.utility_readings?.exit?.electricity ?? ''}
                        onChange={(e) => handleUtilityReadingChange('exit', 'electricity', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="exit_water" className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        קריאת מים ביציאה
                      </Label>
                      <Input
                        id="exit_water"
                        type="number"
                        value={currentTenant.utility_readings?.exit?.water ?? ''}
                        onChange={(e) => handleUtilityReadingChange('exit', 'water', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="exit_gas" className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        קריאת גז ביציאה
                      </Label>
                      <Input
                        id="exit_gas"
                        type="number"
                        value={currentTenant.utility_readings?.exit?.gas ?? ''}
                        onChange={(e) => handleUtilityReadingChange('exit', 'gas', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>תאריך קריאת מונים ביציאה</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-right font-normal"
                          >
                            {currentTenant.utility_readings?.exit?.date ? (
                              format(new Date(currentTenant.utility_readings.exit.date), 'dd/MM/yyyy')
                            ) : (
                              <span>בחר תאריך</span>
                            )}
                            <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={currentTenant.utility_readings?.exit?.date ? new Date(currentTenant.utility_readings.exit.date) : undefined}
                            onSelect={(date) => handleUtilityReadingChange('exit', 'date', date ? format(date, 'yyyy-MM-dd') : '')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="col-span-2">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id="bills_paid"
                          checked={currentTenant.bills_paid || false}
                          onCheckedChange={(checked) => handleChange('bills_paid', checked)}
                        />
                        <Label htmlFor="bills_paid">כל החשבונות שולמו במלואם</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="space-y-2 pt-6 border-t mt-6">
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={currentTenant.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
              >
                ביטול
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'שומר...' : tenant ? 'עדכן דייר' : 'הוסף דייר'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      
      <Dialog open={showSyncContractDialog} onOpenChange={setShowSyncContractDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>סנכרון חוזה משותף</DialogTitle>
            <DialogDescription>
              {existingTenants.filter(t => t.contract_start && t.contract_end).map(t => (
                <div key={t.id} className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium">{t.full_name}</div>
                  <div className="text-sm text-gray-500">
                    תאריך התחלה: {format(new Date(t.contract_start), 'dd/MM/yyyy')}
                  </div>
                  <div className="text-sm text-gray-500">
                    תאריך סיום: {format(new Date(t.contract_end), 'dd/MM/yyyy')}
                  </div>
                  <div className="text-sm text-gray-500">
                    שכר דירה נוכחי: ₪{t.monthly_rent?.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    חלק יחסי: {t.share_percentage}%
                  </div>
                </div>
              ))}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="font-medium">לאחר הסנכרון - {currentTenant.full_name}</div>
                <div className="text-sm text-gray-500">
                  חלק יחסי: {currentTenant.share_percentage}%
                </div>
                <div className="text-sm text-gray-500">
                  שכר דירה מחושב: ₪{(existingTenants[0]?.monthly_rent / (existingTenants[0]?.share_percentage / 100) * (currentTenant.share_percentage / 100))?.toLocaleString()}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowSyncContractDialog(false)}
              disabled={syncInProgress}
            >
              ביטול
            </Button>
            <Button
              onClick={handleSyncContract}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={syncInProgress}
            >
              {syncInProgress ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  מסנכרן...
                </>
              ) : (
                "סנכרן חוזה"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הגדרת חלוקת אחוזים</DialogTitle>
            <DialogDescription>
              בנכס זה כבר קיימים דיירים. אנא הגדר את אחוז החלוקה של הדייר החדש.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {existingTenants.map(t => (
                <div key={t.id} className="flex justify-between items-center">
                  <span>{t.full_name}</span>
                  <span>{t.share_percentage}%</span>
                </div>
              ))}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-share">אחוז חלוקה לדייר החדש</Label>
              <Input
                id="new-share"
                type="number"
                min="0"
                max="100"
                value={currentTenant.share_percentage || 0}
                onChange={(e) => handleSharePercentageChange(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowShareDialog(false)}
            >
              אישור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
