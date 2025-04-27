
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Edit2, User, Trash2, Wrench, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import MaintenanceHistoryList from '../maintenance/MaintenanceHistoryList';
import { Maintenance } from '@/api/entities';

export default function PropertyList({ properties, buildings, tenants, onEdit, onDelete, propertyTypeLabels }) {
  const [selectedPropertyHistory, setSelectedPropertyHistory] = useState(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const getBuildingName = (buildingId) => {
    const building = buildings.find(b => b.id === buildingId);
    return building ? building.name : 'לא ידוע';
  };

  const getPropertyTenant = (propertyId) => {
    return tenants.find(tenant => 
      tenant.property_id === propertyId && tenant.status === 'active'
    );
  };

  // פונקציה לבדיקה אם יש מספר בעלים
  const hasMultipleOwners = (property) => {
    return property.owners && property.owners.length > 1;
  };

  const handleShowMaintenanceHistory = async (property) => {
    setSelectedPropertyHistory(property);
    setIsLoadingHistory(true);
    
    try {
      // מצא את כל רשומות התחזוקה המשויכות לנכס זה
      const maintenanceItems = await Maintenance.list();
      const filteredItems = maintenanceItems.filter(item => 
        item.related_to?.type === 'property' && 
        item.related_to?.id === property.id
      );
      
      // מיין לפי תאריך בסדר יורד (החדש ביותר קודם)
      const sortedItems = filteredItems.sort((a, b) => {
        const dateA = a.reported_date ? new Date(a.reported_date) : new Date(0);
        const dateB = b.reported_date ? new Date(b.reported_date) : new Date(0);
        return dateB - dateA;
      });
      
      setMaintenanceHistory(sortedItems);
    } catch (error) {
      console.error('Error loading maintenance history:', error);
      setMaintenanceHistory([]);
    }
    
    setIsLoadingHistory(false);
  };

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => {
          const currentTenant = getPropertyTenant(property.id);
          
          return (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-5 hover:shadow-lg transition-all duration-300 bg-white hover:border-indigo-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-indigo-100">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{property.property_number}</h3>
                      <p className="text-sm text-gray-500">{getBuildingName(property.building_id)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleShowMaintenanceHistory(property)}
                      className="rounded-full hover:bg-blue-50"
                      title="היסטוריית תקלות"
                    >
                      <Wrench className="w-4 h-4 text-blue-500" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(property)}
                      className="rounded-full hover:bg-indigo-50"
                    >
                      <Edit2 className="w-4 h-4 text-indigo-500" />
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
                          <AlertDialogTitle>מחיקת נכס</AlertDialogTitle>
                          <AlertDialogDescription>
                            האם אתה בטוח שברצונך למחוק את הנכס "{property.property_number}"? 
                            {currentTenant && (
                              <p className="mt-2 font-semibold text-red-600">
                                שים לב: נכס זה מושכר כרגע לדייר {currentTenant.full_name}
                              </p>
                            )}
                            פעולה זו לא ניתנת לביטול.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ביטול</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onDelete(property.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            מחק
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="mt-5 space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">סוג נכס:</span>
                    <span className="text-sm font-medium text-gray-700">
                      {propertyTypeLabels[property.type] || property.type}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">קומה:</span>
                    <span className="text-sm font-medium text-gray-700">
                      {property.location?.floor || '-'}
                    </span>
                  </div>

                  {property.measurements?.total_sqm && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">שטח כולל:</span>
                      <span className="text-sm font-medium text-gray-700">
                        {property.measurements.total_sqm} מ״ר
                      </span>
                    </div>
                  )}

                  {property.features?.rooms && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">חדרים:</span>
                      <span className="text-sm font-medium text-gray-700">
                        {property.features.rooms}
                      </span>
                    </div>
                  )}
                  
                  {/* הצגת מידע על בעלי הנכס */}
                  {hasMultipleOwners(property) && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">בעלות:</span>
                      <span className="text-sm font-medium text-gray-700">
                        {property.owners?.length} בעלים
                      </span>
                    </div>
                  )}

                  {property.rental_details?.monthly_rent > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">שכר דירה:</span>
                      <span className="text-sm font-medium text-gray-700">
                        ₪{property.rental_details.monthly_rent.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* מידע על הדייר הנוכחי */}
                {currentTenant && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">דייר נוכחי</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{currentTenant.full_name}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {currentTenant.phone && (
                          <span className="text-gray-600">טלפון: {currentTenant.phone}</span>
                        )}
                        {currentTenant.contract_end && (
                          <span className="text-gray-600">
                            סיום חוזה: {format(new Date(currentTenant.contract_end), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <Badge className={
                    property.rental_details?.status === 'available' 
                      ? 'bg-emerald-100 text-emerald-800 py-1'
                      : 'bg-blue-100 text-blue-800 py-1'
                  }>
                    {property.rental_details?.status === 'available' ? 'פנוי' : 'מושכר'}
                  </Badge>
                  
                  {/* הוסף תג לציון מספר בעלים */}
                  {hasMultipleOwners(property) && (
                    <Badge className="bg-purple-100 text-purple-800 py-1 mr-2">
                      {property.owners?.length} שותפים בנכס
                    </Badge>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* דיאלוג להצגת היסטוריית תקלות */}
      <Dialog 
        open={!!selectedPropertyHistory} 
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedPropertyHistory(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              היסטוריית תקלות - {selectedPropertyHistory?.property_number}
            </DialogTitle>
            <DialogDescription>
              {getBuildingName(selectedPropertyHistory?.building_id)}
            </DialogDescription>
          </DialogHeader>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                <p className="text-gray-500">טוען נתונים...</p>
              </div>
            </div>
          ) : maintenanceHistory.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              לא נמצאו תקלות עבור נכס זה
            </div>
          ) : (
            <MaintenanceHistoryList maintenance={maintenanceHistory} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
