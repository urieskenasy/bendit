
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, addMonths } from 'date-fns';
import { Property, Tenant, Building, Contract, Document, Guarantee, Reminder } from '@/api/entities';
import { useToast } from '@/components/ui/use-toast';
import ContractTenantsSection from './ContractTenantsSection';
import ContractPaymentsSection from './ContractPaymentsSection';
import ContractDocumentsSection from './ContractDocumentsSection';
import ContractGuaranteesSection from './ContractGuaranteesSection';
import ContractRemindersSection from './ContractRemindersSection';
import { PlusCircle, X } from 'lucide-react';
import { generatePaymentsFromContract } from '../utils/paymentSync';
import { createContractDocument } from '../utils/documentSync';
import { UploadFile } from '@/api/integrations';
import { Checkbox } from '@/components/ui/checkbox';

export default function ContractForm({ contract, properties, tenants, onSubmit, onCancel }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [propertiesList, setPropertiesList] = useState([]);
  const [tenantsList, setTenantsList] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedTenants, setSelectedTenants] = useState([]);
  const [additionalPayments, setAdditionalPayments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [guarantees, setGuarantees] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showExtensionOptions, setShowExtensionOptions] = useState(false);
  const [extensionPeriod, setExtensionPeriod] = useState(12); // מספר חודשים להארכה
  const [includeIndexation, setIncludeIndexation] = useState(true);
  const [indexationPercentage, setIndexationPercentage] = useState(5); // אחוז הצמדה
  const [extensionOptions, setExtensionOptions] = useState(contract?.extension_options || []);
  const [contractFile, setContractFile] = useState(null);
  const [isUploadingContract, setIsUploadingContract] = useState(false);

  // וודא שיש ערכי ברירת מחדל למניעת שגיאות גישה
  const defaultFormData = {
    property_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
    signature_date: format(new Date(), 'yyyy-MM-dd'),
    tenants: [],
    monthly_rent: '',
    payment_terms: {
      payment_day: 1,
      payment_method: 'bank_transfer',
      months_in_advance: 1,
      grace_period: {
        days: 0,
        start_date: '',
        end_date: '',
        is_rent_free: true
      }
    },
    deposit: {
      amount: '',
      payment_method: 'bank_transfer'
    },
    indexation: {
      type: 'none',
      base_index: 0,
      frequency: 'yearly',
      custom_rate: 0
    },
    includes_utilities: {
      electricity: false,
      water: false,
      gas: false,
      property_tax: false,
      property_tax_amount: 0,
      building_committee: false,
      internet: false
    },
    meter_readings: {
      electricity: '',
      water: '',
      gas: '',
      reading_date: new Date().toISOString().split('T')[0]
    },
    additional_payments: [],
    automatic_payments: {
      enabled: false,
      generation_day: 1,
      reminder_days: 7
    },
    extension_options: [],
    status: 'draft',
    contract_number: `CNT-${Date.now()}`
  };

  // עדכון מצב ראשוני של הטופס עם טיפול בערכים חסרים
  const prepareInitialFormData = (contractData) => {
    if (!contractData) return defaultFormData;
    
    return {
      ...defaultFormData,
      ...contractData,
      // וודא שכל האובייקטים המקוננים קיימים
      payment_terms: {
        ...defaultFormData.payment_terms,
        ...(contractData.payment_terms || {}),
        grace_period: {
          ...defaultFormData.payment_terms.grace_period,
          ...(contractData.payment_terms?.grace_period || {})
        }
      },
      deposit: {
        ...defaultFormData.deposit,
        ...(contractData.deposit || {})
      },
      indexation: {
        ...defaultFormData.indexation,
        ...(contractData.indexation || {})
      },
      automatic_payments: {
        ...defaultFormData.automatic_payments,
        ...(contractData.automatic_payments || {})
      },
      includes_utilities: {
        ...defaultFormData.includes_utilities,
        ...(contractData.includes_utilities || {})
      },
      meter_readings: {
        ...defaultFormData.meter_readings,
        ...(contractData.meter_readings || {})
      }
    };
  };

  const [formData, setFormData] = useState(prepareInitialFormData(contract));

  // כאשר מקבלים חוזה קיים, עדכן את מצב הטופס
  useEffect(() => {
    if (contract) {
      console.log("Got contract to edit:", contract);
      setFormData(prepareInitialFormData(contract));
      
      if (contract.tenants) {
        setSelectedTenants(contract.tenants);
      }
      
      if (contract.additional_payments) {
        setAdditionalPayments(contract.additional_payments);
      }
      
      if (contract.extension_options) {
        setExtensionOptions(contract.extension_options);
      }
    }
  }, [contract]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // כאשר חוזה מגיע מערכת החוזים הקיימת, העתק את נתוני החוזה
    if (contract) {
      if (contract.tenants) {
        setSelectedTenants(contract.tenants);
      }
      if (contract.additional_payments) {
        setAdditionalPayments(contract.additional_payments);
      }

      // טען מסמכים, ערבויות ותזכורות
      const fetchRelatedData = async () => {
        try {
          // טען מסמכים קשורים
          const allDocuments = await Document.list();
          const contractDocuments = allDocuments.filter(
            doc => doc.related_to?.type === 'contract' && doc.related_to?.id === contract.id
          );
          setDocuments(contractDocuments);

          // טען ערבויות קשורות
          const allGuarantees = await Guarantee.list();
          const contractGuarantees = allGuarantees.filter(
            g => g.contract_id === contract.id
          );
          setGuarantees(contractGuarantees);

          // טען תזכורות קשורות
          const allReminders = await Reminder.list();
          const contractReminders = allReminders.filter(
            r => r.related_to?.type === 'contract' && r.related_to?.id === contract.id
          );
          setReminders(contractReminders);
        } catch (error) {
          console.error('Error loading related data:', error);
        }
      };

      fetchRelatedData();
    }
  }, [contract]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [propertiesData, tenantsData, buildingsData] = await Promise.all([
        Property.list(),
        Tenant.list(),
        Building.list()
      ]);

      setPropertiesList(propertiesData);
      setTenantsList(tenantsData);
      setBuildings(buildingsData);

      // אם מדובר בעריכת חוזה קיים, טען את הנכס והדיירים
      if (contract && contract.property_id) {
        const property = propertiesData.find(p => p.id === contract.property_id);
        if (property) {
          setSelectedProperty(property);
          setSelectedBuilding(property.building_id);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בטעינת נתונים",
        description: "אירעה שגיאה בטעינת הנתונים הדרושים"
      });
    }
    setIsLoading(false);
  };

  const handleBuildingChange = (buildingId) => {
    setSelectedBuilding(buildingId);
    setFormData(prev => ({
      ...prev,
      property_id: ''
    }));
    setSelectedProperty(null);
  };

  const handlePropertyChange = (propertyId) => {
    const property = propertiesList.find(p => p.id === propertyId);
    setSelectedProperty(property);
    
    setFormData(prev => ({
      ...prev,
      property_id: propertyId,
      monthly_rent: property?.rental_details?.monthly_rent || ''
    }));
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const addExtensionOption = () => {
    setExtensionOptions(prev => [...prev, {
      years: 1,
      notice_period_months: 3,
      indexation_percentage: 5
    }]);
  };
  
  const removeExtensionOption = (index) => {
    setExtensionOptions(prev => prev.filter((_, i) => i !== index));
  };
  
  const updateExtensionOption = (index, field, value) => {
    setExtensionOptions(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const extendContract = () => {
    // חישוב תאריך סיום חדש
    const currentEndDate = new Date(formData.end_date);
    const newEndDate = addMonths(currentEndDate, extensionPeriod);

    // חישוב שכר דירה חדש עם הצמדה אם נבחר
    let newRent = parseFloat(formData.monthly_rent);
    if (includeIndexation && indexationPercentage > 0) {
      newRent = newRent * (1 + indexationPercentage / 100);
    }

    // עדכון נתוני החוזה
    setFormData(prev => ({
      ...prev,
      start_date: format(new Date(prev.end_date), 'yyyy-MM-dd'), // תאריך הסיום הנוכחי הופך לתאריך ההתחלה החדש
      end_date: format(newEndDate, 'yyyy-MM-dd'), // תאריך סיום חדש
      monthly_rent: newRent,
      signature_date: format(new Date(), 'yyyy-MM-dd'), // מעדכן תאריך חתימה לתאריך היום
      status: 'active' // וודא שסטטוס החוזה פעיל
    }));

    // הוסף מסמך הארכת חוזה
    setDocuments(prev => [...prev, {
      type: 'contract_extension',
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'final',
      number: `EXT-${Date.now()}`,
      related_to: {
        type: 'contract',
        id: contract?.id || ''
      },
      title: `הארכת חוזה ל-${extensionPeriod} חודשים`,
      notes: `חוזה הוארך מתאריך ${format(currentEndDate, 'dd/MM/yyyy')} עד ${format(newEndDate, 'dd/MM/yyyy')}${
        includeIndexation ? ` עם הצמדה של ${indexationPercentage}%` : ' ללא הצמדה'
      }`
    }]);

    // סגור את אפשרויות ההארכה
    setShowExtensionOptions(false);

    toast({
      title: "החוזה הוארך",
      description: `החוזה הוארך ב-${extensionPeriod} חודשים${
        includeIndexation ? ` עם הצמדה של ${indexationPercentage}%` : ' ללא הצמדה'
      }`
    });
  };

    // הוספת פונקציה להעלאת חוזה חתום
    const handleContractUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      setIsUploadingContract(true);
      try {
        const { file_url } = await UploadFile({ file });
        setContractFile(file_url);
        toast({
          title: "החוזה הועלה בהצלחה",
          description: "קובץ החוזה החתום הועלה לשרת בהצלחה",
        });
      } catch (error) {
        console.error("Error uploading contract:", error);
        toast({
          variant: "destructive",
          title: "שגיאה בהעלאת החוזה",
          description: "אירעה שגיאה בעת העלאת קובץ החוזה החתום",
        });
      } finally {
        setIsUploadingContract(false);
      }
    };

  // וודא שבכל שינוי של פרטי חוזה, העדכון ימשיך לכל הישויות הקשורות
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create a clean copy of the form data to submit
      const cleanedFormData = {
        ...formData,
        monthly_rent: parseFloat(formData.monthly_rent) || 0,
      };

      // Ensure meter readings are numbers, not empty strings
      if (cleanedFormData.meter_readings) {
        cleanedFormData.meter_readings = {
          ...cleanedFormData.meter_readings,
          electricity: cleanedFormData.meter_readings.electricity === '' ? 0 : parseFloat(cleanedFormData.meter_readings.electricity),
          water: cleanedFormData.meter_readings.water === '' ? 0 : parseFloat(cleanedFormData.meter_readings.water),
          gas: cleanedFormData.meter_readings.gas === '' ? 0 : parseFloat(cleanedFormData.meter_readings.gas)
        };
      }

      // Include selected tenants
      cleanedFormData.tenants = selectedTenants;

      // Include additional payments
      cleanedFormData.additional_payments = additionalPayments;

      // Include extension options
      cleanedFormData.extension_options = extensionOptions;

      // Call the onSubmit function with the cleaned data
      onSubmit(cleanedFormData);
    } catch (error) {
      console.error("Error preparing form data:", error);
      toast({
        variant: "destructive",
        title: "שגיאה בהכנת הטופס",
        description: error.message || "אירעה שגיאה בעת הכנת נתוני הטופס",
      });
      setIsLoading(false);
    }
  };

  const handleTenantSelection = (tenantId, isPrimary = false) => {
    const tenant = tenantsList.find(t => t.id === tenantId);
    if (!tenant) return;

    const newTenant = {
      tenant_id: tenantId,
      share_percentage: selectedTenants.length === 0 ? 100 : 0, // אם זה הדייר הראשון, תן לו 100%
      is_primary: isPrimary || selectedTenants.length === 0 // הדייר הראשון הוא תמיד ראשי
    };

    setSelectedTenants(prev => {
      // אם הדייר כבר קיים, הסר אותו
      if (prev.some(t => t.tenant_id === tenantId)) {
        return prev.filter(t => t.tenant_id !== tenantId);
      }
      // אחרת, הוסף אותו
      return [...prev, newTenant];
    });
  };

  const handleSharePercentageChange = (tenantId, percentage) => {
    const numericPercentage = parseFloat(percentage) || 0;
    setSelectedTenants(prev => prev.map(tenant => 
      tenant.tenant_id === tenantId 
        ? { ...tenant, share_percentage: numericPercentage }
        : tenant
    ));
  };

  const calculateTenantRent = (tenant) => {
    const totalRent = parseFloat(formData.monthly_rent) || 0;
    const sharePercentage = tenant.share_percentage || 100;
    return (totalRent * (sharePercentage / 100)).toFixed(2);
  };

  const buildingProperties = propertiesList.filter(p => p.building_id === selectedBuilding);

    const handlePaymentTermsChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            payment_terms: {
                ...prev.payment_terms,
                [field]: value
            }
        }));
    };

    const handleGracePeriodChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            payment_terms: {
                ...prev.payment_terms,
                grace_period: {
                    ...(prev.payment_terms?.grace_period || {}),
                    [field]: value
                }
            }
        }));
    };

    const handleIndexationChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            indexation: {
                ...prev.indexation,
                [field]: value
            }
        }));
    };

    const handleUtilitiesChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            includes_utilities: {
                ...prev.includes_utilities,
                [field]: value
            }
        }));
    };

    const handleMeterReadingsChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            meter_readings: {
                ...prev.meter_readings,
                [field]: value
            }
        }));
    };

    const handleUtilityChange = (utility, value) => {
        setFormData(prev => ({
            ...prev,
            includes_utilities: {
                ...prev.includes_utilities,
                [utility]: value
            }
        }));
    };

    const handlePropertyTaxAmountChange = (amount) => {
        setFormData(prev => ({
            ...prev,
            includes_utilities: {
                ...prev.includes_utilities,
                property_tax_amount: parseFloat(amount) || 0
            }
        }));
    };

// Calculate grace period days automatically when dates change
useEffect(() => {
    const { start_date, end_date } = formData.payment_terms?.grace_period || {};
    if (start_date && end_date) {
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
            const diffTime = Math.abs(endDate - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            handleGracePeriodChange('days', diffDays);
        }
    }
}, [formData.payment_terms?.grace_period?.start_date, formData.payment_terms?.grace_period?.end_date]);

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-6">
        {contract ? 'עריכת חוזה' : 'חוזה חדש'}
      </h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="general">פרטים כלליים</TabsTrigger>
          <TabsTrigger value="extension_options">אופציות הארכה</TabsTrigger>
          <TabsTrigger value="tenants">דיירים</TabsTrigger>
          <TabsTrigger value="payments">תשלומים</TabsTrigger>
          <TabsTrigger value="documents">מסמכים</TabsTrigger>
          <TabsTrigger value="guarantees">ערבויות</TabsTrigger>
          <TabsTrigger value="reminders">תזכורות</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit} className="space-y-6">
          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>מספר חוזה</Label>
                <Input
                  value={formData.contract_number}
                  onChange={(e) => handleInputChange('contract_number', e.target.value)}
                />
              </div>

              <div>
                <Label>סטטוס</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">טיוטה</SelectItem>
                    <SelectItem value="active">פעיל</SelectItem>
                    <SelectItem value="terminated">הסתיים מוקדם</SelectItem>
                    <SelectItem value="expired">פג תוקף</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>בניין</Label>
                <Select
                  value={selectedBuilding}
                  onValueChange={handleBuildingChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר בניין" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(building => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>נכס</Label>
                <Select
                  value={formData.property_id}
                  onValueChange={handlePropertyChange}
                  disabled={!selectedBuilding}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר נכס" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildingProperties.map(property => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.property_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>תאריך חתימה</Label>
                <Input
                  type="date"
                  value={formData.signature_date}
                  onChange={(e) => handleInputChange('signature_date', e.target.value)}
                />
              </div>

              <div>
                <Label>תאריך תחילת חוזה</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                />
              </div>

              <div>
                <Label>תאריך סיום חוזה</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                />
              </div>

              <div>
                <Label>סכום שכירות חודשית</Label>
                <Input
                  type="number"
                  value={formData.monthly_rent}
                  onChange={(e) => handleInputChange('monthly_rent', e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="extension_options" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <Label className="text-lg font-semibold">אופציות להארכת חוזה</Label>
              <Button
                type="button"
                variant="outline"
                onClick={addExtensionOption}
                className="flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                הוסף אופציה
              </Button>
            </div>

            {extensionOptions.map((option, index) => (
              <Card key={index} className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-medium">אופציה {index + 1}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExtensionOption(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>תקופת הארכה (שנים)</Label>
                    <Select
                      value={option.years.toString()}
                      onValueChange={(value) => updateExtensionOption(index, 'years', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            {year} {year === 1 ? 'שנה' : 'שנים'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>תקופת הודעה מראש (חודשים)</Label>
                    <Select
                      value={option.notice_period_months.toString()}
                      onValueChange={(value) => updateExtensionOption(index, 'notice_period_months', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6].map(months => (
                          <SelectItem key={months} value={months.toString()}>
                            {months} {months === 1 ? 'חודש' : 'חודשים'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>אחוז העלאה</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={option.indexation_percentage}
                        onChange={(e) => updateExtensionOption(index, 'indexation_percentage', parseFloat(e.target.value))}
                        className="w-24"
                      />
                      <span>%</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {extensionOptions.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                לא הוגדרו אופציות להארכת חוזה.
                לחץ על "הוסף אופציה" כדי להגדיר אופציות להארכה.
              </p>
            )}
          </TabsContent>

          <TabsContent value="tenants">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">דיירים בחוזה</h3>
                <Select
                  value=""
                  onValueChange={handleTenantSelection}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="הוסף דייר" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantsList
                      .filter(t => !selectedTenants.some(st => st.tenant_id === t.id))
                      .map(tenant => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.full_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTenants.map((tenantRef, index) => {
                const tenant = tenantsList.find(t => t.id === tenantRef.tenant_id);
                if (!tenant) return null;

                return (
                  <Card key={tenant.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{tenant.full_name}</h4>
                        <p className="text-sm text-gray-500">{tenant.phone}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTenantSelection(tenant.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Label>אחוז בנכס</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={tenantRef.share_percentage || ''}
                            onChange={(e) => handleSharePercentageChange(tenant.id, e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <Label>שכ"ד חודשי</Label>
                          <div className="text-lg font-medium">
                            ₪{calculateTenantRent(tenantRef)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">תנאי תשלום</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label>יום תשלום בחודש</Label>
                        <Input
                            type="number"
                            min="1"
                            max="31"
                            value={formData.payment_terms?.payment_day || 1}
                            onChange={(e) => handlePaymentTermsChange('payment_day', parseInt(e.target.value))}
                        />
                    </div>
                    <div>
                        <Label>אמצעי תשלום</Label>
                        <Select
                            value={formData.payment_terms?.payment_method || 'bank_transfer'}
                            onValueChange={(value) => handlePaymentTermsChange('payment_method', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="בחר אמצעי תשלום" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bank_transfer">העברה בנקאית</SelectItem>
                                <SelectItem value="check">צ'ק</SelectItem>
                                <SelectItem value="cash">מזומן</SelectItem>
                                <SelectItem value="direct_debit">הוראת קבע</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                {/* תקופת גרייס */}
                <div className="border p-4 rounded-md bg-gray-50 mt-4">
                    <h4 className="text-md font-medium mb-4">תקופת גרייס</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>תאריך התחלה</Label>
                            <Input
                                type="date"
                                value={formData.payment_terms?.grace_period?.start_date || ''}
                                onChange={(e) => handleGracePeriodChange('start_date', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>תאריך סיום</Label>
                            <Input
                                type="date"
                                value={formData.payment_terms?.grace_period?.end_date || ''}
                                onChange={(e) => handleGracePeriodChange('end_date', e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <div className="flex items-center">
                                <div className="bg-blue-50 p-2 rounded-md flex items-center mr-2">
                                    <span className="text-blue-600 font-semibold">
                                        {formData.payment_terms?.grace_period?.days || 0} ימי גרייס
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2 mr-6">
                                    <Checkbox
                                        id="is_rent_free"
                                        checked={formData.payment_terms?.grace_period?.is_rent_free}
                                        onCheckedChange={(checked) => handleGracePeriodChange('is_rent_free', checked)}
                                    />
                                    <label
                                        htmlFor="is_rent_free"
                                        className="text-sm font-medium leading-none mr-2"
                                    >
                                        תקופה ללא תשלום שכירות
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* הצמדות */}
                <div className="border p-4 rounded-md bg-gray-50 mt-4">
                    <h4 className="text-md font-medium mb-4">הצמדות</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>סוג הצמדה</Label>
                            <Select
                                value={formData.indexation?.type || 'none'}
                                onValueChange={(value) => handleIndexationChange('type', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="בחר סוג הצמדה" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">ללא הצמדה</SelectItem>
                                    <SelectItem value="consumer_price_index">הצמדה למדד המחירים לצרכן</SelectItem>
                                    <SelectItem value="dollar">הצמדה לדולר</SelectItem>
                                    <SelectItem value="custom">הצמדה מותאמת אישית</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {formData.indexation?.type !== 'none' && (
                            <>
                                <div>
                                    <Label>תדירות עדכון</Label>
                                    <Select
                                        value={formData.indexation?.frequency || 'yearly'}
                                        onValueChange={(value) => handleIndexationChange('frequency', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="בחר תדירות" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">חודשי</SelectItem>
                                            <SelectItem value="quarterly">רבעוני</SelectItem>
                                            <SelectItem value="yearly">שנתי</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                {formData.indexation?.type === 'consumer_price_index' && (
                                    <div>
                                        <Label>ערך מדד בסיס</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="ערך מדד הבסיס"
                                            value={formData.indexation?.base_index || ''}
                                            onChange={(e) => handleIndexationChange('base_index', parseFloat(e.target.value))}
                                        />
                                    </div>
                                )}
                                
                                {formData.indexation?.type === 'custom' && (
                                    <div>
                                        <Label>אחוז העלאה קבוע</Label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            placeholder="% העלאה"
                                            value={formData.indexation?.custom_rate || ''}
                                            onChange={(e) => handleIndexationChange('custom_rate', parseFloat(e.target.value))}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            {/* תשלומים נוספים ושירותים */}
            {/* Utilities Section */}
            <div className="space-y-4 mt-6">
                <h3 className="text-lg font-semibold">תשלומים נוספים כלולים בשכר הדירה</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="electricity"
                            checked={formData.includes_utilities?.electricity || false}
                            onCheckedChange={(checked) => handleUtilityChange('electricity', checked)}
                        />
                        <Label htmlFor="electricity">חשמל</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="water"
                            checked={formData.includes_utilities?.water || false}
                            onCheckedChange={(checked) => handleUtilityChange('water', checked)}
                        />
                        <Label htmlFor="water">מים</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="gas"
                            checked={formData.includes_utilities?.gas || false}
                            onCheckedChange={(checked) => handleUtilityChange('gas', checked)}
                        />
                        <Label htmlFor="gas">גז</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="building_committee"
                            checked={formData.includes_utilities?.building_committee || false}
                            onCheckedChange={(checked) => handleUtilityChange('building_committee', checked)}
                        />
                        <Label htmlFor="building_committee">ועד בית</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="internet"
                            checked={formData.includes_utilities?.internet || false}
                            onCheckedChange={(checked) => handleUtilityChange('internet', checked)}
                        />
                        <Label htmlFor="internet">אינטרנט</Label>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="property_tax"
                                checked={formData.includes_utilities?.property_tax || false}
                                onCheckedChange={(checked) => handleUtilityChange('property_tax', checked)}
                            />
                            <Label htmlFor="property_tax">ארנונה</Label>
                        </div>
                        
                        {/* תיבת הזנת סכום ארנונה - מוצגת רק אם ארנונה לא כלולה */}
                        {!formData.includes_utilities?.property_tax && (
                            <div className="mt-2">
                                <Label>סכום ארנונה לתשלום</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        placeholder="סכום ארנונה"
                                        value={formData.includes_utilities?.property_tax_amount || ''}
                                        onChange={(e) => handlePropertyTaxAmountChange(e.target.value)}
                                        className="w-32"
                                    />
                                    <span className="text-sm text-gray-500">₪</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* קריאת מונים */}
            <div className="space-y-4 mt-6">
                <h3 className="text-lg font-semibold">קריאות מונים בתחילת החוזה</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label>תאריך קריאה</Label>
                        <Input
                            type="date"
                            value={formData.meter_readings?.reading_date || ''}
                            onChange={(e) => handleMeterReadingsChange('reading_date', e.target.value)}
                        />
                    </div>
                    
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>קריאת מונה חשמל</Label>
                            <Input
                                type="number"
                                placeholder="קריאת חשמל"
                                value={formData.meter_readings?.electricity || ''}
                                onChange={(e) => handleMeterReadingsChange('electricity', e.target.value)}
                            />
                        </div>
                        
                        <div>
                            <Label>קריאת מונה מים</Label>
                            <Input
                                type="number"
                                placeholder="קריאת מים"
                                value={formData.meter_readings?.water || ''}
                                onChange={(e) => handleMeterReadingsChange('water', e.target.value)}
                            />
                        </div>
                        
                        <div>
                            <Label>קריאת מונה גז</Label>
                            <Input
                                type="number"
                                placeholder="קריאת גז"
                                value={formData.meter_readings?.gas || ''}
                                onChange={(e) => handleMeterReadingsChange('gas', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">העלאת חוזה חתום</h3>
              <div className="p-4 border rounded-lg bg-gray-50">
                <Label htmlFor="contractFile">העלאת חוזה חתום (יסמן את החוזה כפעיל)</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="contractFile"
                    type="file"
                    onChange={handleContractUpload}
                    className="flex-1"
                    disabled={isUploadingContract}
                  />
                  {isUploadingContract && <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent" />}
                </div>
                {contractFile && (
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-100 mt-2">
                    <a href={contractFile} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">
                      צפה בחוזה שהועלה
                    </a>
                    <span className="text-xs text-gray-500">
                      החוזה הועלה בהצלחה
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Display associated documents */}
            {contract && contract.document_id && (
              <div className="mt-4">
                <h3 className="text-md font-medium mb-2">מסמכים מקושרים</h3>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">חוזה חתום</p>
                      <p className="text-sm text-gray-600">הועלה ב-{contract.signature_date}</p>
                    </div>
                    <a 
                      href={contract.document_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 text-sm hover:underline"
                    >
                      צפה במסמך
                    </a>
                  </div>
                </div>
              </div>
            )}
            <ContractDocumentsSection
              documents={documents}
              onDocumentAdd={(doc) => setDocuments(prev => [...prev, doc])}
              onDocumentRemove={(index) => setDocuments(prev => prev.filter((_, i) => i !== index))}
            />
          </TabsContent>

          <TabsContent value="guarantees">
            <ContractGuaranteesSection
              guarantees={guarantees}
              onGuaranteeAdd={(guarantee) => setGuarantees(prev => [...prev, guarantee])}
              onGuaranteeUpdate={(index, updatedGuarantee) => {
                setGuarantees(prev => {
                  const updated = [...prev];
                  updated[index] = updatedGuarantee;
                  return updated;
                });
              }}
              onGuaranteeRemove={(index) => setGuarantees(prev => prev.filter((_, i) => i !== index))}
            />
          </TabsContent>

          <TabsContent value="reminders">
            <ContractRemindersSection
              reminders={reminders}
              onReminderAdd={(reminder) => setReminders(prev => [...prev, reminder])}
              onReminderUpdate={(index, updatedReminder) => {
                setReminders(prev =>  {
                  const updated = [...prev];
                  updated[index] = updatedReminder;
                  return updated;
                });
              }}
              onReminderRemove={(index) => setReminders(prev => prev.filter((_, i) => i !== index))}
            />
          </TabsContent>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? 'שומר...' : contract ? 'עדכן חוזה' : 'צור חוזה'}
            </Button>
          </div>
        </form>
      </Tabs>
    </Card>
  );
}
