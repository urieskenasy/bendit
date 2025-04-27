
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
import { Checkbox } from '@/components/ui/checkbox';
import { X, Upload, Plus, UserPlus, Trash2, Percent, AlertCircle, User } from 'lucide-react';
import { UploadFile } from '@/api/integrations';
import { Tenant, Contract, Property, Owner, Supplier } from '@/api/entities';
import { useToast } from '@/components/ui/use-toast';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';

export default function PropertyForm({ property, buildings, owners, suppliers, onSubmit, onCancel, onNewBuilding, preselectedBuilding }) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedOwners, setSelectedOwners] = useState(property?.owners || []);
  const [showOwnersDialog, setShowOwnersDialog] = useState(false);
  const [currentOwner, setCurrentOwner] = useState({ owner_id: '', percentage: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(property || {
    building_id: preselectedBuilding || '',
    property_number: '',
    type: 'apartment',
    location: {
      floor: '',
      entrance: '',
      wing: '',
      direction: ''
    },
    measurements: {
      total_sqm: '',
      main_sqm: '',
      service_sqm: '',
      balcony_sqm: '',
      garden_sqm: '',
      storage_sqm: ''
    },
    features: {
      rooms: '',
      bathrooms: '',
      parking_spots: '',
      has_storage: false,
      storage_number: '',
      parking_numbers: [],
      air_direction: [],
      has_sunlight: false,
      renovation_status: 'good'
    },
    rental_details: {
      status: 'available',
      monthly_rent: '',
      payment_day: 1,
      deposit_amount: '',
      includes_maintenance: false,
      includes_property_tax: false,
      includes_water: false,
      vat_required: false
    },
    owners: [],
    supplier_ids: [],
    images: [],
    notes: '',
    financial_settings: {
      tax_deduction_percentage: '',
      depreciation_percentage: '',
      requires_vat: false,
      requires_income_tax: true
    }
  });

  useEffect(() => {
    if (property && property.owners) {
      setSelectedOwners(property.owners);
    }
  }, [property]);

  const handleInputChange = (field, value) => {
    const fields = field.split('.');
    if (fields.length === 1) {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    } else if (fields.length === 2) {
      const [parent, child] = fields;
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else if (fields.length === 3) {
      const [grandparent, parent, child] = fields;
      setFormData(prev => ({
        ...prev,
        [grandparent]: {
          ...prev[grandparent],
          [parent]: {
            ...prev[grandparent]?.[parent],
            [child]: value
          }
        }
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
        images: [...(prev.images || []), { url: file_url, is_main: (prev.images || []).length === 0 }]
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

  const addOwner = () => {
    if (!currentOwner.owner_id || !currentOwner.percentage) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "יש למלא את כל השדות"
      });
      return;
    }

    const totalPercentage = selectedOwners.reduce((sum, owner) => sum + owner.percentage, 0) + Number(currentOwner.percentage);
    
    if (totalPercentage > 100) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "סך כל האחוזים לא יכול לעלות על 100%"
      });
      return;
    }

    setSelectedOwners([...selectedOwners, {
      owner_id: currentOwner.owner_id,
      percentage: Number(currentOwner.percentage)
    }]);

    setCurrentOwner({ owner_id: '', percentage: '' });
  };

  const removeOwner = (ownerIdToRemove) => {
    setSelectedOwners(prev => prev.filter(owner => owner.owner_id !== ownerIdToRemove));
  };

  const getOwnerDetails = (ownerId) => {
    return owners.find(owner => owner.id === ownerId);
  };

  const handleSupplierToggle = (supplierId) => {
    setFormData(prev => {
      const currentSuppliers = prev.supplier_ids || [];
      const updatedSuppliers = currentSuppliers.includes(supplierId)
        ? currentSuppliers.filter(id => id !== supplierId)
        : [...currentSuppliers, supplierId];
      
      return {
        ...prev,
        supplier_ids: updatedSuppliers
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (!formData.building_id) {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "חובה לבחור בניין"
        });
        return;
      }
      
      if (!formData.property_number) {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "חובה להזין מספר נכס"
        });
        return;
      }

      // וודא שכל השדות המספריים הם אכן מספרים
      const cleanedData = {
        ...formData,
        measurements: {
          ...formData.measurements,
          total_sqm: parseFloat(formData.measurements.total_sqm) || null,
          main_sqm: parseFloat(formData.measurements.main_sqm) || null,
          service_sqm: parseFloat(formData.measurements.service_sqm) || null,
          balcony_sqm: parseFloat(formData.measurements.balcony_sqm) || null,
          garden_sqm: parseFloat(formData.measurements.garden_sqm) || null,
          storage_sqm: parseFloat(formData.measurements.storage_sqm) || null
        },
        features: {
          ...formData.features,
          rooms: parseFloat(formData.features.rooms) || null,
          bathrooms: parseFloat(formData.features.bathrooms) || null,
          parking_spots: parseFloat(formData.features.parking_spots) || null
        },
        rental_details: {
          ...formData.rental_details,
          monthly_rent: parseFloat(formData.rental_details.monthly_rent) || 0,
          payment_day: parseInt(formData.rental_details.payment_day) || 1,
          deposit_amount: parseFloat(formData.rental_details.deposit_amount) || null
        },
        financial_settings: {
          ...formData.financial_settings || {},
          tax_deduction_percentage: formData.financial_settings?.tax_deduction_percentage ? parseFloat(formData.financial_settings.tax_deduction_percentage) : null,
          depreciation_percentage: formData.financial_settings?.depreciation_percentage ? parseFloat(formData.financial_settings.depreciation_percentage) : null,
        }
      };
      
      await onSubmit(cleanedData);
    } catch (error) {
      console.error('Error submitting property:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בשמירת הנכס",
        description: error.message || "אירעה שגיאה בשמירת הנכס"
      });
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-6">{property ? 'עריכת נכס' : 'נכס חדש'}</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">פרטים כלליים</TabsTrigger>
          <TabsTrigger value="features">מאפיינים</TabsTrigger>
          <TabsTrigger value="owners">בעלי הנכס</TabsTrigger>
          <TabsTrigger value="images">תמונות</TabsTrigger>
          <TabsTrigger value="financial">פיננסי</TabsTrigger>
          <TabsTrigger value="suppliers">ספקים</TabsTrigger>
        </TabsList>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <TabsContent value="general" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="building">בניין</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.building_id}
                    onValueChange={(value) => handleInputChange('building_id', value)}
                    className="flex-1"
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
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-shrink-0" 
                    onClick={onNewBuilding}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_number">מספר נכס</Label>
                <Input
                  id="property_number"
                  value={formData.property_number}
                  onChange={(e) => handleInputChange('property_number', e.target.value)}
                  placeholder="לדוגמה: דירה 4, חנות 2"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">סוג נכס</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">דירה</SelectItem>
                    <SelectItem value="office">משרד</SelectItem>
                    <SelectItem value="store">חנות</SelectItem>
                    <SelectItem value="warehouse">מחסן</SelectItem>
                    <SelectItem value="parking">חניה</SelectItem>
                    <SelectItem value="storage">מחסן</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="floor">קומה</Label>
                <Input
                  id="floor"
                  type="number"
                  value={formData.location?.floor || ''}
                  onChange={(e) => handleInputChange('location.floor', e.target.value)}
                  placeholder="הכנס קומה"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entrance">כניסה</Label>
                <Input
                  id="entrance"
                  value={formData.location?.entrance || ''}
                  onChange={(e) => handleInputChange('location.entrance', e.target.value)}
                  placeholder="לדוגמה: א׳, ב׳, 1, 2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wing">אגף</Label>
                <Input
                  id="wing"
                  value={formData.location?.wing || ''}
                  onChange={(e) => handleInputChange('location.wing', e.target.value)}
                  placeholder="לדוגמה: מערבי, מזרחי"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">מידות</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_sqm">שטח כולל (מ״ר)</Label>
                  <Input
                    id="total_sqm"
                    type="number"
                    value={formData.measurements?.total_sqm || ''}
                    onChange={(e) => handleInputChange('measurements.total_sqm', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="main_sqm">שטח עיקרי (מ״ר)</Label>
                  <Input
                    id="main_sqm"
                    type="number"
                    value={formData.measurements?.main_sqm || ''}
                    onChange={(e) => handleInputChange('measurements.main_sqm', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service_sqm">שטח שירות (מ״ר)</Label>
                  <Input
                    id="service_sqm"
                    type="number"
                    value={formData.measurements?.service_sqm || ''}
                    onChange={(e) => handleInputChange('measurements.service_sqm', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="features" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">מאפיינים</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rooms">חדרים</Label>
                  <Input
                    id="rooms"
                    type="number"
                    value={formData.features?.rooms || ''}
                    onChange={(e) => handleInputChange('features.rooms', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">חדרי אמבטיה</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    value={formData.features?.bathrooms || ''}
                    onChange={(e) => handleInputChange('features.bathrooms', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parking_spots">חניות</Label>
                  <Input
                    id="parking_spots"
                    type="number"
                    value={formData.features?.parking_spots || ''}
                    onChange={(e) => handleInputChange('features.parking_spots', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="owners" className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">בעלי הנכס</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowOwnersDialog(true)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  הוסף בעלים
                </Button>
              </div>
              
              {selectedOwners.length === 0 ? (
                <Alert className="bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700">
                    טרם הוגדרו בעלים לנכס. יש להגדיר לפחות בעלים אחד.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {selectedOwners.map((ownerData) => {
                    const owner = getOwnerDetails(ownerData.owner_id);
                    return (
                      <div key={ownerData.owner_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-blue-100 rounded-full">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{owner?.full_name || 'בעלים לא ידוע'}</div>
                            <div className="text-sm text-gray-500">{owner?.phone || ''}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className="bg-blue-50 text-blue-700">
                            {ownerData.percentage}%
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOwner(ownerData.owner_id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="mt-4">
                    <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
                      <span className="font-medium">סה"כ חלוקה:</span>
                      <span className={`font-bold ${selectedOwners.reduce((sum, owner) => sum + owner.percentage, 0) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedOwners.reduce((sum, owner) => sum + owner.percentage, 0)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="images" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">תמונות</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(formData.images || []).map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image.url}
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
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">הגדרות פיננסיות</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_deduction_percentage">אחוז ניכוי מס במקור</Label>
                  <Input
                    id="tax_deduction_percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.financial_settings?.tax_deduction_percentage || ''}
                    onChange={(e) => handleInputChange('financial_settings.tax_deduction_percentage', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depreciation_percentage">אחוז פחת שנתי</Label>
                  <Input
                    id="depreciation_percentage"
                    type="number" 
                    min="0"
                    max="100"
                    value={formData.financial_settings?.depreciation_percentage || ''}
                    onChange={(e) => handleInputChange('financial_settings.depreciation_percentage', e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="requires_vat"
                    checked={formData.financial_settings?.requires_vat || false}
                    onCheckedChange={(checked) => handleInputChange('financial_settings.requires_vat', checked)}
                  />
                  <Label htmlFor="requires_vat">חייב מע"מ</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="requires_income_tax"
                    checked={formData.financial_settings?.requires_income_tax !== false}
                    onCheckedChange={(checked) => handleInputChange('financial_settings.requires_income_tax', checked)}
                  />
                  <Label htmlFor="requires_income_tax">חייב מס הכנסה</Label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">ספקים מקושרים</h3>
              <div className="space-y-2">
                {suppliers.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {suppliers.map(supplier => (
                      <div key={supplier.id} className="flex items-center space-x-2 space-x-reverse p-3 bg-gray-50 rounded-lg">
                        <Checkbox
                          id={`supplier-${supplier.id}`}
                          checked={(formData.supplier_ids || []).includes(supplier.id)}
                          onCheckedChange={() => handleSupplierToggle(supplier.id)}
                        />
                        <div className="flex-1">
                          <Label htmlFor={`supplier-${supplier.id}`} className="font-medium">
                            {supplier.name}
                          </Label>
                          <p className="text-sm text-gray-500">
                            {supplier.service_type === 'plumbing' && 'אינסטלציה'}
                            {supplier.service_type === 'electricity' && 'חשמל'}
                            {supplier.service_type === 'cleaning' && 'ניקיון'}
                            {supplier.service_type === 'maintenance' && 'תחזוקה'}
                            {supplier.service_type === 'construction' && 'בנייה ושיפוצים'}
                            {supplier.service_type === 'gardening' && 'גינון'}
                            {supplier.service_type === 'security' && 'אבטחה'}
                            {supplier.service_type === 'other' && 'אחר'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">לא נמצאו ספקים במערכת</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <div className="space-y-2">
            <Label htmlFor="notes">הערות</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="הכנס הערות"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              ביטול
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {property ? 'עדכן נכס' : 'צור נכס'}
            </Button>
          </div>
        </form>
      </Tabs>
      
      <Dialog open={showOwnersDialog} onOpenChange={setShowOwnersDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוספת בעלים לנכס</DialogTitle>
            <DialogDescription>
              בחר בעלים והגדר את אחוז הבעלות שלו בנכס.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="owner_id">בחר בעלים</Label>
              <Select
                value={currentOwner.owner_id}
                onValueChange={(value) => setCurrentOwner({...currentOwner, owner_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר בעלים" />
                </SelectTrigger>
                <SelectContent>
                  {owners
                    .filter(owner => !selectedOwners.some(selected => selected.owner_id === owner.id))
                    .map(owner => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="percentage">אחוז בעלות</Label>
              <div className="flex">
                <Input
                  id="percentage"
                  type="number"
                  min="1"
                  max="100"
                  value={currentOwner.percentage}
                  onChange={(e) => setCurrentOwner({...currentOwner, percentage: e.target.value})}
                  className="rounded-l-none"
                />
                <div className="flex items-center justify-center px-3 bg-gray-100 border border-r-0 rounded-l-md">
                  <Percent className="w-4 h-4 text-gray-500" />
                </div>
              </div>
            </div>
            
            <div className="mt-2">
              <div className="text-sm text-gray-500">
                סה"כ חלוקה נוכחית: {selectedOwners.reduce((sum, owner) => sum + Number(owner.percentage), 0)}%
              </div>
              <div className="text-sm text-gray-500">
                סה"כ לאחר הוספה: {selectedOwners.reduce((sum, owner) => sum + Number(owner.percentage), 0) + Number(currentOwner.percentage)}%
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowOwnersDialog(false)}>
              ביטול
            </Button>
            <Button 
              type="button" 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                addOwner();
                setShowOwnersDialog(false)
              }}
            >
              הוסף בעלים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
