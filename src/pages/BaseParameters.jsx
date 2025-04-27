import React, { useState, useEffect } from 'react';
import { BaseParameters } from '@/api/entities';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Save, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function BaseParametersPage() {
    const [parameters, setParameters] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadParameters();
    }, []);

    const loadParameters = async () => {
        try {
            setLoading(true);
            const params = await BaseParameters.list();
            let activeParams = params.find(p => p.is_active);
            
            // If no active parameters exist, create default ones
            if (!activeParams) {
                activeParams = {
                    name: "פרמטרים ראשיים",
                    is_active: true,
                    vat: {
                        percentage: 17,
                        last_update: new Date().toISOString().split('T')[0]
                    },
                    consumer_price_index: {
                        value: 100,
                        base_year: new Date().getFullYear(),
                        last_update: new Date().toISOString().split('T')[0]
                    },
                    currency_rates: {
                        usd: 3.6,
                        eur: 4.0,
                        last_update: new Date().toISOString().split('T')[0]
                    },
                    utility_rates: {
                        electricity: {
                            rate_per_kwh: 0.55,
                            fixed_fee: 30
                        },
                        water: {
                            rate_per_cubic: 7.5,
                            sewage_rate: 2.5
                        },
                        gas: 4.2
                    },
                    property_tax_rates: {
                        residential: 35,
                        commercial: 120,
                        office: 90
                    },
                    default_fees: {
                        contract_fee: 1000,
                        broker_fee_percentage: 2,
                        guarantee_fee: 500
                    }
                };
                
                const newParams = await BaseParameters.create(activeParams);
                setParameters(newParams);
            } else {
                setParameters(activeParams);
            }
        } catch (error) {
            console.error('Error loading parameters:', error);
            toast({
                variant: "destructive",
                title: "שגיאה בטעינת נתונים",
                description: "אירעה שגיאה בטעינת נתוני הבסיס"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            setSaving(true);
            if (parameters.id) {
                await BaseParameters.update(parameters.id, parameters);
            } else {
                await BaseParameters.create(parameters);
            }
            toast({
                title: "הנתונים נשמרו בהצלחה",
                description: "נתוני הבסיס עודכנו במערכת"
            });
        } catch (error) {
            console.error('Error saving parameters:', error);
            toast({
                variant: "destructive",
                title: "שגיאה בשמירת נתונים",
                description: "אירעה שגיאה בשמירת נתוני הבסיס"
            });
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (path, value) => {
        const pathArray = path.split('.');
        setParameters(prev => {
            const newParams = { ...prev };
            let current = newParams;
            
            for (let i = 0; i < pathArray.length - 1; i++) {
                current[pathArray[i]] = { ...current[pathArray[i]] };
                current = current[pathArray[i]];
            }
            
            current[pathArray[pathArray.length - 1]] = value;
            
            // Update last_update if relevant
            if (path.startsWith('vat') || path.startsWith('consumer_price_index') || path.startsWith('currency_rates')) {
                const section = pathArray[0];
                if (newParams[section]) {
                    newParams[section].last_update = new Date().toISOString().split('T')[0];
                }
            }
            
            return newParams;
        });
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold">נתוני בסיס</h1>
                <Card className="p-6">
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-8 w-1/2" />
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">נתוני בסיס</h1>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={loadParameters}
                        disabled={loading}
                    >
                        <RefreshCw className="w-4 h-4 ml-2" />
                        רענן
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Save className="w-4 h-4 ml-2" />
                        שמור שינויים
                    </Button>
                </div>
            </div>

            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    נתוני בסיס אלו משמשים לחישובים אוטומטיים במערכת. שינוי ערכים אלו ישפיע על חישובים עתידיים.
                </AlertDescription>
            </Alert>

            <Tabs defaultValue="vat" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="vat">מע״מ ומדדים</TabsTrigger>
                    <TabsTrigger value="utilities">תעריפי חשמל ומים</TabsTrigger>
                    <TabsTrigger value="property">ארנונה</TabsTrigger>
                    <TabsTrigger value="fees">תעריפים נוספים</TabsTrigger>
                </TabsList>

                <TabsContent value="vat">
                    <Card className="p-6">
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>אחוז מע״מ</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            value={parameters.vat?.percentage || 0}
                                            onChange={(e) => handleInputChange('vat.percentage', parseFloat(e.target.value))}
                                            className="flex-1"
                                        />
                                        <span className="text-gray-500">%</span>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        עדכון אחרון: {format(new Date(parameters.vat?.last_update || new Date()), 'dd/MM/yyyy')}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>מדד המחירים לצרכן</Label>
                                    <Input
                                        type="number"
                                        value={parameters.consumer_price_index?.value || 0}
                                        onChange={(e) => handleInputChange('consumer_price_index.value', parseFloat(e.target.value))}
                                    />
                                    <p className="text-sm text-gray-500">
                                        שנת בסיס: {parameters.consumer_price_index?.base_year}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>שער הדולר</Label>
                                    <Input
                                        type="number"
                                        value={parameters.currency_rates?.usd || 0}
                                        onChange={(e) => handleInputChange('currency_rates.usd', parseFloat(e.target.value))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>שער האירו</Label>
                                    <Input
                                        type="number"
                                        value={parameters.currency_rates?.eur || 0}
                                        onChange={(e) => handleInputChange('currency_rates.eur', parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="utilities">
                    <Card className="p-6">
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold">תעריפי חשמל</h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>תעריף לקילוואט שעה</Label>
                                    <Input
                                        type="number"
                                        value={parameters.utility_rates?.electricity?.rate_per_kwh || 0}
                                        onChange={(e) => handleInputChange('utility_rates.electricity.rate_per_kwh', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>תשלום קבוע</Label>
                                    <Input
                                        type="number"
                                        value={parameters.utility_rates?.electricity?.fixed_fee || 0}
                                        onChange={(e) => handleInputChange('utility_rates.electricity.fixed_fee', parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>

                            <h3 className="text-lg font-semibold mt-6">תעריפי מים</h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>תעריף למ״ק</Label>
                                    <Input
                                        type="number"
                                        value={parameters.utility_rates?.water?.rate_per_cubic || 0}
                                        onChange={(e) => handleInputChange('utility_rates.water.rate_per_cubic', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>תעריף ביוב</Label>
                                    <Input
                                        type="number"
                                        value={parameters.utility_rates?.water?.sewage_rate || 0}
                                        onChange={(e) => handleInputChange('utility_rates.water.sewage_rate', parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>תעריף גז</Label>
                                <Input
                                    type="number"
                                    value={parameters.utility_rates?.gas || 0}
                                    onChange={(e) => handleInputChange('utility_rates.gas', parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="property">
                    <Card className="p-6">
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold">תעריפי ארנונה למ״ר</h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>מגורים</Label>
                                    <Input
                                        type="number"
                                        value={parameters.property_tax_rates?.residential || 0}
                                        onChange={(e) => handleInputChange('property_tax_rates.residential', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>מסחרי</Label>
                                    <Input
                                        type="number"
                                        value={parameters.property_tax_rates?.commercial || 0}
                                        onChange={(e) => handleInputChange('property_tax_rates.commercial', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>משרדים</Label>
                                    <Input
                                        type="number"
                                        value={parameters.property_tax_rates?.office || 0}
                                        onChange={(e) => handleInputChange('property_tax_rates.office', parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="fees">
                    <Card className="p-6">
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold">תעריפים נוספים</h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>דמי חוזה ברירת מחדל</Label>
                                    <Input
                                        type="number"
                                        value={parameters.default_fees?.contract_fee || 0}
                                        onChange={(e) => handleInputChange('default_fees.contract_fee', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>אחוז דמי תיווך</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            value={parameters.default_fees?.broker_fee_percentage || 0}
                                            onChange={(e) => handleInputChange('default_fees.broker_fee_percentage', parseFloat(e.target.value))}
                                            className="flex-1"
                                        />
                                        <span className="text-gray-500">%</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>דמי ערבות</Label>
                                    <Input
                                        type="number"
                                        value={parameters.default_fees?.guarantee_fee || 0}
                                        onChange={(e) => handleInputChange('default_fees.guarantee_fee', parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}