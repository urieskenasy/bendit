
import React from 'react';
import { Card } from '@/components/ui/card';
import { ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
import { format, parseISO, differenceInDays, isAfter, addDays } from 'date-fns';
import { Progress } from '@/components/ui/progress';

export default function GuaranteesWidget({ contracts = [], properties = [], tenants = [], size = 'medium' }) {
  const today = new Date();
  const in90Days = addDays(today, 90);

  const getPropertyDetails = (contract) => {
    const property = properties.find(p => p.id === contract.property_id);
    return property ? property.property_number : 'לא ידוע';
  };

  const getTenantDetails = (contract) => {
    const tenant = tenants.find(t => t.id === contract.tenant_id);
    return tenant ? tenant.full_name : 'לא ידוע';
  };
  
  // Get guarantees from contracts
  const guarantees = contracts
    .filter(c => c.status === 'active')
    .map(contract => ({
      id: contract.id,
      property_id: contract.property_id,
      tenant_id: contract.tenant_id,
      type: contract.guarantee_type || 'deposit',
      amount: contract.deposit_amount || 0,
      expiry_date: contract.end_date,
      status: 'active'
    }));
  
  // חישוב סטטיסטיקות
  const stats = {
    totalAmount: guarantees.reduce((sum, g) => sum + g.amount, 0),
    total: guarantees.length,
    expiringSoon: guarantees.filter(g => {
      if (!g.expiry_date) return false;
      const expiryDate = parseISO(g.expiry_date);
      return isAfter(expiryDate, today) && isAfter(in90Days, expiryDate);
    }).length
  };
  
  // מיון ערבויות לפי תאריך פקיעה
  const sortedGuarantees = [...guarantees]
    .sort((a, b) => {
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date) - new Date(b.expiry_date);
    })
    .slice(0, 5);
  
  const guaranteeTypeLabels = {
    bank_guarantee: 'ערבות בנקאית',
    deposit_check: "צ'ק פיקדון",
    cash_deposit: 'פיקדון במזומן',
    promissory_note: 'שטר חוב',
    guarantor: 'ערב',
    deposit: 'פיקדון',
    other: 'אחר'
  };
  
  return (
    <Card className="p-6 h-full">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="w-6 h-6 text-yellow-600" />
        <h2 className="text-xl font-semibold">ערבויות</h2>
      </div>

      <div className={`grid ${size === 'large' ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-700">₪{stats.totalAmount.toLocaleString()}</div>
          <div className="text-sm text-yellow-600">סך ערבויות</div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-700">{stats.expiringSoon}</div>
          <div className="text-sm text-orange-600">פוקעות בקרוב</div>
        </div>
        
        {size === 'large' && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
            <div className="text-sm text-blue-600">סך הכל פעילות</div>
          </div>
        )}
      </div>

      {size !== 'small' && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">ערבויות מסתיימות בקרוב</h3>
          
          <div className={size === 'xlarge' ? 'grid grid-cols-2 gap-4' : 'space-y-3'}>
            {sortedGuarantees.map(guarantee => {
              const contract = contracts.find(c => c.id === guarantee.id);
              const expiryDate = guarantee.expiry_date ? parseISO(guarantee.expiry_date) : null;
              const daysLeft = expiryDate ? differenceInDays(expiryDate, today) : null;
              const progress = daysLeft !== null ? Math.max(Math.min(Math.round((daysLeft / 90) * 100), 100), 0) : 100;
              
              let progressColor = 'bg-green-500';
              if (daysLeft !== null) {
                if (daysLeft < 0) progressColor = 'bg-red-500';
                else if (daysLeft < 30) progressColor = 'bg-red-500';
                else if (daysLeft < 60) progressColor = 'bg-yellow-500';
              }
              
              return (
                <div key={guarantee.id} className="bg-white rounded-lg border p-3 hover:shadow-sm transition-shadow">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        נכס: {getPropertyDetails(contract)}
                      </div>
                      <div className={`text-sm font-medium ${daysLeft < 30 ? 'text-red-500' : daysLeft < 60 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {daysLeft < 0 ? 'פג תוקף' : daysLeft === 0 ? 'היום' : `${daysLeft} ימים`}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      שוכר: {getTenantDetails(contract)}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span>{guaranteeTypeLabels[guarantee.type] || guarantee.type}</span>
                      <span>₪{guarantee.amount.toLocaleString()}</span>
                    </div>
                    
                    <div className="w-full">
                      <Progress value={progress} className={`h-1.5 ${progressColor}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
