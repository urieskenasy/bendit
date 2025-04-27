import React, { useState, useEffect } from 'react';
import { Property, Building, Owner, Tenant } from '@/api/entities';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Search, FileText, Download } from 'lucide-react';
import ReportBase from './ReportBase';
import { useReportData } from './ReportContext';

export default function PropertyReport() {
  const [properties, setProperties] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [owners, setOwners] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { isLoading, setIsLoading, updateLastUpdate } = useReportData();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load data with small delays to avoid rate limiting
      const buildingsData = await Building.list();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const propertiesData = await Property.list();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const ownersData = await Owner.list();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const tenantsData = await Tenant.list();
      
      setBuildings(buildingsData);
      setProperties(propertiesData);
      setOwners(ownersData);
      setTenants(tenantsData);
      
      updateLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProperties = properties.filter(property => {
    // Filter by search term
    const matchesSearch = 
      property.property_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by building
    const matchesBuilding = 
      buildingFilter === 'all' || property.building_id === buildingFilter;
    
    // Filter by status
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'rented' && property.rental_details?.status === 'rented') ||
      (statusFilter === 'available' && property.rental_details?.status === 'available');
    
    return matchesSearch && matchesBuilding && matchesStatus;
  });

  const getBuildingName = (buildingId) => {
    const building = buildings.find(b => b.id === buildingId);
    return building ? building.name : 'לא ידוע';
  };

  const getOwnerNames = (property) => {
    if (!property.owners || property.owners.length === 0) return 'אין בעלים';
    
    return property.owners.map(ownerRef => {
      const owner = owners.find(o => o.id === ownerRef.owner_id);
      return owner ? owner.full_name : 'בעלים לא ידוע';
    }).join(', ');
  };

  const getTenantName = (propertyId) => {
    const tenant = tenants.find(
      t => t.property_id === propertyId && t.status === 'active'
    );
    return tenant ? tenant.full_name : 'אין דייר';
  };

  // Filter components for the report
  const filterControls = (
    <div className="flex flex-wrap gap-4">
      <div className="relative flex-grow md:flex-grow-0 max-w-md">
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="חיפוש לפי מספר נכס..."
          className="pr-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <Select
        value={buildingFilter}
        onValueChange={setBuildingFilter}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="בחר בניין" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">כל הבניינים</SelectItem>
          {buildings.map(building => (
            <SelectItem key={building.id} value={building.id}>
              {building.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select
        value={statusFilter}
        onValueChange={setStatusFilter}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="בחר סטטוס" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">כל הסטטוסים</SelectItem>
          <SelectItem value="rented">מושכרים</SelectItem>
          <SelectItem value="available">פנויים</SelectItem>
        </SelectContent>
      </Select>
      
      <Button variant="outline" className="ml-auto">
        <FileText className="w-4 h-4 mr-2" />
        ייצוא לאקסל
      </Button>
    </div>
  );

  return (
    <ReportBase
      title="דוח נכסים"
      filters={filterControls}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="p-3 text-right">מספר נכס</th>
              <th className="p-3 text-right">בניין</th>
              <th className="p-3 text-right">סוג נכס</th>
              <th className="p-3 text-right">בעלים</th>
              <th className="p-3 text-right">דייר נוכחי</th>
              <th className="p-3 text-right">סטטוס</th>
              <th className="p-3 text-right">שכ״ד חודשי</th>
              <th className="p-3 text-right">שטח (מ״ר)</th>
            </tr>
          </thead>
          <tbody>
            {filteredProperties.map(property => (
              <tr key={property.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="p-3">{property.property_number}</td>
                <td className="p-3">{getBuildingName(property.building_id)}</td>
                <td className="p-3">
                  {property.type === 'apartment' && 'דירה'}
                  {property.type === 'office' && 'משרד'}
                  {property.type === 'store' && 'חנות'}
                  {property.type === 'warehouse' && 'מחסן'}
                  {property.type === 'parking' && 'חניה'}
                  {property.type === 'storage' && 'מחסן'}
                </td>
                <td className="p-3">{getOwnerNames(property)}</td>
                <td className="p-3">{getTenantName(property.id)}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    property.rental_details?.status === 'rented' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {property.rental_details?.status === 'rented' ? 'מושכר' : 'פנוי'}
                  </span>
                </td>
                <td className="p-3 text-left">
                  {property.rental_details?.monthly_rent 
                    ? `₪${property.rental_details.monthly_rent.toLocaleString()}`
                    : '-'}
                </td>
                <td className="p-3 text-left">
                  {property.measurements?.total_sqm || '-'}
                </td>
              </tr>
            ))}
            
            {filteredProperties.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
                  לא נמצאו נכסים התואמים את החיפוש
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ReportBase>
  );
}