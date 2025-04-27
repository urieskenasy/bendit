import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Home, Users, Percent } from 'lucide-react';

export default function PropertyStatsWidget({ properties, contracts, buildings, tenants, selectedBuildingId, size }) {
  const [stats, setStats] = useState({
    propertyCount: 0,
    buildingCount: 0,
    occupancyRate: 0,
    rentedPropertyCount: 0,
    vacantPropertyCount: 0,
    tenantCount: 0
  });

  useEffect(() => {
    calculateStats();
  }, [properties, buildings, contracts, tenants, selectedBuildingId]);

  const calculateStats = () => {
    if (!properties || !buildings) return;

    // בדיקה אם נבחר בניין ספציפי
    const filteredBuildings = selectedBuildingId === 'all' ? 
      buildings : 
      buildings.filter(building => building.id === selectedBuildingId);
    
    const filteredProperties = selectedBuildingId === 'all' ? 
      properties : 
      properties.filter(property => property.building_id === selectedBuildingId);
    
    const rentedProperties = filteredProperties.filter(property => 
      property.rental_details && property.rental_details.status === 'rented'
    );
    
    const vacantProperties = filteredProperties.filter(property => 
      !property.rental_details || property.rental_details.status === 'available'
    );
    
    // דיירים פעילים שיש להם נכס מהנכסים המסוננים
    const filteredTenants = tenants.filter(tenant => 
      tenant.status === 'active' && 
      tenant.property_id && 
      filteredProperties.some(p => p.id === tenant.property_id)
    );

    const occupancyRate = filteredProperties.length > 0 ? 
      (rentedProperties.length / filteredProperties.length) * 100 : 0;

    setStats({
      propertyCount: filteredProperties.length,
      buildingCount: filteredBuildings.length,
      occupancyRate: occupancyRate.toFixed(1),
      rentedPropertyCount: rentedProperties.length,
      vacantPropertyCount: vacantProperties.length,
      tenantCount: filteredTenants.length
    });
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">סטטיסטיקות נכסים</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`grid ${size === 'small' ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'} gap-4`}>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">בניינים</p>
                <p className="text-2xl font-semibold">{stats.buildingCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Home className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">נכסים</p>
                <p className="text-2xl font-semibold">{stats.propertyCount}</p>
                <div className="flex gap-2 text-xs mt-1">
                  <span className="text-green-600">{stats.rentedPropertyCount} מושכרים</span>
                  <span className="text-gray-500">/</span>
                  <span className="text-red-600">{stats.vacantPropertyCount} פנויים</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-full">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">דיירים פעילים</p>
                <p className="text-2xl font-semibold">{stats.tenantCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-full">
                <Percent className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">תפוסה</p>
                <p className="text-2xl font-semibold">{stats.occupancyRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}