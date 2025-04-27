import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Building2, Phone, Mail, MapPin, Banknote, Calculator } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Building, Maintenance } from '@/api/entities';
import syncSupplier, { updateSupplierPerformanceStats } from '../utils/supplierSync';

export default function SupplierForm({ supplier, onSubmit, onCancel }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [buildings, setBuildings] = useState([]);
  const [isCalculatingStats, setIsCalculatingStats] = useState(false);
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [formData, setFormData] = useState(supplier || {
    name: '',
    service_type: '',
    phone: '',
    email: '',
    address: '',
    bank_details: {
      bank_name: '',
      branch: '',
      account_number: ''
    },
    tax_id: '',
    payment_terms: '',
    notes: '',
    related_buildings: []
  });

  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const buildingsData = await Building.list();
        setBuildings(buildingsData);
      } catch (error) {
        console.error('Error loading buildings:', error);
      }
    };

    const loadMaintenanceTasks = async () => {
      if (supplier && supplier.id) {
        try {
          const maintenanceData = await Maintenance.list();
          const supplierTasks = maintenanceData.filter(task => task.supplier_id === supplier.id);
          setMaintenanceTasks(supplierTasks);
        } catch (error) {
          console.error('Error loading maintenance tasks:', error);
        }
      }
    };

    loadBuildings();
    loadMaintenanceTasks();
  }, [supplier]);

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

  const handleBuildingSelection = (buildingId) => {
    let updatedBuildings;
    
    if (formData.related_buildings.includes(buildingId)) {
      // הסרת הבניין אם כבר נבחר
      updatedBuildings = formData.related_buildings.filter(id => id !== buildingId);
    } else {
      // הוספת הבניין אם לא נבחר
      updatedBuildings = [...formData.related_buildings, buildingId];
    }
    
    setFormData(prev => ({
      ...prev,
      related_buildings: updatedBuildings
    }));
  };

  const handleCalculateStats = async () => {
    if (!supplier || !supplier.id) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "לא ניתן לחשב סטטיסטיקות לספק שטרם נשמר"
      });
      return;
    }
    
    setIsCalculatingStats(true);
    try {
      const updatedSupplier = await updateSupplierPerformanceStats(supplier);
      
      if (updatedSupplier.performance_stats) {
        toast({
          title: "הסטטיסטיקות חושבו בהצלחה",
          description: `זמן טיפול ממוצע: ${updatedSupplier.performance_stats.avg_handling_time} ימים`
        });
      } else {
        toast({
          variant: "warning",
          title: "אין מספיק נתונים",
          description: "לא קיימים מספיק נתונים כדי לחשב סטטיסטיקות ביצוע"
        });
      }
    } catch (error) {
      console.error("Error calculating stats:", error);
      toast({
        variant: "destructive",
        title: "שגיאה בחישוב סטטיסטיקות",
        description: "אירעה שגיאה בעת חישוב סטטיסטיקות הביצוע"
      });
    } finally {
      setIsCalculatingStats(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (!formData.name || !formData.service_type) {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "יש למלא שם וסוג שירות"
        });
        return;
      }
      
      let savedSupplier;
      if (supplier) {
        savedSupplier = await onSubmit(formData);
      } else {
        savedSupplier = await onSubmit(formData);
      }
      
      // אם יש לנו ספק שמור, ננסה לסנכרן אותו
      if (savedSupplier && savedSupplier.id) {
        try {
          await syncSupplier(savedSupplier);
        } catch (syncError) {
          console.error("Error syncing supplier:", syncError);
          // לא נפסיק את התהליך אם הסנכרון נכשל
        }
      }
      
      toast({
        title: supplier ? "הספק עודכן בהצלחה" : "הספק נוצר בהצלחה",
        description: "פרטי הספק נשמרו במערכת",
      });
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast({
        variant: "destructive",
        title: "שגיאה בשמירת הספק",
        description: error.message || "אירעה שגיאה בעת שמירת פרטי הספק",
      });
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-6">{supplier ? 'עריכת ספק' : 'ספק חדש'}</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">פרטים כלליים</TabsTrigger>
          <TabsTrigger value="buildings">בניינים קשורים</TabsTrigger>
          <TabsTrigger value="bank">פרטי בנק</TabsTrigger>
          {supplier && <TabsTrigger value="stats">סטטיסטיקות</TabsTrigger>}
        </TabsList>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <TabsContent value="general" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">שם הספק</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="שם הספק"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service_type">סוג שירות</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(value) => handleInputChange('service_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג שירות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plumbing">אינסטלציה</SelectItem>
                    <SelectItem value="electricity">חשמל</SelectItem>
                    <SelectItem value="cleaning">ניקיון</SelectItem>
                    <SelectItem value="maintenance">תחזוקה</SelectItem>
                    <SelectItem value="construction">בנייה ושיפוצים</SelectItem>
                    <SelectItem value="gardening">גינון</SelectItem>
                    <SelectItem value="security">אבטחה</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  טלפון
                </Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="מספר טלפון"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  דואר אלקטרוני
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="כתובת דואר אלקטרוני"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                כתובת
              </Label>
              <Input
                id="address"
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="כתובת"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax_id">מספר עוסק מורשה</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id || ''}
                  onChange={(e) => handleInputChange('tax_id', e.target.value)}
                  placeholder="מספר עוסק מורשה"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_terms">תנאי תשלום</Label>
                <Input
                  id="payment_terms"
                  value={formData.payment_terms || ''}
                  onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                  placeholder="לדוגמה: שוטף + 30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="הערות נוספות"
                rows={3}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="buildings" className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                בניינים קשורים
              </Label>
              <p className="text-sm text-gray-500 mb-4">בחר את הבניינים שבהם הספק נותן שירות</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {buildings.length > 0 ? (
                  buildings.map(building => (
                    <div key={building.id} className="flex items-center space-x-2 space-x-reverse p-2 border rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        id={`building-${building.id}`}
                        checked={formData.related_buildings?.includes(building.id) || false}
                        onChange={() => handleBuildingSelection(building.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor={`building-${building.id}`} className="mr-2 text-sm font-medium text-gray-900">
                        {building.name}
                        <span className="text-xs text-gray-500 block">
                          {building.address?.street}, {building.address?.city}
                        </span>
                      </label>
                    </div>
                  ))
                ) : (
                  <p>אין בניינים במערכת</p>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="bank" className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 mb-4">
                <Banknote className="w-5 h-5" />
                פרטי בנק
              </Label>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">שם הבנק</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_details?.bank_name || ''}
                    onChange={(e) => handleInputChange('bank_details.bank_name', e.target.value)}
                    placeholder="שם הבנק"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="branch">מספר סניף</Label>
                  <Input
                    id="branch"
                    value={formData.bank_details?.branch || ''}
                    onChange={(e) => handleInputChange('bank_details.branch', e.target.value)}
                    placeholder="מספר סניף"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="account_number">מספר חשבון</Label>
                  <Input
                    id="account_number"
                    value={formData.bank_details?.account_number || ''}
                    onChange={(e) => handleInputChange('bank_details.account_number', e.target.value)}
                    placeholder="מספר חשבון"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          {supplier && (
            <TabsContent value="stats" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-lg mb-0">
                    <Calculator className="w-5 h-5" />
                    סטטיסטיקות ביצוע
                  </Label>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleCalculateStats}
                    disabled={isCalculatingStats}
                  >
                    {isCalculatingStats ? (
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent ml-2" />
                    ) : null}
                    חשב סטטיסטיקות
                  </Button>
                </div>
                
                {supplier.performance_stats ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500">סה"כ עבודות</p>
                      <p className="text-2xl font-bold">{supplier.performance_stats.total_jobs || 0}</p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500">זמן טיפול ממוצע (ימים)</p>
                      <p className="text-2xl font-bold">{supplier.performance_stats.avg_handling_time || '-'}</p>
                    </div>
                    
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500">עלות ממוצעת (₪)</p>
                      <p className="text-2xl font-bold">{supplier.performance_stats.avg_cost ? `₪${supplier.performance_stats.avg_cost}` : '-'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-gray-500">לא קיימים נתוני ביצוע</p>
                    <p className="text-sm text-gray-400">לחץ על "חשב סטטיסטיקות" כדי לחשב</p>
                  </div>
                )}
                
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-2">קריאות תחזוקה אחרונות</h3>
                  
                  {maintenanceTasks.length > 0 ? (
                    <div className="space-y-2">
                      {maintenanceTasks.slice(0, 5).map(task => (
                        <div key={task.id} className="border rounded-lg p-3 text-sm bg-gray-50">
                          <div className="flex justify-between">
                            <span className="font-medium">{task.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              task.status === 'completed' ? 'bg-green-100 text-green-800' : 
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {task.status === 'completed' ? 'הושלם' : 
                               task.status === 'in_progress' ? 'בטיפול' : 
                               task.status === 'open' ? 'פתוח' : 'בוטל'}
                            </span>
                          </div>
                          {task.completed_date && task.reported_date && (
                            <div className="text-xs text-gray-500 mt-1">
                              זמן טיפול: {Math.round((new Date(task.completed_date) - new Date(task.reported_date)) / (1000 * 60 * 60 * 24))} ימים
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">אין קריאות תחזוקה משויכות לספק זה</p>
                  )}
                </div>
              </div>
            </TabsContent>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              ביטול
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {supplier ? 'עדכן ספק' : 'צור ספק'}
            </Button>
          </div>
        </form>
      </Tabs>
    </Card>
  );
}