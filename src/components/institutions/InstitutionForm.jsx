import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadFile } from '@/api/integrations';
import { X, Upload, FileText } from 'lucide-react';

export default function InstitutionForm({ institution, onSubmit, onCancel }) {
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState(institution || {
    name: '',
    type: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    account_number: '',
    documents: [],
    notes: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      const newDocument = {
        title: file.name,
        url: file_url,
        date: new Date().toISOString().split('T')[0]
      };
      
      setFormData(prev => ({
        ...prev,
        documents: [...(prev.documents || []), newDocument]
      }));
    } catch (error) {
      console.error('Error uploading document:', error);
    }
    setIsUploading(false);
  };

  const removeDocument = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      documents: (prev.documents || []).filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-6">{institution ? 'עריכת מוסד' : 'מוסד חדש'}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">שם המוסד</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="הכנס שם"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">סוג מוסד</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleInputChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג מוסד" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="municipality">רשות מקומית</SelectItem>
                <SelectItem value="tax_authority">רשות המיסים</SelectItem>
                <SelectItem value="electric_company">חברת חשמל</SelectItem>
                <SelectItem value="water_company">חברת מים</SelectItem>
                <SelectItem value="ministry_of_housing">משרד השיכון</SelectItem>
                <SelectItem value="other">אחר</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_name">איש קשר</Label>
            <Input
              id="contact_name"
              value={formData.contact_name}
              onChange={(e) => handleInputChange('contact_name', e.target.value)}
              placeholder="הכנס שם איש קשר"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">טלפון</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="הכנס מספר טלפון"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">דואר אלקטרוני</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="הכנס דואר אלקטרוני"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">כתובת</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="הכנס כתובת"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_number">מספר לקוח/חשבון</Label>
            <Input
              id="account_number"
              value={formData.account_number}
              onChange={(e) => handleInputChange('account_number', e.target.value)}
              placeholder="הכנס מספר חשבון"
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <h3 className="text-lg font-medium mb-3">מסמכים</h3>
          <div className="grid grid-cols-1 gap-4">
            {(formData.documents || []).map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-gray-500">הועלה בתאריך: {doc.date}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(doc.url, '_blank')}
                  >
                    צפייה
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDocument(index)}
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}

            <label className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
              <input
                type="file"
                className="hidden"
                onChange={handleDocumentUpload}
                disabled={isUploading}
              />
              <Upload className="w-6 h-6 mb-2 text-gray-400" />
              <span className="text-sm text-gray-500">
                {isUploading ? 'מעלה...' : 'העלה מסמך'}
              </span>
            </label>
          </div>
        </div>

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
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            {institution ? 'עדכן מוסד' : 'צור מוסד'}
          </Button>
        </div>
      </form>
    </Card>
  );
}