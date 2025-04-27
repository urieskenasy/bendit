import React, { useState, useEffect } from 'react';
import { Supplier, Building } from '@/api/entities';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Truck, Plus, Search, Building2, Filter } from 'lucide-react';
import SupplierList from '../components/suppliers/SupplierList';
import SupplierForm from '../components/suppliers/SupplierForm';
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState('all');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // פרמטרים מה-URL
  const urlParams = new URLSearchParams(window.location.search);
  const supplierIdFromUrl = urlParams.get('id');
  const buildingFromUrl = urlParams.get('building');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // פתיחת פרטי ספק אם התקבל מזהה מה-URL
    if (supplierIdFromUrl && suppliers.length > 0) {
      const supplier = suppliers.find(s => s.id === supplierIdFromUrl);
      if (supplier) {
        handleEdit(supplier);
      }
    }
    
    // בחירת בניין אם התקבל מזהה מה-URL
    if (buildingFromUrl && buildings.length > 0) {
      setSelectedBuilding(buildingFromUrl);
    }
  }, [supplierIdFromUrl, buildingFromUrl, suppliers, buildings]);

  const loadData = async () => {
    try {
      const [suppliersData, buildingsData] = await Promise.all([
        Supplier.list(),
        Building.list()
      ]);
      setSuppliers(suppliersData);
      setBuildings(buildingsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בטעינת נתונים",
        description: "אירעה שגיאה בטעינת נתוני הספקים",
      });
    }
  };

  const handleSubmit = async (supplierData) => {
    try {
      if (selectedSupplier) {
        await Supplier.update(selectedSupplier.id, supplierData);
        toast({
          title: "הספק עודכן בהצלחה",
          description: "פרטי הספק עודכנו במערכת",
        });
      } else {
        await Supplier.create(supplierData);
        toast({
          title: "הספק נוצר בהצלחה",
          description: "הספק החדש נוסף למערכת",
        });
      }
      setShowForm(false);
      setSelectedSupplier(null);
      loadData();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בשמירת הספק",
        description: "אירעה שגיאה בעת שמירת נתוני הספק",
      });
    }
  };

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setShowForm(true);
  };

  const handleDelete = async (supplierId) => {
    try {
      await Supplier.delete(supplierId);
      loadData();
      toast({
        title: "הספק נמחק בהצלחה",
        description: "הספק הוסר מהמערכת",
      });
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({
        variant: "destructive",
        title: "שגיאה במחיקת הספק",
        description: "אירעה שגיאה בעת מחיקת הספק",
      });
    }
  };

  const getBuildingName = (buildingId) => {
    const building = buildings.find(b => b.id === buildingId);
    return building ? building.name : 'לא ידוע';
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    // סינון לפי חיפוש טקסט
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (supplier.service_type && supplier.service_type.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // סינון לפי סוג שירות
    const matchesServiceType = selectedServiceType === 'all' || supplier.service_type === selectedServiceType;
    
    // סינון לפי בניין
    const matchesBuilding = selectedBuilding === 'all' || 
      (supplier.related_buildings && supplier.related_buildings.includes(selectedBuilding));
    
    return matchesSearch && matchesServiceType && matchesBuilding;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="w-6 h-6" />
          ספקים
        </h1>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 ml-2" />
          ספק חדש
        </Button>
      </div>

      <Card className="p-4">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="חיפוש לפי שם או סוג שירות..."
              className="pr-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <Select 
                value={selectedServiceType} 
                onValueChange={setSelectedServiceType}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="סוג שירות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל השירותים</SelectItem>
                  <SelectItem value="plumbing">אינסטלציה</SelectItem>
                  <SelectItem value="electricity">חשמל</SelectItem>
                  <SelectItem value="cleaning">ניקיון</SelectItem>
                  <SelectItem value="maintenance">תחזוקה</SelectItem>
                  <SelectItem value="construction">בנייה ושיפוצים</SelectItem>
                  <SelectItem value="gardening">גינון</SelectItem>
                  <SelectItem value="security">אבטחה</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <Select 
                value={selectedBuilding} 
                onValueChange={setSelectedBuilding}
              >
                <SelectTrigger className="w-40">
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
            </div>
          </div>
        </div>
      </Card>

      {showForm && (
        <SupplierForm
          supplier={selectedSupplier}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setSelectedSupplier(null);
          }}
        />
      )}

      <SupplierList
        suppliers={filteredSuppliers}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}