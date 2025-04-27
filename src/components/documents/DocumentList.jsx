import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Edit2, Calendar, ExternalLink, DollarSign, User, Building2, Truck, Landmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function DocumentList({ documents, relatedEntities, onEdit }) {
  const documentTypes = {
    invoice: 'חשבונית',
    receipt: 'קבלה',
    contract: 'חוזה',
    tax_document: 'מסמך מס',
    insurance: 'ביטוח',
    permit: 'אישור/היתר',
    other: 'אחר'
  };

  const statusColors = {
    draft: 'bg-yellow-100 text-yellow-800',
    final: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const statusNames = {
    draft: 'טיוטה',
    final: 'סופי',
    cancelled: 'מבוטל'
  };

  const getRelatedEntityName = (relatedTo) => {
    if (!relatedTo) return 'לא ידוע';
    
    switch (relatedTo.type) {
      case 'tenant':
        const tenant = relatedEntities.tenants.find(t => t.id === relatedTo.id);
        return tenant ? tenant.full_name : 'דייר לא ידוע';
      case 'property':
        const property = relatedEntities.properties.find(p => p.id === relatedTo.id);
        return property ? property.address : 'נכס לא ידוע';
      case 'supplier':
        const supplier = relatedEntities.suppliers.find(s => s.id === relatedTo.id);
        return supplier ? supplier.name : 'ספק לא ידוע';
      case 'institution':
        const institution = relatedEntities.institutions.find(i => i.id === relatedTo.id);
        return institution ? institution.name : 'מוסד לא ידוע';
      default:
        return 'לא ידוע';
    }
  };

  const getRelatedEntityIcon = (relatedTo) => {
    if (!relatedTo) return <FileText className="w-5 h-5 text-gray-600" />;
    
    switch (relatedTo.type) {
      case 'tenant':
        return <User className="w-5 h-5 text-green-600" />;
      case 'property':
        return <Building2 className="w-5 h-5 text-blue-600" />;
      case 'supplier':
        return <Truck className="w-5 h-5 text-purple-600" />;
      case 'institution':
        return <Landmark className="w-5 h-5 text-amber-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {documents.map((document) => (
        <motion.div
          key={document.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{documentTypes[document.type]}</h3>
                    {document.number && (
                      <span className="text-gray-500 text-sm">#{document.number}</span>
                    )}
                  </div>
                  <Badge className={statusColors[document.status]}>
                    {statusNames[document.status]}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1">
                {document.file_url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(document.file_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 text-blue-500" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(document)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {document.related_to && (
                <div className="flex items-center gap-2">
                  {getRelatedEntityIcon(document.related_to)}
                  <span className="text-sm">{getRelatedEntityName(document.related_to)}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm">
                  {format(new Date(document.date), 'dd/MM/yyyy')}
                </span>
              </div>
              
              {document.amount && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">₪{document.amount.toLocaleString()}</span>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}