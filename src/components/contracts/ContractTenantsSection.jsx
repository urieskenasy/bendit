import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Trash2, UserPlus, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tenant } from '@/api/entities';
import { useToast } from "@/components/ui/use-toast";

export default function ContractTenantsSection({ tenants, selectedTenants, onTenantsChange }) {
  const { toast } = useToast();
  const [showNewTenantDialog, setShowNewTenantDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTenant, setNewTenant] = useState({
    full_name: '',
    id_number: '',
    phone: '',
    email: '',
    tenant_type: 'private',
    status: 'active'
  });

  const handleAddExistingTenant = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;

    // בדוק אם הדייר כבר קיים ברשימה
    if (selectedTenants.some(t => t.tenant_id === tenantId)) {
      toast({
        variant: "destructive",
        title: "דייר כבר קיים",
        description: "דייר זה כבר נוסף לחוזה"
      });
      return;
    }

    onTenantsChange([
      ...selectedTenants,
      {
        tenant_id: tenantId,
        share_percentage: 100 / (selectedTenants.length + 1),
        is_primary: selectedTenants.length === 0
      }
    ]);

    // עדכן את אחוזי השותפות של כל הדיירים
    const newSharePercentage = 100 / (selectedTenants.length + 1);
    const updatedTenants = selectedTenants.map(t => ({
      ...t,
      share_percentage: newSharePercentage
    }));
    onTenantsChange([...updatedTenants, {
      tenant_id: tenantId,
      share_percentage: newSharePercentage,
      is_primary: selectedTenants.length === 0
    }]);
  };

  const handleCreateNewTenant = async () => {
    setIsSubmitting(true);
    try {
      // וודא שכל השדות הנדרשים מולאו
      if (!newTenant.full_name || !newTenant.id_number) {
        throw new Error('יש למלא שם מלא ומספר זהות');
      }

      // צור דייר חדש
      const createdTenant = await Tenant.create(newTenant);

      // הוסף את הדייר החדש לחוזה
      handleAddExistingTenant(createdTenant.id);

      setShowNewTenantDialog(false);
      setNewTenant({
        full_name: '',
        id_number: '',
        phone: '',
        email: '',
        tenant_type: 'private',
        status: 'active'
      });

      toast({
        title: "דייר נוצר בהצלחה",
        description: "הדייר החדש נוסף לחוזה"
      });
    } catch (error) {
      console.error('Error creating tenant:', error);
      toast({
        variant: "destructive",
        title: "שגיאה ביצירת דייר",
        description: error.message || "אירעה שגיאה ביצירת הדייר החדש"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSharePercentage = (tenantId, newPercentage) => {
    const updatedTenants = selectedTenants.map(t => 
      t.tenant_id === tenantId ? { ...t, share_percentage: parseFloat(newPercentage) } : t
    );
    onTenantsChange(updatedTenants);
  };

  const handleRemoveTenant = (tenantId) => {
    const updatedTenants = selectedTenants.filter(t => t.tenant_id !== tenantId);
    // עדכן את אחוזי השותפות
    if (updatedTenants.length > 0) {
      const newSharePercentage = 100 / updatedTenants.length;
      updatedTenants.forEach(t => t.share_percentage = newSharePercentage);
    }
    onTenantsChange(updatedTenants);
  };

  const handleSetPrimaryTenant = (tenantId) => {
    const updatedTenants = selectedTenants.map(t => ({
      ...t,
      is_primary: t.tenant_id === tenantId
    }));
    onTenantsChange(updatedTenants);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-lg font-semibold">דיירים בחוזה</Label>
        <div className="flex gap-2">
          <Select onValueChange={handleAddExistingTenant}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="בחר דייר קיים" />
            </SelectTrigger>
            <SelectContent>
              {tenants
                .filter(t => !selectedTenants.some(st => st.tenant_id === t.id))
                .map(tenant => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.full_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Dialog open={showNewTenantDialog} onOpenChange={setShowNewTenantDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                דייר חדש
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>הוספת דייר חדש</DialogTitle>
                <DialogDescription>
                  מלא את פרטי הדייר החדש
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label>שם מלא</Label>
                  <Input
                    value={newTenant.full_name}
                    onChange={(e) => setNewTenant({ ...newTenant, full_name: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>מספר זהות</Label>
                  <Input
                    value={newTenant.id_number}
                    onChange={(e) => setNewTenant({ ...newTenant, id_number: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>טלפון</Label>
                  <Input
                    value={newTenant.phone}
                    onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>דוא"ל</Label>
                  <Input
                    type="email"
                    value={newTenant.email}
                    onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>סוג דייר</Label>
                  <Select
                    value={newTenant.tenant_type}
                    onValueChange={(value) => setNewTenant({ ...newTenant, tenant_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">פרטי</SelectItem>
                      <SelectItem value="commercial">עסקי</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewTenantDialog(false)}
                >
                  ביטול
                </Button>
                <Button 
                  onClick={handleCreateNewTenant}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'יוצר דייר...' : 'צור דייר'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {selectedTenants.map((tenant, index) => {
          const tenantData = tenants.find(t => t.id === tenant.tenant_id);
          if (!tenantData) return null;

          return (
            <Card key={tenant.tenant_id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">{tenantData.full_name}</div>
                    <div className="text-sm text-gray-500">{tenantData.id_number}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      className="w-20"
                      value={tenant.share_percentage}
                      onChange={(e) => handleUpdateSharePercentage(tenant.tenant_id, e.target.value)}
                    />
                    <span>%</span>
                  </div>
                  
                  <Button
                    variant={tenant.is_primary ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSetPrimaryTenant(tenant.tenant_id)}
                  >
                    {tenant.is_primary ? 'דייר ראשי' : 'הפוך לראשי'}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleRemoveTenant(tenant.tenant_id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {selectedTenants.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            לא נבחרו דיירים
          </div>
        )}
      </div>
    </div>
  );
}