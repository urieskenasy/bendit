import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Edit2, 
  Columns, 
  Car, 
  Package, 
  Shield, 
  Palmtree 
} from 'lucide-react';
import { motion } from 'framer-motion';

const buildingTypeLabels = {
  residential: 'מגורים',
  commercial: 'מסחרי',
  mixed: 'מעורב'
};

export default function BuildingList({ buildings, onEdit }) {
  const getFormattedAddress = (address) => {
    if (!address) return 'כתובת לא זמינה';
    
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.number) parts.push(address.number);
    if (address.city) parts.push(address.city);
    
    return parts.join(' ');
  };

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {buildings.map((building) => (
        <motion.div
          key={building.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="card p-5 hover:shadow-lg transition-all duration-300 bg-white hover:border-indigo-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-indigo-100">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{building.name}</h3>
                  <p className="text-sm text-gray-500">{getFormattedAddress(building.address)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(building)}
                className="rounded-full hover:bg-indigo-50"
              >
                <Edit2 className="w-4 h-4 text-indigo-500" />
              </Button>
            </div>

            <div className="mt-5 space-y-3 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">סוג בניין:</span>
                <span className="text-sm font-medium text-gray-700">
                  {buildingTypeLabels[building.building_type] || building.building_type}
                </span>
              </div>
              
              {building.total_floors && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">קומות:</span>
                  <span className="text-sm font-medium text-gray-700">{building.total_floors}</span>
                </div>
              )}

              {building.year_built && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">שנת בנייה:</span>
                  <span className="text-sm font-medium text-gray-700">{building.year_built}</span>
                </div>
              )}
            </div>

            {building.amenities && building.amenities.length > 0 && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {building.amenities.includes('elevator') && (
                    <Badge className="bg-blue-100 text-blue-800 py-1 flex items-center gap-1">
                      <Columns className="w-3 h-3" />
                      מעלית
                    </Badge>
                  )}
                  {building.amenities.includes('parking') && (
                    <Badge className="bg-green-100 text-green-800 py-1 flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      חניה
                    </Badge>
                  )}
                  {building.amenities.includes('storage') && (
                    <Badge className="bg-amber-100 text-amber-800 py-1 flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      מחסן
                    </Badge>
                  )}
                  {building.amenities.includes('security') && (
                    <Badge className="bg-red-100 text-red-800 py-1 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      אבטחה
                    </Badge>
                  )}
                  {building.amenities.includes('garden') && (
                    <Badge className="bg-emerald-100 text-emerald-800 py-1 flex items-center gap-1">
                      <Palmtree className="w-3 h-3" />
                      גינה
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      ))}
    </div>
  );
}