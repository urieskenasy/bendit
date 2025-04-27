
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, Edit2, Phone, Mail, MapPin, CreditCard, Trash2, Building2, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Building, Property } from '@/api/entities';
import { toast } from "@/components/ui/use-toast"

export default function SupplierList({ suppliers, onEdit, onDelete }) {
  const [buildingDetails, setBuildingDetails] = useState([]);
  const [propertyDetails, setPropertyDetails] = useState([]);
  const [showBuildingsDialog, setShowBuildingsDialog] = useState(false);
  const [showPropertiesDialog, setShowPropertiesDialog] = useState(false);
  const [selectedSupplierName, setSelectedSupplierName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getServiceTypeName = (type) => {
    switch (type) {
      case 'plumbing': return 'אינסטלציה';
      case 'electricity': return 'חשמל';
      case 'cleaning': return 'ניקיון';
      case 'maintenance': return 'תחזוקה';
      case 'construction': return 'בנייה ושיפוצים';
      case 'gardening': return 'גינון';
      case 'security': return 'אבטחה';
      case 'other': return 'אחר';
      default: return type;
    }
  };

  const handleShowBuildings = async (supplier) => {
    setIsLoading(true);
    setSelectedSupplierName(supplier.name);
    
    try {
      const buildings = await Building.list();
      const relatedBuildings = buildings.filter(building => 
        supplier.related_buildings?.includes(building.id)
      );
      
      setBuildingDetails(relatedBuildings);
      setShowBuildingsDialog(true);
    } catch (error) {
      console.error('Error loading building details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowProperties = async (supplier) => {
    setIsLoading(true);
    setSelectedSupplierName(supplier.name);
    
    try {
      // תחילה נבדוק אם יש נכסים מקושרים לספק
      if (!supplier.related_properties?.length) {
        setPropertyDetails([]);
        setShowPropertiesDialog(true);
        return;
      }

      // נביא את כל הנכסים ונסנן רק את אלו שמקושרים לספק
      const properties = await Property.list();
      
      // נכלול גם נכסים שהספק מקושר אליהם דרך supplier_ids
      const relatedProperties = properties.filter(property => 
        supplier.related_properties.includes(property.id) || 
        (property.supplier_ids && property.supplier_ids.includes(supplier.id))
      );
      
      // Get building info for each property
      const buildings = await Building.list();
      
      const propertiesWithBuildingInfo = relatedProperties.map(property => {
        const building = buildings.find(b => b.id === property.building_id);
        return {
          ...property,
          building_name: building ? building.name : 'לא ידוע'
        };
      });
      
      setPropertyDetails(propertiesWithBuildingInfo);
      setShowPropertiesDialog(true);
    } catch (error) {
      console.error('Error loading property details:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בטעינת נתוני הנכסים",
        description: "אירעה שגיאה בטעינת רשימת הנכסים המקושרים"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuildingPropertyCheck = (supplier) => {
    // בדיקה אם יש קישורים לבניינים בפורמט building_X
    const hasBuildingLinks = supplier.related_properties?.some(id => id.startsWith('building_'));
    
    return {
      buildingCount: supplier.related_buildings?.length || 0,
      propertyCount: hasBuildingLinks ? 
        supplier.related_properties.length : 
        supplier.related_properties?.length || 0
    };
  };

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {suppliers.map((supplier) => {
          const { buildingCount, propertyCount } = handleBuildingPropertyCheck(supplier);
          
          return (
            <motion.div key={supplier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}>
              <Card className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Truck className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{supplier.name}</h3>
                      {supplier.service_type && (
                        <Badge className="bg-purple-100 text-purple-800 mt-1">
                          {getServiceTypeName(supplier.service_type)}
                        </Badge>
                      )}
                      {buildingCount > 0 && (
                        <Badge 
                          onClick={() => handleShowBuildings(supplier)} 
                          className="bg-blue-100 text-blue-800 mt-1 mr-1 cursor-pointer hover:bg-blue-200"
                        >
                          {buildingCount} בניינים
                        </Badge>
                      )}
                      {propertyCount > 0 && (
                        <Badge 
                          onClick={() => handleShowProperties(supplier)} 
                          className="bg-green-100 text-green-800 mt-1 mr-1 cursor-pointer hover:bg-green-200"
                        >
                          {propertyCount} נכסים
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(supplier)}
                      className="rounded-full hover:bg-blue-50"
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>מחיקת ספק</AlertDialogTitle>
                          <AlertDialogDescription>
                            האם אתה בטוח שברצונך למחוק את הספק "{supplier.name}"?
                            פעולה זו לא ניתנת לביטול.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ביטול</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onDelete(supplier.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            מחק
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{supplier.phone}</span>
                    </div>
                  )}
                  
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{supplier.email}</span>
                    </div>
                  )}
                  
                  {supplier.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{supplier.address}</span>
                    </div>
                  )}
                  
                  {supplier.bank_details?.bank_name && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        {supplier.bank_details.bank_name}, סניף {supplier.bank_details.branch}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* דיאלוג לתצוגת בניינים */}
      <Dialog open={showBuildingsDialog} onOpenChange={setShowBuildingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              בניינים שעובד איתם הספק: {selectedSupplierName}
            </DialogTitle>
            <DialogDescription>
              רשימת כל הבניינים שהספק נותן להם שירות
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-500">טוען נתונים...</p>
            </div>
          ) : buildingDetails.length > 0 ? (
            <div className="divide-y">
              {buildingDetails.map(building => (
                <div key={building.id} className="py-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium">{building.name}</h4>
                      <p className="text-sm text-gray-500">
                        {building.address?.street} {building.address?.number}, {building.address?.city}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              לא נמצאו בניינים משויכים
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* דיאלוג לתצוגת נכסים */}
      <Dialog open={showPropertiesDialog} onOpenChange={setShowPropertiesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-green-600" />
              נכסים שעובד איתם הספק: {selectedSupplierName}
            </DialogTitle>
            <DialogDescription>
              רשימת כל הנכסים שהספק נותן להם שירות
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-500">טוען נתונים...</p>
            </div>
          ) : propertyDetails.length > 0 ? (
            <div className="divide-y">
              {propertyDetails.map(property => (
                <div key={property.id} className="py-3">
                  <div className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="font-medium">{property.property_number}</h4>
                      <p className="text-sm text-gray-500">
                        בניין: {property.building_name} | קומה: {property.floor || '-'}
                      </p>
                      {property.type && (
                        <Badge className="mt-1 bg-gray-100 text-gray-800">
                          {property.type === 'apartment' ? 'דירה' : 
                           property.type === 'office' ? 'משרד' : 
                           property.type === 'store' ? 'חנות' : 
                           property.type === 'warehouse' ? 'מחסן' : 
                           property.type === 'parking' ? 'חניה' : 
                           property.type === 'storage' ? 'מחסן' : property.type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              לא נמצאו נכסים משויכים
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
