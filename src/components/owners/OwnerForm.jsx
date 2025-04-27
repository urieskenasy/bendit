import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { User, Phone, Mail, CreditCard, Building2, Calculator } from 'lucide-react';
import { Property } from '@/api/entities';
import syncOwner, { calculateOwnerTotalIncome, generateOwnerProfitReport } from '../utils/ownerSync';

export default function OwnerForm({ owner, onSubmit, onCancel }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [properties, setProperties] = useState([]);
  const [isCalculatingIncome, setIsCalculatingIncome] = useState(false);
  const [incomeStats, setIncomeStats] = useState(null);
  const [formData, setFormData] = useState(owner || {
    full_name: '',
    id_number: '',
    phone: '',
    email: '',
    bank_account: {
      bank_name: '',
      branch: '',
      account_number: ''
    },
    notes: ''
  });

  useEffect(() => {
    // טעינת נכסים של בעל הנכס
    const loadProperties = async () => {
      if (owner && owner.id) {
        try {
          const propertiesData = await Property.list();
          const ownerProperties = propertiesData.filter(property => 
            property.owners && 
            property.owners.some(o => o.owner_id === owner.id)
          );
          setProperties(ownerProperties);
          
          // טעינת נתוני הכנסה קיימים אם יש
          if (owner.income_stats) {
            setIncomeStats(owner.income_stats);
          }
        } catch (error) {
          console.error('Error loading properties:', error);
        }
      }
    };
    
    loadProperties();
  }, [owner]);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleCalculateIncome = async () => {
    if (!owner || !owner.id) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "יש לשמור את בעל הנכס לפני חישוב ההכנסות"
      });
      return;
    }
    
    setIsCalculatingIncome(true);
    try {
      const stats = await calculateOwnerTotalIncome(owner.id);
      setIncomeStats({
        monthly_income: stats.totalIncome,
        active_properties: stats.activeProperties,
        rented_properties: stats.rentedProperties,
        average_percentage: stats.averagePercentage,
        last_update: new Date().toISOString()
      });
      
      toast({
        title: "חישוב הכנסות הושלם",
        description: `הכנסה חודשית: ₪${stats.totalIncome.toLocaleString()}`
      });
    } catch (error) {
      console.error("Error calculating income:", error);
      toast({
        variant: "destructive",
        title: "שגיאה בחישוב הכנסות",
        description: "אירעה שגיאה בעת חישוב הכנסות בעל הנכס"
      });
    } finally {
      setIsCalculatingIncome(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (!formData.full_name || !formData.id_number) {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "יש למלא שם ומספר זהות"
        });
        return;
      }
      
      let savedOwner;
      if (owner) {
        savedOwner = await onSubmit(formData);
      } else {
        savedOwner = await onSubmit(formData);
      }
      
      // סנכרון בעל הנכס עם ישויות קשורות
      if (savedOwner && savedOwner.id) {
        try {
          await syncOwner(savedOwner);
        } catch (syncError) {
          console.error("Error syncing owner:", syncError);
          // לא נפסיק את התהליך אם הסנכרון נכשל
        }
      }
      
      toast({
        title: owner ? "בעל הנכס עודכן בהצלחה" : "בעל הנכס נוצר בהצלחה",
        description: "פרטי בעל הנכס נשמרו במערכת",
      });
    } catch (error) {
      console.error("Error saving owner:", error);
      toast({
        variant: "destructive",
        title: "שגיאה בשמירת בעל הנכס",
        description: error.message || "אירעה שגיאה בעת שמירת פרטי בעל הנכס",
      });
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-6">{owner ? 'עריכת בעל נכס' : 'בעל נכס חדש'}</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">פרטים כלליים</TabsTrigger>
          <TabsTrigger value="bank">פרטי בנק</TabsTrigger>
          {owner && <TabsTrigger value="properties">נכסים</TabsTrigger>}
          {owner && <TabsTrigger value="finance">כספים</TabsTrigger>}
        </TabsList>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <TabsContent value="general" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                שם מלא
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="שם מלא"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="id_number">מספר זהות</Label>
              <Input
                id="id_number"
                value={formData.id_number}
                onChange={(e) => handleInputChange('id_number', e.target.value)}
                placeholder="מספר זהות"
                required
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  טלפון
                </Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="טלפון"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  דואר אלקטרוני
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="דואר אלקטרוני"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="הערות"
                rows={3}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="bank" className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5" />
                פרטי חשבון בנק
              </Label>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">שם הבנק</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_account?.bank_name || ''}
                    onChange={(e) => handleInputChange('bank_account.bank_name', e.target.value)}
                    placeholder="שם הבנק"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="branch">מספר סניף</Label>
                  <Input
                    id="branch"
                    value={formData.bank_account?.branch || ''}
                    onChange={(e) => handleInputChange('bank_account.branch', e.target.value)}
                    placeholder="מספר סניף"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="account_number">מספר חשבון</Label>
                  <Input
                    id="account_number"
                    value={formData.bank_account?.account_number || ''}
                    onChange={(e) => handleInputChange('bank_account.account_number', e.target.value)}
                    placeholder="מספר חשבון"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          {owner && (
            <TabsContent value="properties" className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5" />
                  נכסים בבעלות
                </Label>
                
                {properties.length > 0 ? (
                  <div className="space-y-3">
                    {properties.map(property => {
                      const ownerInfo = property.owners.find(o => o.owner_id === owner.id);
                      const ownerPercentage = ownerInfo ? ownerInfo.percentage : 0;
                      
                      return (
                        <div key={property.id} className="bg-gray-50 rounded-lg p-4 border">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{property.property_number}</h3>
                              <p className="text-sm text-gray-500">
                                {property.location?.floor ? `קומה ${property.location.floor}` : ''}
                                {property.building_name ? `, ${property.building_name}` : ''}
                              </p>
                            </div>
                            <div className="text-center">
                              <div className="text-xl font-bold">{ownerPercentage}%</div>
                              <div className="text-xs text-gray-500">אחוז בעלות</div>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-xs text-gray-500">סטטוס נכס:</span>
                                <span className="text-sm mr-1 font-medium">
                                  {property.rental_details?.status === 'rented' ? 'מושכר' : 'פנוי'}
                                </span>
                              </div>
                              {property.rental_details?.status === 'rented' && (
                                <div>
                                  <span className="text-xs text-gray-500">הכנסה חודשית:</span>
                                  <span className="text-sm mr-1 font-medium">
                                    ₪{Math.round((property.rental_details.monthly_rent * ownerPercentage) / 100).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <p className="text-gray-500">לא נמצאו נכסים בבעלות</p>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
          
          {owner && (
            <TabsContent value="finance" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-lg mb-0">
                    <Calculator className="w-5 h-5" />
                    נתונים פיננסיים
                  </Label>
                  
                  <Button 
                    type="button" 
                    variant="outline"
                    size="sm"
                    onClick={handleCalculateIncome}
                    disabled={isCalculatingIncome}
                  >
                    {isCalculatingIncome ? (
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent ml-2" />
                    ) : null}
                    חשב הכנסות
                  </Button>
                </div>
                
                {incomeStats ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500">הכנסה חודשית</p>
                      <p className="text-2xl font-bold">₪{incomeStats.monthly_income.toLocaleString()}</p>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500">נכסים פעילים</p>
                      <p className="text-2xl font-bold">{incomeStats.active_properties}</p>
                      <p className="text-xs text-gray-500">
                        מתוכם {incomeStats.rented_properties} מושכרים
                      </p>
                    </div>
                    
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500">אחוז בעלות ממוצע</p>
                      <p className="text-2xl font-bold">{Math.round(incomeStats.average_percentage)}%</p>
                    </div>
                    
                    {incomeStats.last_update && (
                      <div className="col-span-3 text-xs text-gray-500 text-center mt-2">
                        עודכן לאחרונה: {new Date(incomeStats.last_update).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-gray-500">לא קיימים נתוני הכנסה</p>
                    <p className="text-sm text-gray-400">לחץ על "חשב הכנסות" כדי לחשב</p>
                  </div>
                )}
                
                {properties.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-md font-medium mb-4">חלוקת הכנסות לפי נכסים</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-right p-2 border">נכס</th>
                            <th className="text-right p-2 border">אחוז בעלות</th>
                            <th className="text-right p-2 border">שכ"ד חודשי</th>
                            <th className="text-right p-2 border">חלק בעלים</th>
                          </tr>
                        </thead>
                        <tbody>
                          {properties.map(property => {
                            const ownerInfo = property.owners.find(o => o.owner_id === owner.id);
                            const ownerPercentage = ownerInfo ? ownerInfo.percentage : 0;
                            const monthlyRent = property.rental_details?.monthly_rent || 0;
                            const ownerShare = (monthlyRent * ownerPercentage) / 100;
                            
                            return (
                              <tr key={property.id} className="border-b hover:bg-gray-50">
                                <td className="p-2 border">
                                  {property.property_number}
                                  <span className="text-xs text-gray-500 block">
                                    {property.building_name || ''}
                                  </span>
                                </td>
                                <td className="p-2 border text-center">{ownerPercentage}%</td>
                                <td className="p-2 border text-left">₪{monthlyRent.toLocaleString()}</td>
                                <td className="p-2 border text-left font-medium">₪{ownerShare.toLocaleString()}</td>
                              </tr>
                            );
                          })}
                          <tr className="bg-blue-50">
                            <td colSpan="3" className="p-2 border text-right font-bold">סה"כ הכנסה חודשית</td>
                            <td className="p-2 border text-left font-bold">
                              ₪{(incomeStats?.monthly_income || 0).toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              ביטול
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {owner ? 'עדכן בעל נכס' : 'צור בעל נכס'}
            </Button>
          </div>
        </form>
      </Tabs>
    </Card>
  );
}