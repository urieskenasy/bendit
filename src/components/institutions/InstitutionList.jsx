import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Landmark, Edit2, Phone, Mail, MapPin, FileText, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

export default function InstitutionList({ institutions, onEdit }) {
  const getInstitutionTypeName = (type) => {
    switch (type) {
      case 'municipality': return 'רשות מקומית';
      case 'tax_authority': return 'רשות המיסים';
      case 'electric_company': return 'חברת חשמל';
      case 'water_company': return 'חברת מים';
      case 'ministry_of_housing': return 'משרד השיכון';
      case 'other': return 'אחר';
      default: return type;
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {institutions.map((institution) => (
        <motion.div
          key={institution.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Landmark className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">{institution.name}</h3>
                  {institution.type && (
                    <Badge className="bg-blue-100 text-blue-800 mt-1">
                      {getInstitutionTypeName(institution.type)}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(institution)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {institution.contact_name && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">איש קשר: {institution.contact_name}</span>
                </div>
              )}
              
              {institution.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{institution.phone}</span>
                </div>
              )}
              
              {institution.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{institution.email}</span>
                </div>
              )}
              
              {institution.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{institution.address}</span>
                </div>
              )}
              
              {institution.account_number && (
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">מס' חשבון: {institution.account_number}</span>
                </div>
              )}
            </div>

            {institution.documents && institution.documents.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium mb-2">מסמכים ({institution.documents.length})</p>
              </div>
            )}
          </Card>
        </motion.div>
      ))}
    </div>
  );
}