import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings, X, GripHorizontal, CalendarRange, BarChart3, PieChart, LineChart, TrendingUp, Clock, Users, Activity, Landmark, Building as Building2, DollarSign, Wrench, FileText, ShieldCheck, Bell, Filter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { User, UserDashboard, Property, Building, Tenant, Contract, Payment, Maintenance } from '@/api/entities';
import { toast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Import all available widgets
import PropertyStatsWidget from '../components/dashboard/PropertyStatsWidget';
import PaymentStatsWidget from '../components/dashboard/PaymentStatsWidget';
import MaintenanceWidget from '../components/dashboard/MaintenanceWidget';
import ContractsWidget from '../components/dashboard/ContractsWidget';
import CashflowWidget from '../components/dashboard/CashflowWidget';
import GuaranteesWidget from '../components/dashboard/GuaranteesWidget';
import AlertsWidget from '../components/dashboard/AlertsWidget';
import UpcomingPaymentsWidget from '../components/dashboard/UpcomingPaymentsWidget';
import OccupancyRateWidget from '../components/dashboard/OccupancyRateWidget';
import RevenueComparisonWidget from '../components/dashboard/RevenueComparisonWidget';
import PropertyTypeDistributionWidget from '../components/dashboard/PropertyTypeDistributionWidget';
import ExpenseDistributionWidget from '../components/dashboard/ExpenseDistributionWidget';
import RecentActivitiesWidget from '../components/dashboard/RecentActivitiesWidget';
import TopTenantsWidget from '../components/dashboard/TopTenantsWidget';
import CalendarWidget from '../components/dashboard/CalendarWidget';

// Widget size configuration
const WIDGET_SIZES = {
  small: { name: 'קטן (1x1)', className: 'col-span-1 row-span-1' },
  medium: { name: 'בינוני (2x1)', className: 'col-span-2 row-span-1' },
  large: { name: 'גדול (3x1)', className: 'col-span-3 row-span-1' },
  xlarge: { name: 'מלא (3x2)', className: 'col-span-3 row-span-2' },
  tall: { name: 'גבוה (1x2)', className: 'col-span-1 row-span-2' },
  wide: { name: 'רחב (2x2)', className: 'col-span-2 row-span-2' },
  custom: { name: 'מותאם אישית', className: '' } // Used for custom positioning
};

const AVAILABLE_WIDGETS = {
  propertyStats: {
    name: 'סטטיסטיקות נכסים',
    component: PropertyStatsWidget,
    defaultSize: 'medium',
    description: 'מציג סטטיסטיקות על הנכסים',
    icon: <Building2 className="w-4 h-4 mb-2 mx-auto text-blue-600" />
  },
  payments: {
    name: 'תשלומים',
    component: PaymentStatsWidget,
    defaultSize: 'medium',
    description: 'מציג מידע על תשלומים',
    icon: <DollarSign className="w-4 h-4 mb-2 mx-auto text-green-600" />
  },
  maintenance: {
    name: 'תחזוקה ומשימות',
    component: MaintenanceWidget,
    defaultSize: 'large',
    description: 'מציג משימות תחזוקה ומעקב',
    icon: <Wrench className="w-4 h-4 mb-2 mx-auto text-yellow-600" />
  },
  contracts: {
    name: 'חוזים',
    component: ContractsWidget,
    defaultSize: 'medium',
    description: 'מציג מידע על חוזים',
    icon: <FileText className="w-4 h-4 mb-2 mx-auto text-indigo-600" />
  },
  cashflow: {
    name: 'תזרים מזומנים',
    component: CashflowWidget,
    defaultSize: 'large',
    description: 'מציג גרף תזרים מזומנים',
    icon: <LineChart className="w-4 h-4 mb-2 mx-auto text-blue-600" />
  },
  guarantees: {
    name: 'ערבויות',
    component: GuaranteesWidget,
    defaultSize: 'medium',
    description: 'מציג מידע על ערבויות',
    icon: <ShieldCheck className="w-4 h-4 mb-2 mx-auto text-yellow-600" />
  },
  alerts: {
    name: 'התראות',
    component: AlertsWidget,
    defaultSize: 'large',
    description: 'מציג התראות מערכת',
    icon: <Bell className="w-4 h-4 mb-2 mx-auto text-red-600" />
  },
  upcomingPayments: {
    name: 'תשלומים קרובים',
    component: UpcomingPaymentsWidget,
    defaultSize: 'medium',
    description: 'מציג תשלומים שמועדם מתקרב',
    icon: <Clock className="w-4 h-4 mb-2 mx-auto text-orange-600" />
  },
  occupancyRate: {
    name: 'שיעור תפוסה',
    component: OccupancyRateWidget,
    defaultSize: 'small',
    description: 'מציג את שיעור התפוסה של הנכסים',
    icon: <BarChart3 className="w-4 h-4 mb-2 mx-auto text-purple-600" />
  },
  revenueComparison: {
    name: 'השוואת הכנסות',
    component: RevenueComparisonWidget,
    defaultSize: 'medium',
    description: 'משווה הכנסות לאורך זמן',
    icon: <TrendingUp className="w-4 h-4 mb-2 mx-auto text-green-600" />
  },
  propertyTypeDistribution: {
    name: 'התפלגות סוגי נכסים',
    component: PropertyTypeDistributionWidget,
    defaultSize: 'small',
    description: 'מציג את התפלגות סוגי הנכסים',
    icon: <PieChart className="w-4 h-4 mb-2 mx-auto text-blue-600" />
  },
  expenseDistribution: {
    name: 'התפלגות הוצאות',
    component: ExpenseDistributionWidget,
    defaultSize: 'small',
    description: 'מציג את התפלגות ההוצאות',
    icon: <PieChart className="w-4 h-4 mb-2 mx-auto text-red-600" />
  },
  recentActivities: {
    name: 'פעילות אחרונה',
    component: RecentActivitiesWidget,
    defaultSize: 'medium',
    description: 'מציג פעילות אחרונה במערכת',
    icon: <Activity className="w-4 h-4 mb-2 mx-auto text-purple-600" />
  },
  topTenants: {
    name: 'שוכרים מובילים',
    component: TopTenantsWidget,
    defaultSize: 'medium',
    description: 'מציג את השוכרים המובילים',
    icon: <Users className="w-4 h-4 mb-2 mx-auto text-indigo-600" />
  },
  calendar: {
    name: 'לוח שנה',
    component: CalendarWidget,
    defaultSize: 'large',
    description: 'מציג לוח שנה עם אירועים חשובים',
    icon: <CalendarRange className="w-4 h-4 mb-2 mx-auto text-blue-600" />
  }
};

export default function DashboardPage() {
  const [layout, setLayout] = useState([]);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [data, setData] = useState({});
  const [gridSize, setGridSize] = useState({ cols: 3, rows: 6 });
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [filteredData, setFilteredData] = useState({});

  useEffect(() => {
    loadDashboardLayout();
    loadData();
  }, []);

  useEffect(() => {
    // כל פעם שנשתנה הבניין הנבחר, נפלטר את הנתונים
    filterDataByBuilding(selectedBuilding);
  }, [selectedBuilding, data]);

  const loadDashboardLayout = async () => {
    try {
      const user = await User.me();
      const dashboardSettings = await UserDashboard.filter({ created_by: user.email });
      
      if (dashboardSettings.length > 0) {
        setLayout(dashboardSettings[0].layout);
      } else {
        // Default layout for new users
        setLayout([
          { id: 'alerts', widget: 'alerts', size: 'large', x: 0, y: 0 },
          { id: 'propertyStats', widget: 'propertyStats', size: 'medium', x: 0, y: 1 },
          { id: 'maintenance', widget: 'maintenance', size: 'large', x: 1, y: 1 }
        ]);
      }
    } catch (error) {
      console.error('Error loading dashboard layout:', error);
      toast({
        title: "שגיאה בטעינת הדשבורד",
        description: "לא ניתן היה לטעון את הגדרות הדשבורד",
        variant: "destructive",
      });
    }
  };

  const loadData = async () => {
    try {
      const [
        properties,
        payments,
        maintenance,
        contracts,
        buildings,
        tenants
      ] = await Promise.all([
        Property.list(),
        Payment.list(),
        Maintenance.list(),
        Contract.list(),
        Building.list(),
        Tenant.list()
      ]);

      const allData = {
        properties,
        payments,
        maintenance,
        contracts,
        buildings,
        tenants
      };

      setData(allData);
      setFilteredData(allData);
      setBuildings(buildings);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  // פונקציה לסינון נתונים לפי בניין
  const filterDataByBuilding = (buildingId) => {
    if (buildingId === 'all' || !data.properties) {
      setFilteredData(data);
      return;
    }

    // סנן נכסים לפי בניין
    const filteredProperties = data.properties.filter(property => property.building_id === buildingId);
    const propertyIds = filteredProperties.map(prop => prop.id);
    
    // סנן חוזים לפי נכסים
    const filteredContracts = data.contracts.filter(contract => propertyIds.includes(contract.property_id));
    
    // סנן דיירים לפי נכסים
    const filteredTenants = data.tenants.filter(tenant => propertyIds.includes(tenant.property_id));
    
    // מזהי חוזים
    const contractIds = filteredContracts.map(contract => contract.id);
    
    // סנן תשלומים לפי נכסים
    const filteredPayments = data.payments.filter(payment => 
      propertyIds.includes(payment.property_id) ||
      (payment.contract_id && contractIds.includes(payment.contract_id))
    );
    
    // סנן משימות תחזוקה לפי נכסים או לפי בניין
    const filteredMaintenance = data.maintenance.filter(task => 
      (task.related_to?.type === 'property' && propertyIds.includes(task.related_to.id)) ||
      (task.related_to?.type === 'building' && task.related_to.id === buildingId)
    );
    
    setFilteredData({
      properties: filteredProperties,
      payments: filteredPayments,
      maintenance: filteredMaintenance,
      contracts: filteredContracts,
      buildings: data.buildings,
      tenants: filteredTenants,
      selectedBuildingId: buildingId
    });
  };

  const handleLayoutChange = async (newLayout) => {
    try {
      // Make sure all widgets have x and y coordinates
      const validatedLayout = newLayout.map((widget, index) => ({
        ...widget,
        x: widget.x !== undefined ? widget.x : 0,
        y: widget.y !== undefined ? widget.y : index
      }));

      const user = await User.me();
      const dashboardSettings = await UserDashboard.filter({ created_by: user.email });
      
      if (dashboardSettings.length > 0) {
        await UserDashboard.update(dashboardSettings[0].id, { layout: validatedLayout });
      } else {
        await UserDashboard.create({ layout: validatedLayout });
      }
      
      setLayout(validatedLayout);
    } catch (error) {
      console.error('Error saving dashboard layout:', error);
      toast({
        title: "שגיאה בשמירת השינויים",
        description: "לא ניתן היה לשמור את השינויים בדשבורד",
        variant: "destructive",
      });
    }
  };

  const addWidget = (widgetType) => {
    // Find an empty position for the new widget
    const widgetSize = AVAILABLE_WIDGETS[widgetType].defaultSize;
    
    // Create the new widget
    const newWidget = {
      id: `${widgetType}_${Date.now()}`,
      widget: widgetType,
      size: widgetSize,
      x: 0, // Default X position
      y: layout.length > 0 ? Math.max(...layout.map(item => item.y)) + 1 : 0
    };

    const newLayout = [...layout, newWidget];
    setLayout(newLayout);
    setShowAddWidget(false);
    handleLayoutChange(newLayout);
  };

  const removeWidget = (widgetId) => {
    const newLayout = layout.filter(item => item.id !== widgetId);
    setLayout(newLayout);
    handleLayoutChange(newLayout);
  };

  const changeWidgetSize = (widgetId, newSize) => {
    const newLayout = layout.map(widget => 
      widget.id === widgetId ? { ...widget, size: newSize } : widget
    );
    setLayout(newLayout);
    handleLayoutChange(newLayout);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(layout);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update Y positions to reflect new order
    const updatedItems = items.map((item, index) => ({
      ...item,
      y: index,
      x: item.x || 0  // Ensure X is defined
    }));

    setLayout(updatedItems);
    handleLayoutChange(updatedItems);
  };

  const getSizeConfig = (size) => {
    return WIDGET_SIZES[size] || WIDGET_SIZES.medium;
  };

  const calculateWidgetGridClass = (widget) => {
    const sizeConfig = getSizeConfig(widget.size);
    return sizeConfig.className;
  };

  // Group widgets by category
  const widgetCategories = {
    "סטטיסטיקות ונתונים": ["propertyStats", "occupancyRate", "propertyTypeDistribution"],
    "פיננסים": ["payments", "cashflow", "revenueComparison", "expenseDistribution", "upcomingPayments", "guarantees"],
    "חוזים ותחזוקה": ["contracts", "maintenance"],
    "התראות ומידע": ["alerts", "recentActivities", "calendar", "topTenants"]
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">דשבורד</h1>
        <div className="flex gap-2">
          <Dialog open={showAddWidget} onOpenChange={setShowAddWidget}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className={editMode ? "bg-white" : "hidden"}
                onClick={() => setShowAddWidget(true)}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                הוסף ווידג'ט
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>הוסף ווידג'ט חדש</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {Object.entries(widgetCategories).map(([category, widgetKeys]) => (
                  <div key={category} className="mb-6">
                    <h3 className="text-lg font-medium mb-3">{category}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {widgetKeys.map(key => {
                        const widget = AVAILABLE_WIDGETS[key];
                        return (
                          <Button
                            key={key}
                            variant="outline"
                            className="h-auto p-4 flex flex-col items-center text-center"
                            onClick={() => addWidget(key)}
                          >
                            {widget.icon}
                            <div className="font-medium">{widget.name}</div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{widget.description}</div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant={editMode ? "default" : "outline"}
            onClick={() => setEditMode(!editMode)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {editMode ? 'סיים עריכה' : 'ערוך דשבורד'}
          </Button>
        </div>
      </div>

      {/* סינון לפי בניין */}
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <Select 
            value={selectedBuilding} 
            onValueChange={setSelectedBuilding}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="סנן לפי בניין" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הבניינים</SelectItem>
              {buildings.map(building => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name} - {building.address?.street} {building.address?.number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedBuilding !== 'all' && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedBuilding('all')}
              className="text-gray-500 hover:text-gray-700"
            >
              נקה סינון
            </Button>
          )}
          
          {selectedBuilding !== 'all' && (
            <div className="text-sm text-blue-600">
              מציג נתונים עבור: {buildings.find(b => b.id === selectedBuilding)?.name}
            </div>
          )}
        </div>
      </Card>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard" direction="vertical">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto"
            >
              <AnimatePresence>
                {layout.map((widget, index) => (
                  <Draggable 
                    key={widget.id} 
                    draggableId={widget.id} 
                    index={index}
                    isDragDisabled={!editMode}
                  >
                    {(provided, snapshot) => (
                      <motion.div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={`
                          bg-white rounded-xl shadow-sm relative
                          ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary ring-opacity-50' : ''}
                          ${calculateWidgetGridClass(widget)}
                        `}
                      >
                        {editMode && (
                          <div className="absolute top-2 right-2 z-10 flex gap-2 items-center bg-white/80 backdrop-blur-sm rounded-lg p-1">
                            <div className="cursor-grab active:cursor-grabbing">
                              <GripHorizontal className="h-5 w-5 text-gray-400" />
                            </div>
                            <select
                              value={widget.size}
                              onChange={(e) => changeWidgetSize(widget.id, e.target.value)}
                              className="text-sm border rounded-md"
                            >
                              <option value="small">קטן (1x1)</option>
                              <option value="medium">בינוני (2x1)</option>
                              <option value="large">גדול (3x1)</option>
                              <option value="tall">גבוה (1x2)</option>
                              <option value="wide">רחב (2x2)</option>
                              <option value="xlarge">מלא (3x2)</option>
                            </select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeWidget(widget.id)}
                              className="bg-white rounded-full shadow-sm hover:bg-red-50"
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                        <div className="p-1">
                          {React.createElement(AVAILABLE_WIDGETS[widget.widget].component, {
                            ...filteredData,
                            size: widget.size
                          })}
                        </div>
                      </motion.div>
                    )}
                  </Draggable>
                ))}
              </AnimatePresence>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}