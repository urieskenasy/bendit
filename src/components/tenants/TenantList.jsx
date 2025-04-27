
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Edit2, Phone, Mail, Building2, Trash2, Calendar, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
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

export default function TenantList({ tenants, properties, buildings, onEdit, onDelete, activeTab }) {
  const getPropertyDetails = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return null;

    const building = buildings.find(b => b.id === property.building_id);
    
    const propertyTypeLabels = {
      apartment: 'דירה',
      office: 'משרד',
      store: 'חנות',
      warehouse: 'מחסן',
      parking: 'חניה',
      storage: 'מחסן'
    };

    return {
      property,
      building,
      typeLabel: propertyTypeLabels[property.type] || property.type
    };
  };

  // פונקציה לבדיקה אם יש שותפים לנכס
  const getCoTenants = (tenant) => {
    if (!tenant.property_id) return [];
    
    return tenants.filter(t => 
      t.property_id === tenant.property_id && 
      t.status === 'active' && 
      t.id !== tenant.id
    );
  };

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {tenants.map((tenant) => {
        const propertyDetails = tenant.property_id ? getPropertyDetails(tenant.property_id) : null;
        const coTenants = getCoTenants(tenant);
        const hasCoTenants = coTenants.length > 0;
        
        // וודא שיש שכר דירה להצגה
        const hasRent = typeof tenant.monthly_rent === 'number' && tenant.monthly_rent > 0;
        console.log("Tenant monthly rent:", tenant.full_name, tenant.monthly_rent, typeof tenant.monthly_rent);
        
        return (
          <motion.div
            key={tenant.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-5 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{tenant.full_name}</h3>
                    <p className="text-sm text-gray-500">{tenant.id_number}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(tenant)}
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
                        <AlertDialogTitle>מחיקת דייר</AlertDialogTitle>
                        <AlertDialogDescription>
                          האם אתה בטוח שברצונך למחוק את הדייר "{tenant.full_name}"? 
                          פעולה זו לא ניתנת לביטול.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDelete(tenant.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          מחק
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {tenant.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{tenant.phone}</span>
                  </div>
                )}
                
                {tenant.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{tenant.email}</span>
                  </div>
                )}
                
                {propertyDetails && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span>
                      {propertyDetails.typeLabel} {propertyDetails.property.property_number}, 
                      {propertyDetails.building && ` ${propertyDetails.building.name}`}
                    </span>
                  </div>
                )}
                
                {tenant.contract_end && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>סיום חוזה: {format(new Date(tenant.contract_end), 'dd/MM/yyyy')}</span>
                  </div>
                )}

                {tenant.monthly_rent > 0 && (
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-700">
                      שכ"ד חודשי: ₪{tenant.monthly_rent.toLocaleString()}
                      {hasCoTenants && tenant.share_percentage && tenant.share_percentage < 100 && (
                        <span className="text-gray-500 font-normal"> ({tenant.share_percentage}% מהדירה)</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {hasCoTenants && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">שותפים בנכס:</p>
                  {coTenants.map(coTenant => (
                    <div key={coTenant.id} className="text-xs text-gray-600 flex justify-between">
                      <span>{coTenant.full_name}</span>
                      <span>{coTenant.share_percentage || 0}%</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <Badge className={
                  tenant.status === 'active' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }>
                  {tenant.status === 'active' ? 'פעיל' : 'היסטורי'}
                </Badge>
                
                {tenant.tenant_type === 'commercial' && (
                  <Badge className="ml-2 bg-blue-100 text-blue-800">
                    מסחרי
                  </Badge>
                )}
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
