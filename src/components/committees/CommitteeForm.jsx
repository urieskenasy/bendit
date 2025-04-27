import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function CommitteeForm({ committee, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(committee || {
    building_address: '',
    contact_name: '',
    phone: '',
    email: '',
    monthly_fee: '',
    bank_details: {
      bank_name: '',
      branch: '',
      account_number: ''
    },
    notes: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBankInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      bank_details: {
        ...prev.bank_details,
        [field]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Convert numeric fields
    const dataToSubmit = {
      ...formData,
      monthly_fee: formData.monthly_fee ? parseFloat(formData.monthly_fee) : null
    };
    onSubmit(dataToSubmit);
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-6">{committee ? 'עריכת ועד בית' : 'ועד בית חדש'}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="building_address">כתובת הבניין</Label>
            <Input
              id="building_address"
              value={formData.building_address}
              onChange={(e) => handleInputChange('building_address', e.target.value)}
              placeholder="הכנס כתובת"
            />
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
            <Label htmlFor="monthly_fee">דמי ועד חודשיים</Label>
            <Input
              id="monthly_fee"
              type="number"
              value={formData.monthly_fee || ''}
              onChange={(e) => handleInputChange('monthly_fee', e.target.value)}
              placeholder="הכנס סכום"
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <h3 className="text-lg font-medium mb-3">פרטי חשבון בנק</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">שם הבנק</Label>
              <Input
                id="bank_name"
                value={formData.bank_details?.bank_name || ''}
                onChange={(e) => handleBankInputChange('bank_name', e.target.value)}
                placeholder="הכנס שם בנק"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">מספר סניף</Label>
              <Input
                id="branch"
                value={formData.bank_details?.branch || ''}
                onChange={(e) => handleBankInputChange('branch', e.target.value)}
                placeholder="הכנס מספר סניף"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">מספר חשבון</Label>
              <Input
                id="account_number"
                value={formData.bank_details?.account_number || ''}
                onChange={(e) => handleBankInputChange('account_number', e.target.value)}
                placeholder="הכנס מספר חשבון"
              />
            </div>
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
            {committee ? 'עדכן ועד בית' : 'צור ועד בית'}
          </Button>
        </div>
      </form>
    </Card>
  );
}