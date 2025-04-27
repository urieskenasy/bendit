
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Upload, X, CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { UploadFile } from '@/api/integrations';
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, CheckCircle } from 'lucide-react';
import { updateMaintenanceMetrics } from '../utils/maintenanceSync';
import { Maintenance } from '@/api/entities';
import { Payment } from '@/api/entities';
import { Contract } from '@/api/entities';

export default function MaintenanceForm({ maintenance, properties, buildings, suppliers, onSubmit, onCancel }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isUploading, setIsUploading] = useState(false);
  const [completionFile, setCompletionFile] = useState(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [isCalculatingMetrics, setIsCalculatingMetrics] = useState(false);
  const [metricsData, setMetricsData] = useState(null);
  const [selectedEntityType, setSelectedEntityType] = useState(maintenance?.related_to?.type || 'property');
  const [formData, setFormData] = useState(maintenance || {
    title: '',
    description: '',
    type: 'maintenance',
    priority: 'medium',
    status: 'open',
    related_to: {
        type: 'property',
        id: ''
    },
    payment_info: {
        cost: '',
        responsibility: 'owner',
        paid_by: '',
        tenant_portion: 0,
        payment_method: '',
        reimbursement_status: 'not_required'
    },
    supplier_id: '',
    reported_date: new Date().toISOString().split('T')[0],
    scheduled_date: '',
    completed_date: '',
    images: [],
    notes: ''
  });

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

  const handleDateChange = (field, date) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        [field]: date.toISOString()
      }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), file_url]
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
    }
    setIsUploading(false);
  };

  const removeImage = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleEntityTypeChange = (type) => {
    setSelectedEntityType(type);
    setFormData(prev => ({
      ...prev,
      related_to: {
        type,
        id: ''
      }
    }));
  };

  const handleCompletionUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setCompletionFile(file_url);
      toast({
        title: "קובץ אישור סיום עבודה הועלה בהצלחה",
        description: "הקובץ הועלה לשרת בהצלחה",
      });
    } catch (error) {
      console.error("Error uploading completion document:", error);
      toast({
        variant: "destructive",
        title: "שגיאה בהעלאת הקובץ",
        description: "אירעה שגיאה בעת העלאת קובץ אישור סיום העבודה",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (!formData.related_to?.type || !formData.related_to?.id) {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "חובה לבחור נכס או בניין"
        });
        return;
      }
      
      let savedMaintenance;
      if (maintenance) {
        savedMaintenance = await Maintenance.update(maintenance.id, formData);
        //savedMaintenance = {...maintenance, ...formData};
      } else {
        savedMaintenance = await Maintenance.create(formData);
        //savedMaintenance = formData;
      }
      
      /*if (completionFile) {
        try {
          await createMaintenanceCompletionDocument(savedMaintenance, completionFile);
          
          //savedMaintenance = await updateMaintenanceMetrics(savedMaintenance);
          savedMaintenance = {...savedMaintenance, metrics: {days_to_complete: 5}};
          
          toast({
            title: "אישור סיום עבודה נשמר בהצלחה",
            description: "המשימה סומנה כהושלמה ומסמך האישור נשמר",
          });
        } catch (docError) {
          console.error("Error creating completion document:", docError);
        }
      }*/
        // Handle payment records if cost exists
        if (formData.payment_info?.cost > 0) {
            const property = properties.find(p => p.id === formData.related_to.id);
            
            let tenant;
            try {
                tenant = await getTenantForProperty(property.id);
            } catch (e) {
                tenant = null;
                console.warn("No active tenant found", e);
            }

            
            // Create payment record
            const paymentData = {
                related_to: {
                    type: formData.payment_info.paid_by,
                    id: formData.payment_info.paid_by === 'tenant' ? tenant?.id : property.owner_id
                },
                property_id: property.id,
                amount: formData.payment_info.cost,
                type: 'maintenance',
                date: formData.payment_info.payment_date || new Date().toISOString().split('T')[0],
                status: 'paid',
                payment_method: formData.payment_info.payment_method,
                notes: `תשלום עבור תחזוקה: ${formData.title}`
            };

            await Payment.create(paymentData);

            // If tenant paid but owner is responsible, create future compensation
            if (formData.payment_info.paid_by === 'tenant' &&
                formData.payment_info.responsibility === 'owner') {

                const compensationPayment = {
                    related_to: {
                        type: 'tenant',
                        id: tenant.id
                    },
                    property_id: property.id,
                    amount: -formData.payment_info.cost, // Negative amount for reduction
                    type: 'maintenance',
                    date: getNextMonthDate(),
                    status: 'pending',
                    notes: `זיכוי עבור תשלום תחזוקה: ${formData.title}`
                };

                await Payment.create(compensationPayment);
            }
        }
      
      toast({
        title: maintenance ? "המשימה עודכנה בהצלחה" : "המשימה נוצרה בהצלחה",
        description: "פרטי המשימה נשמרו במערכת",
      });
      
      onSubmit(savedMaintenance);
    } catch (error) {
      console.error("Error saving maintenance:", error);
      toast({
        variant: "destructive",
        title: "שגיאה בשמירת המשימה",
        description: error.message || "אירעה שגיאה בעת שמירת המשימה",
      });
    }
  };

    // Helper function to get next month's date
    const getNextMonthDate = () => {
        const date = new Date();
        date.setMonth(date.getMonth() + 1);
        return date.toISOString().split('T')[0];
    };

    // Helper function to get tenant for property
    const getTenantForProperty = async (propertyId) => {
        const contracts = await Contract.list();
        const activeContract = contracts.find(c =>
            c.property_id === propertyId &&
            c.status === 'active' &&
            new Date(c.end_date) > new Date()
        );
        if (!activeContract?.tenants?.[0]?.tenant_id) {
            throw new Error('לא נמצא דייר פעיל לנכס זה');
        }
        return activeContract.tenants[0].tenant_id;
    };
  const calculateMetrics = async () => {
    if (!maintenance || !maintenance.id) return;
    
    setIsCalculatingMetrics(true);
    try {
      // בדיקה אם יש תאריכי דיווח וסיום
      if (!maintenance.reported_date || !maintenance.completed_date) {
        toast({
          variant: "destructive",
          title: "שגיאה בחישוב המטריקות",
          description: "חסרים תאריכי דיווח או סיום לחישוב זמן הטיפול"
        });
        setIsCalculatingMetrics(false);
        return;
      }

      // חישוב מטריקות באופן מקומי במקום לקרוא לפונקציה חיצונית
      const reportedDate = parseISO(maintenance.reported_date);
      const completedDate = parseISO(maintenance.completed_date);
      
      // חישוב מספר הימים בין תאריך הדיווח לתאריך הסיום
      const daysToComplete = Math.round((completedDate - reportedDate) / (1000 * 60 * 60 * 24));
      
      const metrics = {
        days_to_complete: daysToComplete,
        completion_time: daysToComplete * 24 // בשעות
      };
      
      setMetricsData(metrics);
      setShowMetrics(true);
      
      // עדכון המטריקות בשרת (אופציונלי)
      try {
        await Maintenance.update(maintenance.id, {
          ...maintenance,
          metrics: metrics
        });
      } catch (updateError) {
        console.error("Error updating maintenance metrics in server:", updateError);
        // המשך התהליך בכל מקרה
      }
      
      toast({
        title: "המטריקות חושבו בהצלחה",
        description: `זמן טיפול: ${daysToComplete} ימים`,
      });
    } catch (error) {
      console.error("Error calculating metrics:", error);
      toast({
        variant: "destructive",
        title: "שגיאה בחישוב המטריקות",
        description: "אירעה שגיאה בעת חישוב מטריקות הביצוע"
      });
    } finally {
      setIsCalculatingMetrics(false);
    }
  };
  
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-6">{maintenance ? 'עריכת משימת תחזוקה' : 'משימת תחזוקה חדשה'}</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">פרטים כלליים</TabsTrigger>
          <TabsTrigger value="details">פרטים נוספים</TabsTrigger>
          <TabsTrigger value="completion">סיום עבודה</TabsTrigger>
          {maintenance && <TabsTrigger value="history">היסטוריה</TabsTrigger>}
        </TabsList>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <TabsContent value="general" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">כותרת</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="תיאור קצר של הבעיה"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">סוג משימה</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">תחזוקה שוטפת</SelectItem>
                    <SelectItem value="repair">תיקון</SelectItem>
                    <SelectItem value="renovation">שיפוץ</SelectItem>
                    <SelectItem value="cleaning">ניקיון</SelectItem>
                    <SelectItem value="inspection">בדיקה</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">תיאור מפורט</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="פרט את הבעיה או המשימה"
                rows={4}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">דחיפות</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => handleInputChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">דחוף</SelectItem>
                    <SelectItem value="high">גבוהה</SelectItem>
                    <SelectItem value="medium">בינונית</SelectItem>
                    <SelectItem value="low">נמוכה</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">סטטוס</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">פתוח</SelectItem>
                    <SelectItem value="in_progress">בטיפול</SelectItem>
                    <SelectItem value="completed">הושלם</SelectItem>
                    <SelectItem value="cancelled">בוטל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>קשור ל</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={selectedEntityType === 'property' ? 'default' : 'outline'}
                    onClick={() => handleEntityTypeChange('property')}
                    className="flex-1"
                  >
                    נכס
                  </Button>
                  <Button
                    type="button"
                    variant={selectedEntityType === 'building' ? 'default' : 'outline'}
                    onClick={() => handleEntityTypeChange('building')}
                    className="flex-1"
                  >
                    בניין
                  </Button>
                </div>
              </div>

              {selectedEntityType === 'property' ? (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="property_id">נכס</Label>
                  <Select
                    value={formData.related_to?.id || ''}
                    onValueChange={(value) => handleInputChange('related_to.id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר נכס" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map(property => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.property_number} - {
                            buildings.find(b => b.id === property.building_id)?.name || 'לא ידוע'
                          }
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="building_id">בניין</Label>
                  <Select
                    value={formData.related_to?.id || ''}
                    onValueChange={(value) => handleInputChange('related_to.id', value)}
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
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier_id">ספק מטפל</Label>
                <Select
                  value={formData.supplier_id || ''}
                  onValueChange={(value) => handleInputChange('supplier_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר ספק" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>ללא ספק</SelectItem>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">עלות</Label>
                <Input
                  id="cost"
                  type="number"
                  value={formData.cost || ''}
                  onChange={(e) => handleInputChange('cost', e.target.value)}
                  placeholder="עלות התיקון/המשימה"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_by">התשלום חל על</Label>
                <Select
                  value={formData.payment_info?.responsibility}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    payment_info: {
                      ...prev.payment_info,
                      responsibility: value
                    }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">בעל הנכס</SelectItem>
                    <SelectItem value="tenant">השוכר</SelectItem>
                    <SelectItem value="both">חלוקה בין השוכר לבעלים</SelectItem>
                    <SelectItem value="building_committee">ועד הבית</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.payment_info?.responsibility === 'both' && (
                <div className="space-y-2">
                  <Label htmlFor="tenant_portion">אחוז התשלום של השוכר</Label>
                  <Input
                    id="tenant_portion"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.payment_info?.tenant_portion || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      payment_info: {
                        ...prev.payment_info,
                        tenant_portion: parseInt(e.target.value)
                      }
                    }))}
                    placeholder="אחוז תשלום השוכר (0-100)"
                  />
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reported_date">תאריך דיווח</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-right font-normal",
                        !formData.reported_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {formData.reported_date ? (
                        format(new Date(formData.reported_date), 'dd/MM/yyyy')
                      ) : (
                        <span>בחר תאריך</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.reported_date ? new Date(formData.reported_date) : undefined}
                      onSelect={(date) => handleDateChange('reported_date', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduled_date">תאריך מתוכנן לטיפול</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-right font-normal",
                        !formData.scheduled_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {formData.scheduled_date ? (
                        format(new Date(formData.scheduled_date), 'dd/MM/yyyy')
                      ) : (
                        <span>בחר תאריך</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.scheduled_date ? new Date(formData.scheduled_date) : undefined}
                      onSelect={(date) => handleDateChange('scheduled_date', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {(formData.status === 'completed') && (
                <div className="space-y-2">
                  <Label htmlFor="completed_date">תאריך סיום טיפול</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-right font-normal",
                          !formData.completed_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {formData.completed_date ? (
                          format(new Date(formData.completed_date), 'dd/MM/yyyy')
                        ) : (
                          <span>בחר תאריך</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.completed_date ? new Date(formData.completed_date) : undefined}
                        onSelect={(date) => handleDateChange('completed_date', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>תמונות</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(formData.images || []).map((imageUrl, index) => (
                  <div key={index} className="relative">
                    <img
                      src={imageUrl}
                      alt={`תמונה ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removeImage(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <label className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                  <Upload className="w-6 h-6 mb-2 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {isUploading ? 'מעלה...' : 'העלה תמונה'}
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reported_by">דווח על ידי</Label>
              <Input
                id="reported_by"
                value={formData.reported_by || ''}
                onChange={(e) => handleInputChange('reported_by', e.target.value)}
                placeholder="שם המדווח"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="recurring"
                  checked={formData.recurring || false}
                  onCheckedChange={(checked) => handleInputChange('recurring', checked)}
                />
                <Label htmlFor="recurring">משימה חוזרת</Label>
              </div>

              {formData.recurring && (
                <div className="pt-2">
                  <Label htmlFor="recurrence_pattern">תדירות חזרה</Label>
                  <Select
                    value={formData.recurrence_pattern || 'monthly'}
                    onValueChange={(value) => handleInputChange('recurrence_pattern', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">שבועי</SelectItem>
                      <SelectItem value="monthly">חודשי</SelectItem>
                      <SelectItem value="quarterly">רבעוני</SelectItem>
                      <SelectItem value="yearly">שנתי</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="הערות נוספות"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="completion" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">סיום עבודה</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="completed_date">תאריך סיום</Label>
                  <div className="flex">
                    <Input
                      id="completed_date"
                      type="date"
                      value={formData.completed_date || ''}
                      onChange={(e) => handleInputChange('completed_date', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cost">עלות הטיפול</Label>
                  <Input
                    id="cost"
                    type="number"
                    value={formData.cost || ''}
                    onChange={(e) => handleInputChange('cost', e.target.value)}
                    placeholder="הזן עלות בש״ח"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">סטטוס</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">פתוח</SelectItem>
                    <SelectItem value="in_progress">בטיפול</SelectItem>
                    <SelectItem value="completed">הושלם</SelectItem>
                    <SelectItem value="cancelled">בוטל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-4 border rounded-lg bg-gray-50">
                <Label htmlFor="completionFile">העלאת אישור סיום עבודה</Label>
                <p className="text-xs text-gray-500 mb-2">העלאת אישור תסמן את המשימה כהושלמה ותיצור מסמך במערכת</p>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="completionFile"
                    type="file"
                    onChange={handleCompletionUpload}
                    className="flex-1"
                    disabled={isUploading}
                  />
                  {isUploading && <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent" />}
                </div>
                {completionFile && (
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-100 mt-2">
                    <a href={completionFile} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">
                      צפה באישור שהועלה
                    </a>
                    <span className="text-xs text-gray-500">
                      האישור הועלה בהצלחה
                    </span>
                  </div>
                )}
              </div>
              
              {maintenance && maintenance.reported_date && (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-medium">מטריקות ביצוע</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={calculateMetrics}
                      disabled={isCalculatingMetrics}
                    >
                      {isCalculatingMetrics ? (
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent mr-2" />
                      ) : (
                        <Calculator className="h-4 w-4 mr-2" />
                      )}
                      חשב מטריקות
                    </Button>
                  </div>
                  
                  {(showMetrics || (maintenance.metrics && maintenance.metrics.days_to_complete) || metricsData) && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-gray-500">זמן טיפול (ימים)</p>
                        <p className="text-lg font-semibold">
                          {metricsData?.days_to_complete || maintenance.metrics?.days_to_complete || '-'}
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-gray-500">עלות</p>
                        <p className="text-lg font-semibold">₪{maintenance.cost || 0}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
              <div className="space-y-4">
                  <h3 className="text-lg font-semibold">פרטי תשלום</h3>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label>עלות</Label>
                          <Input
                              type="number"
                              value={formData.payment_info?.cost || ''}
                              onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  payment_info: {
                                      ...prev.payment_info,
                                      cost: parseFloat(e.target.value)
                                  }
                              }))}
                              placeholder="הכנס עלות"
                          />
                      </div>

                      <div className="space-y-2">
                          <Label>אחריות תשלום</Label>
                          <Select
                              value={formData.payment_info?.responsibility || 'owner'}
                              onValueChange={(value) => setFormData(prev => ({
                                  ...prev,
                                  payment_info: {
                                      ...prev.payment_info,
                                      responsibility: value
                                  }
                              }))}
                          >
                              <SelectTrigger>
                                  <SelectValue placeholder="בחר אחראי לתשלום" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="owner">בעל נכס</SelectItem>
                                  <SelectItem value="tenant">דייר</SelectItem>
                                  <SelectItem value="both">שניהם</SelectItem>
                                  <SelectItem value="building_committee">ועד בית</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>

                      <div className="space-y-2">
                          <Label>שולם בפועל על ידי</Label>
                          <Select
                              value={formData.payment_info?.paid_by || ''}
                              onValueChange={(value) => setFormData(prev => ({
                                  ...prev,
                                  payment_info: {
                                      ...prev.payment_info,
                                      paid_by: value
                                  }
                              }))}
                          >
                              <SelectTrigger>
                                  <SelectValue placeholder="בחר מי שילם" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="owner">בעל נכס</SelectItem>
                                  <SelectItem value="tenant">דייר</SelectItem>
                                  <SelectItem value="building_committee">ועד בית</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>

                      {formData.payment_info?.responsibility === 'both' && (
                          <div className="space-y-2">
                              <Label>אחוז השתתפות הדייר</Label>
                              <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={formData.payment_info?.tenant_portion || ''}
                                  onChange={(e) => setFormData(prev => ({
                                      ...prev,
                                      payment_info: {
                                          ...prev.payment_info,
                                          tenant_portion: parseInt(e.target.value)
                                      }
                                  }))}
                                  placeholder="הכנס אחוז"
                              />
                          </div>
                      )}

                      <div className="space-y-2">
                          <Label>אמצעי תשלום</Label>
                          <Select
                              value={formData.payment_info?.payment_method || ''}
                              onValueChange={(value) => setFormData(prev => ({
                                  ...prev,
                                  payment_info: {
                                      ...prev.payment_info,
                                      payment_method: value
                                  }
                              }))}
                          >
                              <SelectTrigger>
                                  <SelectValue placeholder="בחר אמצעי תשלום" />
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
                  </div>
              </div>
          </TabsContent>
          
          {maintenance && (
            <TabsContent value="history" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">היסטוריית טיפול</h3>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b">
                    <h4 className="font-medium">פרטי דיווח</h4>
                  </div>
                  <div className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">תאריך דיווח:</span>
                        <span className="text-sm font-medium">
                          {maintenance.reported_date ? format(parseISO(maintenance.reported_date), 'dd/MM/yyyy') : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">דווח על ידי:</span>
                        <span className="text-sm font-medium">{maintenance.reported_by || '-'}</span>
                      </div>
                      {maintenance.scheduled_date && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">תאריך טיפול מתוכנן:</span>
                          <span className="text-sm font-medium">
                            {format(parseISO(maintenance.scheduled_date), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {maintenance.notes && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">הערות</h4>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm">{maintenance.notes}</div>
                  </div>
                )}
                
                {maintenance.completed_date && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100">
                    <h4 className="font-medium mb-2 flex items-center text-green-800">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      הושלם בתאריך {format(parseISO(maintenance.completed_date), 'dd/MM/yyyy')}
                    </h4>
                    {maintenance.document_id && (
                      <p className="text-sm text-green-700">
                        אישור סיום עבודה זמין במערכת המסמכים
                      </p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              ביטול
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {maintenance ? 'עדכן משימה' : 'צור משימה'}
            </Button>
          </div>
        </form>
      </Tabs>
    </Card>
  );
}
