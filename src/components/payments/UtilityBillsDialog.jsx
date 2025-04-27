
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { BaseParameters } from '@/api/entities';
import { Payment } from '@/api/entities';
import { 
  Zap, 
  Droplet, 
  Flame, 
  Home, 
  Wifi, 
  Calculator,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function UtilityBillsDialog({ payment, contract, onSave }) {
  const [baseParams, setBaseParams] = useState(null);
  const [utilityBills, setUtilityBills] = useState({
    electricity: {
      current_reading: 0,
      previous_reading: 0,
      consumption: 0,
      amount: 0,
      reading_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'unpaid',
      notes: ''
    },
    water: {
      current_reading: 0,
      previous_reading: 0,
      consumption: 0,
      amount: 0,
      reading_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'unpaid',
      notes: ''
    },
    gas: {
      current_reading: 0,
      previous_reading: 0,
      consumption: 0,
      amount: 0,
      reading_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'unpaid',
      notes: ''
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
  });
  const [activeTab, setActiveTab] = useState("electricity");
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    if (openDialog) {
      loadBaseParameters();
      
      // Initialize with existing data if available
      if (payment.utility_bills) {
        setUtilityBills(payment.utility_bills);
      } else {
        // Try to get previous readings from the contract or tenant
        initializePreviousReadings();
      }
    }
  }, [openDialog, payment]);

  const loadBaseParameters = async () => {
    try {
      const allParams = await BaseParameters.list();
      const activeParams = allParams.find(p => p.is_active);
      setBaseParams(activeParams);
    } catch (error) {
      console.error('Error loading base parameters:', error);
    }
  };

  const initializePreviousReadings = async () => {
    try {
      // Find previous payments for this property/tenant
      const previousPayments = await Payment.list();
      
      // Filter for the same property and tenant
      const propertyTenantPayments = previousPayments.filter(
        p => p.property_id === payment.property_id && 
        p.related_to?.id === payment.related_to?.id &&
        p.utility_bills
      ).sort((a, b) => new Date(b.date) - new Date(a.date));
      
      if (propertyTenantPayments.length > 0) {
        const latestPayment = propertyTenantPayments[0];
        
        // Initialize with readings from latest payment
        setUtilityBills(prev => ({
          ...prev,
          electricity: {
            ...prev.electricity,
            previous_reading: latestPayment.utility_bills?.electricity?.current_reading || 0
          },
          water: {
            ...prev.water,
            previous_reading: latestPayment.utility_bills?.water?.current_reading || 0
          },
          gas: {
            ...prev.gas,
            previous_reading: latestPayment.utility_bills?.gas?.current_reading || 0
          }
        }));
      }
      
      // Check contract for property tax fixed amount
      if (contract && contract.includes_utilities?.property_tax === false) {
        // If property tax is not included, set from contract amount if available
        setUtilityBills(prev => ({
          ...prev,
          property_tax: {
            ...prev.property_tax,
            amount: contract.includes_utilities?.property_tax_amount || 0
          }
        }));
      } else if (contract && contract.includes_utilities?.property_tax === true) {
        // If property tax is included in rent
        setUtilityBills(prev => ({
          ...prev,
          property_tax: {
            ...prev.property_tax,
            status: 'included'
          }
        }));
      }
      
      // Check for other utilities in contract
      if (contract) {
        if (contract.includes_utilities?.electricity) {
          setUtilityBills(prev => ({
            ...prev,
            electricity: {
              ...prev.electricity,
              status: 'included'
            }
          }));
        }
        
        if (contract.includes_utilities?.water) {
          setUtilityBills(prev => ({
            ...prev,
            water: {
              ...prev.water,
              status: 'included'
            }
          }));
        }
        
        if (contract.includes_utilities?.gas) {
          setUtilityBills(prev => ({
            ...prev,
            gas: {
              ...prev.gas,
              status: 'included'
            }
          }));
        }
        
        if (contract.includes_utilities?.internet) {
          setUtilityBills(prev => ({
            ...prev,
            internet: {
              ...prev.internet,
              status: 'included'
            }
          }));
        }
      }
      
    } catch (error) {
      console.error('Error initializing previous readings:', error);
    }
  };

  const calculateConsumption = (utility) => {
    const current = parseFloat(utilityBills[utility].current_reading) || 0;
    const previous = parseFloat(utilityBills[utility].previous_reading) || 0;
    const consumption = Math.max(0, current - previous);
    
    return consumption;
  };

  const calculateAmount = (utility, consumption) => {
    if (!baseParams) return 0;
    
    let amount = 0;
    
    switch (utility) {
      case 'electricity':
        // Calculate based on rate per kwh and fixed fee
        const electricityRate = baseParams.utility_rates?.electricity?.rate_per_kwh || 0;
        const electricityFixed = baseParams.utility_rates?.electricity?.fixed_fee || 0;
        amount = (consumption * electricityRate) + electricityFixed;
        break;
        
      case 'water':
        // Calculate based on rate per cubic meter and sewage
        const waterRate = baseParams.utility_rates?.water?.rate_per_cubic || 0;
        const sewageRate = baseParams.utility_rates?.water?.sewage_rate || 0;
        amount = consumption * (waterRate + sewageRate);
        break;
        
      case 'gas':
        // Simple gas rate calculation
        const gasRate = baseParams.utility_rates?.gas || 0;
        amount = consumption * gasRate;
        break;
    }
    
    return Math.round(amount * 100) / 100;
  };

  const handleReadingChange = (utility, field, value) => {
    // Update the reading value
    setUtilityBills(prev => ({
      ...prev,
      [utility]: {
        ...prev[utility],
        [field]: value
      }
    }));
    
    // If changing current reading, recalculate consumption and amount
    if (field === 'current_reading') {
      const consumption = calculateConsumption(utility);
      const amount = calculateAmount(utility, consumption);
      
      setUtilityBills(prev => ({
        ...prev,
        [utility]: {
          ...prev[utility],
          consumption,
          amount
        }
      }));
    }
    
    // Update total amount
    updateTotalAmount();
  };

  const handleFixedAmountChange = (utility, amount) => {
    setUtilityBills(prev => ({
      ...prev,
      [utility]: {
        ...prev[utility],
        amount: parseFloat(amount) || 0
      }
    }));
    
    // Update total amount
    updateTotalAmount();
  };

  const handleStatusChange = (utility, status) => {
    setUtilityBills(prev => ({
      ...prev,
      [utility]: {
        ...prev[utility],
        status
      }
    }));
  };

  const updateTotalAmount = () => {
    // Calculate total of all utility bills
    setTimeout(() => {
      const total = 
        (utilityBills.electricity.status !== 'included' ? utilityBills.electricity.amount : 0) +
        (utilityBills.water.status !== 'included' ? utilityBills.water.amount : 0) +
        (utilityBills.gas.status !== 'included' ? utilityBills.gas.amount : 0) +
        (utilityBills.property_tax.status !== 'included' ? utilityBills.property_tax.amount : 0) +
        (utilityBills.internet.status !== 'included' ? utilityBills.internet.amount : 0);
      
      setUtilityBills(prev => ({
        ...prev,
        total_amount: Math.round(total * 100) / 100
      }));
    }, 100);
  };

  const handleSave = () => {
    // Update the payment with the utility bills data
    onSave({
      ...payment,
      utility_bills: utilityBills
    });
    
    setOpenDialog(false);
  };

  return (
    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
        >
          {payment.utility_bills?.total_amount > 0 ? (
            <>
              <span>₪{payment.utility_bills.total_amount}</span>
              {Object.keys(payment.utility_bills).some(
                key => payment.utility_bills[key]?.status === 'unpaid'
              ) ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-500 ml-1" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 text-green-500 ml-1" />
              )}
            </>
          ) : (
            <>
              <span>חשבונות</span>
              <Calculator className="w-3.5 h-3.5" />
            </>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ניהול חשבונות</DialogTitle>
          <DialogDescription>
            עדכון וחישוב חשבונות נוספים לתשלום
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="electricity" className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              חשמל
            </TabsTrigger>
            <TabsTrigger value="water" className="flex items-center gap-1">
              <Droplet className="w-4 h-4" />
              מים
            </TabsTrigger>
            <TabsTrigger value="gas" className="flex items-center gap-1">
              <Flame className="w-4 h-4" />
              גז
            </TabsTrigger>
            <TabsTrigger value="property_tax" className="flex items-center gap-1">
              <Home className="w-4 h-4" />
              ארנונה
            </TabsTrigger>
            <TabsTrigger value="internet" className="flex items-center gap-1">
              <Wifi className="w-4 h-4" />
              אינטרנט
            </TabsTrigger>
          </TabsList>
          
          {/* Electricity Tab */}
          <TabsContent value="electricity" className="p-4 border rounded-md mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="electricity-included"
                  checked={utilityBills.electricity.status === 'included'}
                  onCheckedChange={(checked) => 
                    handleStatusChange('electricity', checked ? 'included' : 'unpaid')
                  }
                />
                <Label htmlFor="electricity-included">חשמל כלול בשכירות</Label>
              </div>
              
              {utilityBills.electricity.status !== 'included' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>קריאה קודמת</Label>
                      <Input 
                        type="number" 
                        value={utilityBills.electricity.previous_reading}
                        onChange={(e) => handleReadingChange('electricity', 'previous_reading', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>קריאה נוכחית</Label>
                      <Input 
                        type="number" 
                        value={utilityBills.electricity.current_reading}
                        onChange={(e) => handleReadingChange('electricity', 'current_reading', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>צריכה (קוט"ש)</Label>
                      <Input 
                        readOnly
                        value={utilityBills.electricity.consumption}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>סכום לתשלום</Label>
                      <Input 
                        type="number"
                        value={utilityBills.electricity.amount}
                        onChange={(e) => handleFixedAmountChange('electricity', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>תאריך קריאה</Label>
                      <Input 
                        type="date"
                        value={utilityBills.electricity.reading_date}
                        onChange={(e) => handleReadingChange('electricity', 'reading_date', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>סטטוס</Label>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="electricity-paid"
                          checked={utilityBills.electricity.status === 'paid'}
                          onCheckedChange={(checked) => 
                            handleStatusChange('electricity', checked ? 'paid' : 'unpaid')
                          }
                        />
                        <Label htmlFor="electricity-paid">שולם</Label>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          
          {/* Water Tab */}
          <TabsContent value="water" className="p-4 border rounded-md mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="water-included"
                  checked={utilityBills.water.status === 'included'}
                  onCheckedChange={(checked) => 
                    handleStatusChange('water', checked ? 'included' : 'unpaid')
                  }
                />
                <Label htmlFor="water-included">מים כלולים בשכירות</Label>
              </div>
              
              {utilityBills.water.status !== 'included' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>קריאה קודמת</Label>
                      <Input 
                        type="number" 
                        value={utilityBills.water.previous_reading}
                        onChange={(e) => handleReadingChange('water', 'previous_reading', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>קריאה נוכחית</Label>
                      <Input 
                        type="number" 
                        value={utilityBills.water.current_reading}
                        onChange={(e) => handleReadingChange('water', 'current_reading', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>צריכה (מ"ק)</Label>
                      <Input 
                        readOnly
                        value={utilityBills.water.consumption}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>סכום לתשלום</Label>
                      <Input 
                        type="number"
                        value={utilityBills.water.amount}
                        onChange={(e) => handleFixedAmountChange('water', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>תאריך קריאה</Label>
                      <Input 
                        type="date"
                        value={utilityBills.water.reading_date}
                        onChange={(e) => handleReadingChange('water', 'reading_date', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>סטטוס</Label>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="water-paid"
                          checked={utilityBills.water.status === 'paid'}
                          onCheckedChange={(checked) => 
                            handleStatusChange('water', checked ? 'paid' : 'unpaid')
                          }
                        />
                        <Label htmlFor="water-paid">שולם</Label>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          
          {/* Gas Tab */}
          <TabsContent value="gas" className="p-4 border rounded-md mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="gas-included"
                  checked={utilityBills.gas.status === 'included'}
                  onCheckedChange={(checked) => 
                    handleStatusChange('gas', checked ? 'included' : 'unpaid')
                  }
                />
                <Label htmlFor="gas-included">גז כלול בשכירות</Label>
              </div>
              
              {utilityBills.gas.status !== 'included' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>קריאה קודמת</Label>
                      <Input 
                        type="number" 
                        value={utilityBills.gas.previous_reading}
                        onChange={(e) => handleReadingChange('gas', 'previous_reading', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>קריאה נוכחית</Label>
                      <Input 
                        type="number" 
                        value={utilityBills.gas.current_reading}
                        onChange={(e) => handleReadingChange('gas', 'current_reading', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>צריכה</Label>
                      <Input 
                        readOnly
                        value={utilityBills.gas.consumption}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>סכום לתשלום</Label>
                      <Input 
                        type="number"
                        value={utilityBills.gas.amount}
                        onChange={(e) => handleFixedAmountChange('gas', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>תאריך קריאה</Label>
                      <Input 
                        type="date"
                        value={utilityBills.gas.reading_date}
                        onChange={(e) => handleReadingChange('gas', 'reading_date', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>סטטוס</Label>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="gas-paid"
                          checked={utilityBills.gas.status === 'paid'}
                          onCheckedChange={(checked) => 
                            handleStatusChange('gas', checked ? 'paid' : 'unpaid')
                          }
                        />
                        <Label htmlFor="gas-paid">שולם</Label>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          
          {/* Property Tax Tab */}
          <TabsContent value="property_tax" className="p-4 border rounded-md mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="property-tax-included"
                  checked={utilityBills.property_tax.status === 'included'}
                  onCheckedChange={(checked) => 
                    handleStatusChange('property_tax', checked ? 'included' : 'unpaid')
                  }
                />
                <Label htmlFor="property-tax-included">ארנונה כלולה בשכירות</Label>
              </div>
              
              {utilityBills.property_tax.status !== 'included' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>תקופת חיוב</Label>
                      <Input 
                        value={utilityBills.property_tax.period}
                        onChange={(e) => {
                          setUtilityBills(prev => ({
                            ...prev,
                            property_tax: {
                              ...prev.property_tax,
                              period: e.target.value
                            }
                          }));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>סכום לתשלום</Label>
                      <Input 
                        type="number"
                        value={utilityBills.property_tax.amount}
                        onChange={(e) => handleFixedAmountChange('property_tax', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>סטטוס</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="property-tax-paid"
                        checked={utilityBills.property_tax.status === 'paid'}
                        onCheckedChange={(checked) => 
                          handleStatusChange('property_tax', checked ? 'paid' : 'unpaid')
                        }
                      />
                      <Label htmlFor="property-tax-paid">שולם</Label>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          
          {/* Internet Tab */}
          <TabsContent value="internet" className="p-4 border rounded-md mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="internet-included"
                  checked={utilityBills.internet.status === 'included'}
                  onCheckedChange={(checked) => 
                    handleStatusChange('internet', checked ? 'included' : 'unpaid')
                  }
                />
                <Label htmlFor="internet-included">אינטרנט כלול בשכירות</Label>
              </div>
              
              {utilityBills.internet.status !== 'included' && (
                <>
                  <div className="space-y-2">
                    <Label>סכום לתשלום</Label>
                    <Input 
                      type="number"
                      value={utilityBills.internet.amount}
                      onChange={(e) => handleFixedAmountChange('internet', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>סטטוס</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="internet-paid"
                        checked={utilityBills.internet.status === 'paid'}
                        onCheckedChange={(checked) => 
                          handleStatusChange('internet', checked ? 'paid' : 'unpaid')
                        }
                      />
                      <Label htmlFor="internet-paid">שולם</Label>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="flex justify-between items-center">
            <span>סה"כ לתשלום עבור חשבונות:</span>
            <span className="font-bold text-lg">₪{utilityBills.total_amount}</span>
          </AlertDescription>
        </Alert>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setOpenDialog(false)}
          >
            ביטול
          </Button>
          <Button 
            type="button" 
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700"
          >
            שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
