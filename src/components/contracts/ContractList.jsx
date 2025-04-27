
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, Clock, CreditCard, Copy, 
  History, ExternalLink, Edit, RefreshCw, Building2, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
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
} from "@/components/ui/alert-dialog"

// פונקציית עזר לפרמוט תאריכים
const formatDate = (dateString) => {
  if (!dateString) return 'לא צוין';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'תאריך לא תקין';
    }
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'תאריך לא תקין';
  }
};

export default function ContractList({ 
  contracts, 
  tenants, 
  properties, 
  payments,
  documents,
  onEdit, 
  onViewHistory,
  onViewPropertyHistory,
  onDelete
}) {
  const getTenantName = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant ? tenant.full_name : 'לא ידוע';
  };

  const getPropertyDetails = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    return property ? `${property.property_number}` : 'לא ידוע';
  };

  const getContractPayments = (contractId) => {
    return payments.filter(payment => 
      payment.related_to?.type === 'tenant' && 
      payment.contract_id === contractId
    );
  };

  const getContractDocuments = (contractId) => {
    return documents.filter(doc => 
      doc.related_to?.type === 'contract' && 
      doc.related_to.id === contractId
    );
  };

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {contracts.map((contract) => {
        const contractPayments = getContractPayments(contract.id);
        const contractDocuments = getContractDocuments(contract.id);
        const totalPaid = contractPayments.reduce((sum, payment) => 
          payment.status === 'paid' ? sum + payment.amount : sum, 0
        );

        // מצא את הדייר הראשי או הראשון ברשימה
        const tenantId = contract.tenants && contract.tenants.length > 0 ? 
                          contract.tenants[0].tenant_id : 
                          null;

        return (
          <Card key={contract.id} className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg">{getTenantName(tenantId)}</h3>
                <p className="text-sm text-gray-500">{getPropertyDetails(contract.property_id)}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(contract)}
                  title="ערוך חוזה"
                >
                  <Edit className="w-4 h-4" />
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
                      <AlertDialogTitle>מחיקת חוזה</AlertDialogTitle>
                      <AlertDialogDescription>
                        האם אתה בטוח שברצונך למחוק את החוזה?
                        פעולה זו לא ניתנת לביטול.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ביטול</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => onDelete(contract.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        מחק
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">תאריך התחלה:</span>
                <span>{formatDate(contract.start_date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">תאריך סיום:</span>
                <span>{formatDate(contract.end_date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">שכ"ד חודשי:</span>
                <span>₪{contract.monthly_rent?.toLocaleString() || '0'}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant={contract.status === 'active' ? 'success' : 'secondary'}>
                {contract.status === 'active' ? 'פעיל' : 
                 contract.status === 'expired' ? 'הסתיים' : 
                 contract.status === 'terminated' ? 'בוטל' : 'טיוטה'}
              </Badge>
              {contract.indexation && contract.indexation.type && contract.indexation.type !== 'none' && (
                <Badge variant="outline">
                  {contract.indexation.type === 'consumer_price_index' ? 'צמוד מדד' : 'צמוד דולר'}
                </Badge>
              )}
              {isContractNearEnd(contract) && (
                <Badge variant="warning">
                  עומד להסתיים
                </Badge>
              )}
            </div>

            <div className="space-y-3 mt-4 pt-4 border-t">
              {/* דיאלוג היסטוריית תשלומים */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <CreditCard className="w-4 h-4 ml-2" />
                    תשלומים (₪{totalPaid.toLocaleString()})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>היסטוריית תשלומים</DialogTitle>
                    <DialogDescription>
                      כל התשלומים עבור חוזה זה
                    </DialogDescription>
                  </DialogHeader>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>תאריך</TableHead>
                        <TableHead>סכום</TableHead>
                        <TableHead>סטטוס</TableHead>
                        <TableHead>אמצעי תשלום</TableHead>
                        <TableHead>הערות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contractPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.date)}</TableCell>
                          <TableCell>₪{payment.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={
                              payment.status === 'paid' ? 'success' :
                              payment.status === 'pending' ? 'warning' :
                              'destructive'
                            }>
                              {payment.status === 'paid' ? 'שולם' :
                               payment.status === 'pending' ? 'ממתין' :
                               'באיחור'}
                            </Badge>
                          </TableCell>
                          <TableCell>{payment.payment_method}</TableCell>
                          <TableCell>{payment.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </DialogContent>
              </Dialog>

              {/* דיאלוג מסמכים */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="w-4 h-4 ml-2" />
                    מסמכים ({contractDocuments.length})
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>מסמכי החוזה</DialogTitle>
                    <DialogDescription>
                      כל המסמכים המקושרים לחוזה זה
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    {contractDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(doc.date)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(doc.file_url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {contractDocuments.length === 0 && (
                      <p className="text-center text-gray-500">אין מסמכים מקושרים לחוזה זה</p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* כפתור היסטוריית חוזים לפי שוכר */}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => tenantId && onViewHistory(tenantId)}
                disabled={!tenantId}
              >
                <History className="w-4 h-4 ml-2" />
                היסטוריית חוזים של השוכר
              </Button>

              {/* כפתור היסטוריית חוזים לפי נכס */}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => onViewPropertyHistory(contract.property_id)}
              >
                <Building2 className="w-4 h-4 ml-2" />
                היסטוריית חוזים של הנכס
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );

  // Helper function to check if contract is near end (30 days)
  function isContractNearEnd(contract) {
    if (contract.status !== 'active') return false;
    
    const today = new Date();
    const endDate = new Date(contract.end_date);
    const daysDiff = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    
    return daysDiff > 0 && daysDiff <= 30;
  }
}
