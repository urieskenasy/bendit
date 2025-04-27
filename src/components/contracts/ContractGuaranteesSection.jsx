import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

export default function ContractGuaranteesSection({ guarantees = [], onGuaranteeAdd, onGuaranteeUpdate, onGuaranteeRemove }) {
  const handleAdd = () => {
    onGuaranteeAdd({
      type: 'bank_guarantee',
      amount: '',
      expiry_date: '',
      status: 'active'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-lg font-semibold">ערבויות</Label>
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          הוסף ערבות
        </Button>
      </div>

      <div className="space-y-4">
        {guarantees.map((guarantee, index) => (
          <Card key={index} className="p-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>סוג ערבות</Label>
                <Select
                  value={guarantee.type}
                  onValueChange={(value) => onGuaranteeUpdate(index, { ...guarantee, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_guarantee">ערבות בנקאית</SelectItem>
                    <SelectItem value="deposit_check">צ'ק פיקדון</SelectItem>
                    <SelectItem value="cash_deposit">פיקדון מזומן</SelectItem>
                    <SelectItem value="promissory_note">שטר חוב</SelectItem>
                    <SelectItem value="guarantor">ערב</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>סכום</Label>
                <Input
                  type="number"
                  value={guarantee.amount || ''}
                  onChange={(e) => onGuaranteeUpdate(index, { ...guarantee, amount: parseFloat(e.target.value) })}
                />
              </div>

              <div>
                <Label>תוקף עד</Label>
                <Input
                  type="date"
                  value={guarantee.expiry_date || ''}
                  onChange={(e) => onGuaranteeUpdate(index, { ...guarantee, expiry_date: e.target.value })}
                />
              </div>

              <div>
                <Label>סטטוס</Label>
                <Select
                  value={guarantee.status}
                  onValueChange={(value) => onGuaranteeUpdate(index, { ...guarantee, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">פעיל</SelectItem>
                    <SelectItem value="expired">פג תוקף</SelectItem>
                    <SelectItem value="returned">הוחזר</SelectItem>
                    <SelectItem value="cancelled">בוטל</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {guarantee.type === 'bank_guarantee' && (
                <div className="md:col-span-2">
                  <Label>שם הבנק</Label>
                  <Input
                    value={guarantee.bank_name || ''}
                    onChange={(e) => onGuaranteeUpdate(index, { ...guarantee, bank_name: e.target.value })}
                  />
                </div>
              )}

              {guarantee.type === 'deposit_check' && (
                <div className="md:col-span-2">
                  <Label>מספר צ'ק</Label>
                  <Input
                    value={guarantee.check_number || ''}
                    onChange={(e) => onGuaranteeUpdate(index, { ...guarantee, check_number: e.target.value })}
                  />
                </div>
              )}

              {guarantee.type === 'guarantor' && (
                <div className="md:col-span-2 lg:col-span-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>שם הערב</Label>
                    <Input
                      value={guarantee.guarantor_details?.name || ''}
                      onChange={(e) => onGuaranteeUpdate(index, {
                        ...guarantee,
                        guarantor_details: { ...guarantee.guarantor_details, name: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label>ת.ז</Label>
                    <Input
                      value={guarantee.guarantor_details?.id_number || ''}
                      onChange={(e) => onGuaranteeUpdate(index, {
                        ...guarantee,
                        guarantor_details: { ...guarantee.guarantor_details, id_number: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label>טלפון</Label>
                    <Input
                      value={guarantee.guarantor_details?.phone || ''}
                      onChange={(e) => onGuaranteeUpdate(index, {
                        ...guarantee,
                        guarantor_details: { ...guarantee.guarantor_details, phone: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label>כתובת</Label>
                    <Input
                      value={guarantee.guarantor_details?.address || ''}
                      onChange={(e) => onGuaranteeUpdate(index, {
                        ...guarantee,
                        guarantor_details: { ...guarantee.guarantor_details, address: e.target.value }
                      })}
                    />
                  </div>
                </div>
              )}

              <div className="md:col-span-2 lg:col-span-4 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onGuaranteeRemove(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  הסר ערבות
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}