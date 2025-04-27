import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertTriangle, Users, Calendar, Home } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';

export default function ContractsWidget({ contracts, properties, tenants, buildings, selectedBuildingId, size }) {
  const [expiringContracts, setExpiringContracts] = useState([]);
  const [contractsStats, setContractsStats] = useState({
    total: 0,
    expiring30d: 0,
    expiring90d: 0,
    expired: 0
  });

  useEffect(() => {
    if (!contracts || !properties) return;

    let filteredContracts = [...contracts];
    
    // אם יש בניין נבחר, סנן רק חוזים ששייכים לנכסים בבניין זה
    if (selectedBuildingId && selectedBuildingId !== 'all') {
      // מצא נכסים בבניין הנבחר
      const buildingPropertyIds = properties
        .filter(p => p.building_id === selectedBuildingId)
        .map(p => p.id);
      
      // סנן חוזים רק לנכסים בבניין הנבחר
      filteredContracts = filteredContracts.filter(contract => 
        buildingPropertyIds.includes(contract.property_id)
      );
    }

    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);
    const ninetyDaysFromNow = addDays(today, 90);

    // חוזים מסתיימים בטווח של 90 יום
    const expiringContractsList = filteredContracts
      .filter(contract => {
        const endDate = new Date(contract.end_date);
        return contract.status === 'active' && 
               endDate > today && 
               endDate <= ninetyDaysFromNow;
      })
      .sort((a, b) => new Date(a.end_date) - new Date(b.end_date));

    // הוסף מידע נוסף לכל חוזה
    const enrichedContracts = expiringContractsList.map(contract => {
      const property = properties.find(p => p.id === contract.property_id);
      const tenant = tenants.find(t => t.id === contract.tenant_id);
      const building = property ? buildings.find(b => b.id === property.building_id) : null;
      const daysRemaining = differenceInDays(new Date(contract.end_date), today);
      
      return {
        ...contract,
        propertyInfo: property ? `${property.property_number}` : 'נכס לא ידוע',
        buildingInfo: building ? building.name : 'בניין לא ידוע',
        tenantName: tenant ? tenant.full_name : 'דייר לא ידוע',
        daysRemaining
      };
    });

    // סטטיסטיקות חוזים
    const stats = {
      total: filteredContracts.filter(c => c.status === 'active').length,
      expiring30d: filteredContracts.filter(c => {
        const endDate = new Date(c.end_date);
        return c.status === 'active' && endDate > today && endDate <= thirtyDaysFromNow;
      }).length,
      expiring90d: filteredContracts.filter(c => {
        const endDate = new Date(c.end_date);
        return c.status === 'active' && endDate > today && endDate <= ninetyDaysFromNow;
      }).length,
      expired: filteredContracts.filter(c => {
        const endDate = new Date(c.end_date);
        return c.status === 'active' && endDate <= today;
      }).length
    };

    setExpiringContracts(enrichedContracts);
    setContractsStats(stats);
  }, [contracts, properties, tenants, buildings, selectedBuildingId]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">חוזים מסתיימים</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500">חוזים פעילים</p>
            <p className="text-xl font-semibold">{contractsStats.total}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500">מסתיימים בחודש</p>
            <p className="text-xl font-semibold">{contractsStats.expiring30d}</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg">
            <p className="text-xs text-gray-500">מסתיימים ב-3 חודשים</p>
            <p className="text-xl font-semibold">{contractsStats.expiring90d}</p>
          </div>
          <div className="bg-gray-100 p-3 rounded-lg">
            <p className="text-xs text-gray-500">חוזים פגי תוקף</p>
            <p className="text-xl font-semibold">{contractsStats.expired}</p>
          </div>
        </div>
        
        {expiringContracts.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            אין חוזים מסתיימים בקרוב
          </div>
        ) : (
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {expiringContracts.map(contract => (
              <div 
                key={contract.id} 
                className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {contract.daysRemaining < 30 ? (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      ) : (
                        <FileText className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        <h3 className="font-medium text-sm">{contract.tenantName}</h3>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Home className="w-3 h-3" />
                        <span>{contract.buildingInfo} - {contract.propertyInfo}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-left">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>מסתיים ב-{format(new Date(contract.end_date), 'dd/MM/yyyy')}</span>
                    </div>
                    <Badge 
                      className={
                        contract.daysRemaining < 30 
                          ? "bg-red-100 text-red-800 mt-1" 
                          : "bg-amber-100 text-amber-800 mt-1"
                      }
                    >
                      {contract.daysRemaining < 30 
                        ? `${contract.daysRemaining} ימים` 
                        : `${Math.floor(contract.daysRemaining / 30)} חודשים`
                      }
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}