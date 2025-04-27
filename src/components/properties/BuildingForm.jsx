import React, { useState } from 'react';
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
import { X, Upload } from 'lucide-react';
import { UploadFile } from '@/api/integrations';

export default function BuildingForm({ building, buildingCommittees, onSubmit, onCancel }) {
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState(building || {
    name: '',
    address: {
      street: '',
      number: '',
      city: '',
      postal_code: ''
    },
    total_floors: '',
    year_built: '',
    building_type: 'residential',
    building_committee: '',
    amenities: [],
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

  const handleAmenityToggle = (amenity) => {
    setFormData(prev => {
      const amenities = [...(prev.amenities || [])];
      if (amenities.includes(amenity)) {
        return {
          ...prev,
          amenities: amenities.filter(a => a !== amenity)
        };
      } else {
        return {
          ...prev,
          amenities: [...amenities, amenity]
        };
      }
    });
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

  const handleSubmit = (e) => {
    e.preventDefault();
    // Convert numeric fields
    const dataToSubmit = {
      ...formData,
      total_floors: formData.total_floors ? parseInt(formData.total_floors) : null,
      year_built: formData.year_built ? parseInt(formData.year_built) : null
    };
    onSubmit(dataToSubmit);
  };

  const amenityLabels = {
    elevator: 'מעלית',
    parking: 'חניה',
    storage: 'מחסן',
    lobby: 'לובי',
    security: 'אבטחה',
    cameras: 'מצלמות',
    intercom: 'אינטרקום',
    generator: 'גנרטור',
    garden: 'גינה'
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-6">{building ? 'עריכת בניין' : 'בניין חדש'}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">שם הבניין</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="לדוגמה: מגדלי אקירוב"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="street">רחוב</Label>
            <Input
              id="street"
              value={formData.address?.street || ''}
              onChange={(e) => handleInputChange('address.street', e.target.value)}
              placeholder="הכנס רחוב"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="number">מספר בית</Label>
            <Input
              id="number"
              value={formData.address?.number || ''}
              onChange={(e) => handleInputChange('address.number', e.target.value)}
              placeholder="הכנס מספר"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">עיר</Label>
            <Input
              id="city"
              value={formData.address?.city || ''}
              onChange={(e) => handleInputChange('address.city', e.target.value)}
              placeholder="הכנס עיר"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postal_code">מיקוד</Label>
            <Input
              id="postal_code"
              value={formData.address?.postal_code || ''}
              onChange={(e) => handleInputChange('address.postal_code', e.target.value)}
              placeholder="הכנס מיקוד"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="total_floors">מספר קומות</Label>
            <Input
              id="total_floors"
              type="number"
              value={formData.total_floors}
              onChange={(e) => handleInputChange('total_floors', e.target.value)}
              placeholder="הכנס מספר קומות"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="year_built">שנת בנייה</Label>
            <Input
              id="year_built"
              type="number"
              value={formData.year_built}
              onChange={(e) => handleInputChange('year_built', e.target.value)}
              placeholder="הכנס שנת בנייה"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="building_type">סוג בניין</Label>
            <Select
              value={formData.building_type}
              onValueChange={(value) => handleInputChange('building_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="residential">מגורים</SelectItem>
                <SelectItem value="commercial">מסחרי</SelectItem>
                <SelectItem value="mixed">מעורב</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="building_committee">ועד בית</Label>
          <Select
            value={formData.building_committee}
            onValueChange={(value) => handleInputChange('building_committee', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר ועד בית" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>ללא ועד בית</SelectItem>
              {buildingCommittees.map((committee) => (
                <SelectItem key={committee.id} value={committee.id}>
                  {committee.building_address} - {committee.contact_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>מתקנים בבניין</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
            {Object.entries(amenityLabels).map(([amenity, label]) => (
              <div key={amenity} className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id={`amenity-${amenity}`}
                  checked={formData.amenities?.includes(amenity) || false}
                  onCheckedChange={() => handleAmenityToggle(amenity)}
                />
                <Label
                  htmlFor={`amenity-${amenity}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>תמונות</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {formData.images?.map((url, index) => (
              <div key={index} className="relative">
                <img
                  src={url}
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
          <Label htmlFor="notes">הערות</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="הכנס הערות"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            ביטול
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            {building ? 'עדכן בניין' : 'צור בניין'}
          </Button>
        </div>
      </form>
    </Card>
  );
}