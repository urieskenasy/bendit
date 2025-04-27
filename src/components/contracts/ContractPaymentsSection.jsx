import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Calendar, CreditCard, Receipt } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export default function ContractPaymentsSection({ 
  additionalPayments = [], 
  onPaymentsChange,
  depositAmount = '',
  onDepositAmountChange,
  depositMethod = 'bank_transfer',
  onDepositMethodChange,
  indexationType = 'none',
  onIndexationTypeChange,
  baseIndex = '',
  onBaseIndexChange,
  indexationFrequency = 'yearly',
  onIndexationFrequencyChange,
  automaticPayments = false,
  onAutomaticPaymentsChange,
  generationDay = 1,
  onGenerationDayChange,
  reminderDays = 7,
  onReminderDaysChange
}) {
  const handleAddPayment = () => {
    onPaymentsChange([
      ...additionalPayments,
      {
        type: 'committee',
        amount: '',
        frequency: 'monthly',
        included_in_rent: false
      }
    ]);
  };

  const handleUpdatePayment = (index, field, value) => {
    const updated = [...additionalPayments];
    updated[index][field] = value;
    onPaymentsChange(updated);
  };

  const handleRemovePayment = (index) => {
    onPaymentsChange(additionalPayments.filter((_, i) => i !== index));
  };

  const getPaymentTypeLabel = (type) => {
    const types = {
      'committee': 'ועד בית',
      'water': 'מים',
      'electricity': 'חשמל',
      'gas': 'גז',
      'internet': 'אינטרנט',
      'tv': 'טלוויזיה',
      'property_tax': 'ארנונה',
      'other': 'אחר'
    };
    return types[type] || type;
  };

  const getFrequencyLabel = (frequency) => {
    const frequencies = {
      'monthly': 'חודשי',
      'bi_monthly': 'דו-חודשי',
      'quarterly': 'רבעוני',
      'yearly': 'שנתי'
    };
    return frequencies[frequency] || frequency;
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">פיקדון</h3>
          <div className="space-y-4">
            <div>
              <Label>סכום פיקדון</Label>
              <Input
                type="number"
                value={depositAmount}
                onChange={(e) => onDepositAmountChange(e.target.value)}
              />
            </div>
            <div>
              <Label>אמצעי תשלום</Label>
              <Select value={depositMethod} onValueChange={onDepositMethodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">העברה בנקאית</SelectItem>
                  <SelectItem value="check">צ'ק</SelectItem>
                  <SelectItem value="cash">מזומן</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">הצמדה</h3>
          <div className="space-y-4">
            <div>
              <Label>סוג הצמדה</Label>
              <Select value={indexationType} onValueChange={onIndexationTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא הצמדה</SelectItem>
                  <SelectItem value="consumer_price_index">מדד המחירים לצרכן</SelectItem>
                  <SelectItem value="usd">דולר אמריקאי</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {indexationType !== 'none' && (
              <>
                <div>
                  <Label>מדד בסיס</Label>
                  <Input
                    type="number"
                    value={baseIndex}
                    onChange={(e) => onBaseIndexChange(e.target.value)}
                  />
                </div>
                <div>
                  <Label>תדירות עדכון</Label>
                  <Select value={indexationFrequency} onValueChange={onIndexationFrequencyChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">חודשי</SelectItem>
                      <SelectItem value="quarterly">רבעוני</SelectItem>
                      <SelectItem value="yearly">שנתי</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label className="text-lg font-semibold">תשלומים נוספים</Label>
          <Button
            type="button"
            variant="outline"
            onClick={handleAddPayment}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            הוסף תשלום
          </Button>
        </div>

        {additionalPayments.map((payment, index) => (
          <Card key={index} className="p-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label>סוג תשלום</Label>
                <Select
                  value={payment.type}
                  onValueChange={(value) => handleUpdatePayment(index, 'type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="committee">ועד בית</SelectItem>
                    <SelectItem value="water">מים</SelectItem>
                    <SelectItem value="electricity">חשמל</SelectItem>
                    <SelectItem value="gas">גז</SelectItem>
                    <SelectItem value="internet">אינטרנט</SelectItem>
                    <SelectItem value="tv">טלוויזיה</SelectItem>
                    <SelectItem value="property_tax">ארנונה</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>סכום</Label>
                <Input
                  type="number"
                  value={payment.amount}
                  onChange={(e) => handleUpdatePayment(index, 'amount', parseFloat(e.target.value))}
                />
              </div>

              <div>
                <Label>תדירות</Label>
                <Select
                  value={payment.frequency}
                  onValueChange={(value) => handleUpdatePayment(index, 'frequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">חודשי</SelectItem>
                    <SelectItem value="bi_monthly">דו-חודשי</SelectItem>
                    <SelectItem value="quarterly">רבעוני</SelectItem>
                    <SelectItem value="yearly">שנתי</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    checked={payment.included_in_rent}
                    onCheckedChange={(checked) => handleUpdatePayment(index, 'included_in_rent', checked)}
                    id={`included-${index}`}
                  />
                  <Label htmlFor={`included-${index}`}>כלול בשכ"ד</Label>
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleRemovePayment(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            יצירת תשלומים אוטומטית
          </h3>
          <Switch
            checked={automaticPayments}
            onCheckedChange={onAutomaticPaymentsChange}
          />
        </div>

        {automaticPayments && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>יום בחודש ליצירת תשלומים</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={generationDay}
                onChange={(e) => onGenerationDayChange(e.target.value)}
              />
            </div>
            <div>
              <Label>ימים לפני לשליחת תזכורת</Label>
              <Input
                type="number"
                min="1"
                value={reminderDays}
                onChange={(e) => onReminderDaysChange(e.target.value)}
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}