import React, { useState, useEffect } from 'react';
import { Building, Property, Contract, Tenant } from '@/api/entities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { validateAndFixEntityRelationships } from '../utils/entitySync';
import { useToast } from "@/components/ui/use-toast";

export default function EntityRelationshipMapper() {
  const [isValidating, setIsValidating] = useState(false);
  const [entityCounts, setEntityCounts] = useState({
    buildings: 0,
    properties: 0,
    contracts: 0,
    tenants: 0
  });
  const [issues, setIssues] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    loadEntityCounts();
  }, []);

  const loadEntityCounts = async () => {
    try {
      const [buildings, properties, contracts, tenants] = await Promise.all([
        Building.list(),
        Property.list(),
        Contract.list(),
        Tenant.list()
      ]);

      setEntityCounts({
        buildings: buildings.length,
        properties: properties.length,
        contracts: contracts.length,
        tenants: tenants.length
      });

      // בדיקת בעיות בסיסיות
      const foundIssues = [];

      // בדיקת נכסים ללא בניין
      const propertiesWithoutBuilding = properties.filter(p => 
        !buildings.some(b => b.id === p.building_id)
      );
      if (propertiesWithoutBuilding.length > 0) {
        foundIssues.push({
          type: 'property_building',
          count: propertiesWithoutBuilding.length,
          message: `נמצאו ${propertiesWithoutBuilding.length} נכסים ללא בניין מקושר`
        });
      }

      // בדיקת חוזים ללא נכס
      const contractsWithoutProperty = contracts.filter(c => 
        !properties.some(p => p.id === c.property_id)
      );
      if (contractsWithoutProperty.length > 0) {
        foundIssues.push({
          type: 'contract_property',
          count: contractsWithoutProperty.length,
          message: `נמצאו ${contractsWithoutProperty.length} חוזים ללא נכס מקושר`
        });
      }

      setIssues(foundIssues);

    } catch (error) {
      console.error('Error loading entity counts:', error);
    }
  };

  const handleValidation = async () => {
    setIsValidating(true);
    try {
      await validateAndFixEntityRelationships();
      await loadEntityCounts();
      
      toast({
        title: "הסנכרון הושלם בהצלחה",
        description: "כל הקשרים בין הישויות עודכנו",
      });
    } catch (error) {
      console.error('Error during validation:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בסנכרון",
        description: "אירעה שגיאה בעת סנכרון הישויות"
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">מיפוי קשרים בין ישויות</h2>
        <Button 
          onClick={handleValidation} 
          disabled={isValidating}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
          סנכרון ישויות
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">בניינים</div>
          <div className="text-2xl font-bold">{entityCounts.buildings}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">נכסים</div>
          <div className="text-2xl font-bold">{entityCounts.properties}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">חוזים</div>
          <div className="text-2xl font-bold">{entityCounts.contracts}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">דיירים</div>
          <div className="text-2xl font-bold">{entityCounts.tenants}</div>
        </Card>
      </div>

      {issues.length > 0 ? (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold">נמצאו בעיות בקשרים</h3>
          </div>
          <ul className="space-y-2">
            {issues.map((issue, index) => (
              <li key={index} className="flex items-center gap-2 text-amber-700">
                <span>•</span>
                {issue.message}
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-center gap-2 text-green-700">
            <Check className="w-5 h-5" />
            <span>כל הקשרים בין הישויות תקינים</span>
          </div>
        </Card>
      )}
    </div>
  );
}