
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Tenant, Property, Building, Owner, Supplier, BuildingCommittee, Payment } from '@/api/entities';
import { useToast } from "@/components/ui/use-toast";
import syncPayment from '../utils/paymentSync';
import { createPaymentDocument } from '../utils/documentSync';
import { UploadFile } from '@/api/integrations';

export default function PaymentForm({ payment, relatedEntities, onSubmit, onCancel }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(payment || {
    related_to: {
      type: '',
      id: ''
    },
    property_id: '',
    owner_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    type: '',
    payment_method: '',
    status: 'pending',
    currency: 'ILS',
    building_committee_status: 'unpaid',
    notes: '',
    index_details: {
      accumulated_index: 0,
      is_index_paid: false,
      last_index_calculation: null,
      index_paid_until: null
    }
  });

  const [buildings, setBuildings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [owners, setOwners] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [buildingProperties, setBuildingProperties] = useState([]);
  const [receiptFile, setReceiptFile] = useState(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [buildingsData, propertiesData, tenantsData, ownersData, suppliersData, committeesData] = await Promise.all([
        Building.list(),
        Property.list(),
        Tenant.list(),
        Tenant.list(),
        Owner.list(),
        BuildingCommittee.list()
      ]);

      setBuildings(buildingsData);
      setProperties(propertiesData);
      setTenants(tenantsData);
      setOwners(ownersData);
      setSuppliers(suppliersData);
      setCommittees(committeesData);

      if (payment && payment.property_id) {
        const property = propertiesData.find(p => p.id === payment.property_id);
        if (property) {
          setSelectedBuilding(property.building_id);
          setBuildingProperties(propertiesData.filter(p => p.building_id === property.building_id));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בטעינת נתונים",
        description: "אירעה שגיאה בטעינת הנתונים הדרושים"
      });
    }
    setIsLoading(false);
  };

  const handleBuildingChange = (buildingId) => {
    setSelectedBuilding(buildingId);
    const filteredProperties = properties.filter(p => p.building_id === buildingId);
    setBuildingProperties(filteredProperties);
    setFormData(prev => ({
      ...prev,
      property_id: ''
    }));
  };

  const handlePropertyChange = (propertyId) => {
    const selectedProperty = properties.find(p => p.id === propertyId);

    setFormData(prev => ({
      ...prev,
      property_id: propertyId,
      amount: prev.type === 'rent' && selectedProperty?.rental_details?.monthly_rent ?
        selectedProperty.rental_details.monthly_rent.toString() :
        prev.amount
    }));
  };

  const handleRelatedToTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      related_to: {
        type,
        id: ''
      }
    }));
  };

  const handleRelatedToIdChange = (id) => {
    setFormData(prev => ({
      ...prev,
      related_to: {
        ...prev.related_to,
        id
      }
    }));
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingReceipt(true);
    try {
      const { file_url } = await UploadFile({ file });
      setReceiptFile(file_url);
      toast({
        title: "הקבלה הועלתה בהצלחה",
        description: "קובץ הקבלה הועלה לשרת בהצלחה",
      });
    } catch (error) {
      console.error("Error uploading receipt:", error);
      toast({
        variant: "destructive",
        title: "שגיאה בהעלאת הקבלה",
        description: "אירעה שגיאה בעת העלאת קובץ הקבלה",
      });
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleTypeChange = (type) => {
    const updatedData = { ...formData, type };

    // If type is rent, initialize utility_bills structure
    if (type === 'rent') {
      updatedData.utility_bills = {
        electricity: {
          current_reading: 0,
          previous_reading: 0,
          consumption: 0,
          amount: 0,
          reading_date: format(new Date(), 'yyyy-MM-dd'),
          status: 'unpaid'
        },
        water: {
          current_reading: 0,
          previous_reading: 0,
          consumption: 0,
          amount: 0,
          reading_date: format(new Date(), 'yyyy-MM-dd'),
          status: 'unpaid'
        },
        gas: {
          current_reading: 0,
          previous_reading: 0,
          consumption: 0,
          amount: 0,
          reading_date: format(new Date(), 'yyyy-MM-dd'),
          status: 'unpaid'
        },
        property_tax: {
          amount: 0,
          period: `${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
          status: 'unpaid'
        },
        internet: {
          amount: 0,
          status: 'unpaid'
        },
        total_amount: 0
      };
    }

    setFormData(updatedData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.property_id) {
        throw new Error('חובה לבחור נכס');
      }

      if (!formData.related_to.type || !formData.related_to.id) {
        throw new Error('חובה לבחור גורם משלם');
      }

      const dataToSubmit = {
        ...formData,
        amount: parseFloat(formData.amount),
        property_id: formData.property_id,
        date: formData.date || format(new Date(), 'yyyy-MM-dd'),
        status: formData.status || 'pending'
      };

      let savedPayment;
      if (payment) {
        savedPayment = await Payment.update(payment.id, dataToSubmit);
      } else {
        savedPayment = await Payment.create(dataToSubmit);
      }

      // אם הועלה קובץ קבלה, צור מסמך קבלה
      if (receiptFile) {
        try {
          // סמן את התשלום כשולם
          savedPayment = await Payment.update(savedPayment.id, {
            ...savedPayment,
            status: 'paid',
            date: format(new Date(), 'yyyy-MM-dd')
          });

          // יצור מסמך קבלה
          await createPaymentDocument(savedPayment, 'receipt', receiptFile);

          toast({
            title: "קבלה נוצרה בהצלחה",
            description: "הקבלה נשמרה והתשלום סומן כשולם",
          });
        } catch (docError) {
          console.error("Error creating receipt document:", docError);
          // לא נכשיל את התהליך כולו אם יצירת המסמך נכשלה
        }
      }

      // סנכרון התשלום עם ישויות קשורות
      try {
        await syncPayment(savedPayment);
      } catch (syncError) {
        console.error("Error syncing payment with related entities:", syncError);
        // לא נכשיל את כל הפעולה אם הסנכרון נכשל
      }

      toast({
        title: payment ? "התשלום עודכן" : "התשלום נוצר",
        description: "הנתונים נשמרו בהצלחה"
      });

      onSubmit(dataToSubmit);
    } catch (error) {
      console.error('Error saving payment:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בשמירת התשלום",
        description: error.message || "אירעה שגיאה בשמירת התשלום"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-6">{payment ? 'עריכת תשלום' : 'תשלום חדש'}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* סוג תשלום */}
        <div className="space-y-2">
          <Label>סוג תשלום</Label>
          <Select
            value={formData.type}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר סוג תשלום" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rent">שכירות</SelectItem>
              <SelectItem value="bills">חשבונות</SelectItem>
              <SelectItem value="deposit">פיקדון</SelectItem>
              <SelectItem value="maintenance">תחזוקה</SelectItem>
              <SelectItem value="tax">מיסים</SelectItem>
              <SelectItem value="committee">ועד בית</SelectItem>
              <SelectItem value="insurance">ביטוח</SelectItem>
              <SelectItem value="other">אחר</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* גורם משלם */}
        <div className="space-y-2">
          <Label>גורם משלם</Label>
          <Select
            value={formData.related_to?.type}
            onValueChange={(value) => setFormData(prev => ({
              ...prev,
              related_to: { type: value, id: '' }
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר סוג גורם משלם" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tenant">דייר</SelectItem>
              <SelectItem value="owner">בעלים</SelectItem>
              <SelectItem value="supplier">ספק</SelectItem>
              <SelectItem value="building_committee">ועד בית</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* בחירת הגורם המשלם הספציפי */}
        {formData.related_to?.type && (
          <div className="space-y-2">
            <Label>בחר {
              formData.related_to.type === 'tenant' ? 'דייר' :
                formData.related_to.type === 'owner' ? 'בעלים' :
                  formData.related_to.type === 'supplier' ? 'ספק' :
                    'ועד בית'
            }</Label>
            <Select
              value={formData.related_to.id}
              onValueChange={(value) => setFormData(prev => ({
                ...prev,
                related_to: { ...prev.related_to, id: value }
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={`בחר ${
                  formData.related_to.type === 'tenant' ? 'דייר' :
                    formData.related_to.type === 'owner' ? 'בעלים' :
                      formData.related_to.type === 'supplier' ? 'ספק' :
                        'ועד בית'
                }`} />
              </SelectTrigger>
              <SelectContent>
                {formData.related_to.type === 'tenant' && relatedEntities.tenants?.map(tenant => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.full_name}
                  </SelectItem>
                ))}
                {formData.related_to.type === 'owner' && relatedEntities.owners?.map(owner => (
                  <SelectItem key={owner.id} value={owner.id}>
                    {owner.full_name}
                  </SelectItem>
                ))}
                {formData.related_to.type === 'supplier' && relatedEntities.suppliers?.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
                {formData.related_to.type === 'building_committee' && relatedEntities.buildingCommittees?.map(committee => (
                  <SelectItem key={committee.id} value={committee.id}>
                    {committee.building_address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* סכום */}
        <div className="space-y-2">
          <Label>סכום</Label>
          <Input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="הכנס סכום"
          />
        </div>

        {/* תאריך תשלום */}
        <div className="space-y-2">
          <Label>תאריך תשלום</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          />
        </div>

        {/* תאריך לתשלום */}
        <div className="space-y-2">
          <Label>תאריך לתשלום</Label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
          />
        </div>

        {/* סטטוס */}
        <div className="space-y-2">
          <Label>סטטוס</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">שולם</SelectItem>
              <SelectItem value="pending">ממתין לתשלום</SelectItem>
              <SelectItem value="late">באיחור</SelectItem>
              <SelectItem value="cancelled">בוטל</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* סטטוס ועד בית */}
        <div className="space-y-2">
          <Label>סטטוס ועד בית</Label>
          <Select
            value={formData.building_committee_status}
            onValueChange={(value) => setFormData(prev => ({ ...prev, building_committee_status: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר סטטוס ועד בית" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">שולם</SelectItem>
              <SelectItem value="unpaid">לא שולם</SelectItem>
              <SelectItem value="included">כלול במחיר</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* אמצעי תשלום */}
        <div className="space-y-2">
          <Label>אמצעי תשלום</Label>
          <Select
            value={formData.payment_method}
            onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר אמצעי תשלום" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">מזומן</SelectItem>
              <SelectItem value="check">צ'ק</SelectItem>
              <SelectItem value="bank_transfer">העברה בנקאית</SelectItem>
              <SelectItem value="credit_card">כרטיס אשראי</SelectItem>
              <SelectItem value="other">אחר</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* הערות */}
        <div className="space-y-2">
          <Label>הערות</Label>
          <Input
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="הערות נוספות"
          />
        </div>

        {/* Add receipt upload section before submit buttons */}
        <div className="space-y-2 mt-4">
          <h3 className="text-lg font-semibold">קבלה</h3>
          <div className="p-4 border rounded-lg bg-gray-50">
            <Label htmlFor="receiptFile">העלאת קבלה (יסמן את התשלום כשולם)</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                id="receiptFile"
                type="file"
                onChange={handleReceiptUpload}
                className="flex-1"
                disabled={isUploadingReceipt}
              />
              {isUploadingReceipt && <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent" />}
            </div>
            {receiptFile && (
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-100 mt-2">
                <a href={receiptFile} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">
                  צפה בקבלה שהועלתה
                </a>
                <span className="text-xs text-gray-500">
                  הקבלה הועלתה בהצלחה
                </span>
              </div>
            )}
          </div>
        </div>

        {/* כפתורי פעולה */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            ביטול
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
            {isLoading ? 'שומר...' : payment ? 'עדכן תשלום' : 'צור תשלום'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
