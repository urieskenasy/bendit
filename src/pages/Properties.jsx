
import React, { useState, useEffect } from 'react';
import { Property, Building, Tenant, Owner, Supplier, Contract } from '@/api/entities';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building2, Plus, Search, Filter, ChevronRight, Edit } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import PropertyList from '../components/properties/PropertyList';
import PropertyForm from '../components/properties/PropertyForm';
import BuildingForm from '../components/buildings/BuildingForm';
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import syncAllFromContract from '../components/utils/entitySync';

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [owners, setOwners] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // פרמטרים מה-URL
  const urlParams = new URLSearchParams(window.location.search);
  const buildingFromUrl = urlParams.get('building');

  useEffect(() => {
    loadData();
  }, []);
  
  useEffect(() => {
    // אם יש מזהה בניין ב-URL, בחר אותו
    if (buildingFromUrl && buildings.length > 0) {
      setSelectedBuilding(buildingFromUrl);
    }
  }, [buildingFromUrl, buildings]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load data sequentially with delays to avoid rate limits
      const buildingsData = await Building.list();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const propertiesData = await Property.list();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const tenantsData = await Tenant.list();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const ownersData = await Owner.list();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const suppliersData = await Supplier.list();
      
    // וודא שכל נכס מכיל מידע על rental_details
    const updatedProperties = propertiesData.map(property => ({
      ...property,
      rental_details: property.rental_details || {
        status: 'available',
        monthly_rent: 0
      }
    }));
    
    setProperties(updatedProperties);
    setBuildings(buildingsData);
    setTenants(tenantsData);
    setOwners(ownersData);
    setSuppliers(suppliersData);
  } catch (error) {
    console.error('Error loading data:', error);
    
    // Show more specific error message based on the error type
    let errorMessage = "אירעה שגיאה בטעינת נתונים";
    if (error.response?.status === 429) {
      errorMessage = "נא להמתין מספר שניות ולנסות שוב";
    }
    
    toast({
      variant: "destructive",
      title: "שגיאה בטעינת נתונים",
      description: errorMessage,
    });
  } finally {
    setIsLoading(false);
  }
};

  const handlePropertySubmit = async (propertyData) => {
    try {
      let savedProperty;
      
      if (selectedProperty) {
        savedProperty = await Property.update(selectedProperty.id, propertyData);
      } else {
        savedProperty = await Property.create(propertyData);
      }
      
      // נסה לסנכרן חוזים ודיירים הקשורים לנכס
      try {
        const allContracts = await Contract.list();
        const propertyContracts = allContracts.filter(c => c.property_id === savedProperty.id);
        
        // עדכן כל חוזה באמצעות פונקציית הסנכרון
        for (const contract of propertyContracts) {
          await syncAllFromContract(contract);
        }
        
        console.log(`Synchronized ${propertyContracts.length} contracts for property ${savedProperty.id}`);
      } catch (syncError) {
        console.error("Error synchronizing contracts from property:", syncError);
      }
      
      setShowPropertyForm(false);
      setSelectedProperty(null);
      loadData();
      
      toast({
        title: selectedProperty ? "הנכס עודכן בהצלחה" : "הנכס נוסף בהצלחה",
        description: "פרטי הנכס עודכנו במערכת"
      });
    } catch (error) {
      console.error('Error saving property:', error);
      toast({
        variant: "destructive", 
        title: "שגיאה בשמירת הנכס",
        description: error.message || "אירעה שגיאה בעת שמירת הנכס"
      });
    }
  };

  const handleBuildingSubmit = async (buildingData) => {
    const newBuilding = await Building.create(buildingData);
    setShowBuildingForm(false);
    loadData();
    
    // אופציונלי: לאחר יצירת הבניין, בחר אותו באופן אוטומטי
    if (newBuilding && newBuilding.id) {
      setSelectedBuilding(newBuilding.id);
    }
  };

  const handleEdit = (property) => {
    setSelectedProperty(property);
    setShowPropertyForm(true);
  };

  const handleDelete = async (propertyId) => {
    try {
      await Property.delete(propertyId);
      loadData();
      toast({
        title: "הנכס נמחק בהצלחה",
        description: "הנכס הוסר מהמערכת",
      });
    } catch (error) {
      console.error('Error deleting property:', error);
      toast({
        variant: "destructive",
        title: "שגיאה במחיקת הנכס",
        description: "אירעה שגיאה בעת מחיקת הנכס",
      });
    }
  };

  const getBuildingName = (buildingId) => {
    const building = buildings.find(b => b.id === buildingId);
    return building ? building.name : 'לא ידוע';
  };

  const getFilteredProperties = () => {
    return properties.filter(property => {
      const matchesSearch = 
        property.property_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getBuildingName(property.building_id).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBuilding = selectedBuilding === 'all' || property.building_id === selectedBuilding;
      
      return matchesSearch && matchesBuilding;
    });
  };

  const propertyTypeLabels = {
    apartment: 'דירה',
    office: 'משרד',
    store: 'חנות',
    warehouse: 'מחסן',
    parking: 'חניה',
    storage: 'מחסן'
  };

  // מחשב את מספר הנכסים לפי בניין
  const getPropertyCountByBuilding = (buildingId) => {
    return properties.filter(property => property.building_id === buildingId).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          ניהול נכסים
        </h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowBuildingForm(true)} variant="outline" className="bg-white hover:bg-gray-50">
            <Plus className="w-4 h-4 ml-2" />
            בניין חדש
          </Button>
          <Button onClick={() => setShowPropertyForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 ml-2" />
            נכס חדש
          </Button>
        </div>
      </div>

      {/* כרטיסיות לבניינים */}
      {isLoading ? (
        <Card className="p-4">
          <Skeleton className="h-10 w-full rounded-md" />
        </Card>
      ) : (
        <Card className="p-4">
          <Tabs 
            value={selectedBuilding} 
            onValueChange={setSelectedBuilding}
            className="w-full overflow-auto"
          >
            <TabsList className="inline-flex w-full mb-4 overflow-x-auto">
              <TabsTrigger value="all" className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                כל הבניינים
                <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 ml-1">
                  {properties.length}
                </span>
              </TabsTrigger>
              
              {buildings.map(building => (
                <TabsTrigger 
                  key={building.id} 
                  value={building.id}
                  className="flex items-center gap-1 min-w-fit"
                >
                  <Building2 className="w-4 h-4" />
                  {building.name}
                  <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 ml-1">
                    {getPropertyCountByBuilding(building.id)}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="relative mt-4">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="חיפוש לפי מספר נכס או בניין..."
              className="pr-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* הצגת פרטי הבניין הנבחר */}
          {selectedBuilding !== 'all' && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              {(() => {
                const building = buildings.find(b => b.id === selectedBuilding);
                if (!building) return null;
                
                return (
                  <div className="flex flex-col md:flex-row justify-between">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        {building.name}
                      </h3>
                      <p className="text-gray-600">
                        {building.address?.street} {building.address?.number}, {building.address?.city}
                      </p>
                      <div className="flex gap-3 mt-2">
                        <span className="text-sm bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">
                          {building.building_type === 'residential' && 'מגורים'}
                          {building.building_type === 'commercial' && 'מסחרי'}
                          {building.building_type === 'mixed' && 'מעורב'}
                        </span>
                        {building.details?.total_floors && (
                          <span className="text-sm bg-gray-100 text-gray-800 rounded-full px-2 py-0.5">
                            {building.details.total_floors} קומות
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0 flex gap-2">
                      <Button asChild variant="outline">
                        <Link to={createPageUrl(`BuildingEdit?id=${building.id}`)}>
                          <Edit className="w-4 h-4 ml-1" />
                          עריכה
                        </Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link to={createPageUrl(`BuildingView?id=${building.id}`)}>
                          <ChevronRight className="w-4 h-4 ml-1" />
                          צפייה בפרטי הבניין
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </Card>
      )}

      {/* טופס יצירה/עריכה של נכס */}
      {showPropertyForm && (
        <PropertyForm
          property={selectedProperty}
          buildings={buildings}
          owners={owners}
          suppliers={suppliers}
          onSubmit={handlePropertySubmit}
          onCancel={() => {
            setShowPropertyForm(false);
            setSelectedProperty(null);
          }}
          onNewBuilding={() => {
            setShowPropertyForm(false);
            setShowBuildingForm(true);
          }}
          preselectedBuilding={selectedBuilding !== 'all' ? selectedBuilding : null}
        />
      )}

      {/* טופס יצירה של בניין חדש */}
      {showBuildingForm && (
        <BuildingForm
          building={null}
          buildingCommittees={[]}
          onSubmit={handleBuildingSubmit}
          onCancel={() => {
            setShowBuildingForm(false);
          }}
        />
      )}

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="p-5">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-20 w-full mb-4" />
              <Skeleton className="h-4 w-1/4" />
            </Card>
          ))}
        </div>
      ) : (
        <PropertyList
          properties={getFilteredProperties()}
          buildings={buildings}
          tenants={tenants}
          onEdit={handleEdit}
          onDelete={handleDelete}
          propertyTypeLabels={propertyTypeLabels}
        />
      )}
    </div>
  );
}
