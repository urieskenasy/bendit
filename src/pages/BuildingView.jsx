
import React, { useState, useEffect } from 'react';
import { Building, Property, Supplier, Maintenance } from '@/api/entities';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Building2,
  MapPin,
  Home,
  Users,
  Truck,
  Wrench,
  Edit,
  ChevronRight,
  AlertCircle,
  Calendar,
  Info,
  Plus
} from 'lucide-react';

export default function BuildingViewPage() {
  const [building, setBuilding] = useState(null);
  const [properties, setProperties] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // קבלת מזהה הבניין מה-URL
  const urlParams = new URLSearchParams(window.location.search);
  const buildingId = urlParams.get('id');

  useEffect(() => {
    if (buildingId) {
      loadBuildingData();
    }
  }, [buildingId]);

  const loadBuildingData = async () => {
    setIsLoading(true);
    try {
      // טעינת הבניין
      const buildingData = await Building.filter({ id: buildingId });
      if (!buildingData.length) {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "הבניין המבוקש לא נמצא",
        });
        return;
      }
      setBuilding(buildingData[0]);

      // טעינת נתונים קשורים
      const [propertiesData, suppliersData, maintenanceData] = await Promise.all([
        Property.filter({ building_id: buildingId }),
        Supplier.list(),
        Maintenance.list()
      ]);

      setProperties(propertiesData);
      
      // סינון ספקים רלוונטיים
      const relatedSuppliers = suppliersData.filter(supplier => 
        supplier.related_buildings?.includes(buildingId)
      );
      setSuppliers(relatedSuppliers);
      
      // סינון משימות תחזוקה רלוונטיות
      const relatedMaintenance = maintenanceData.filter(item => 
        item.related_to?.type === 'building' && 
        item.related_to.id === buildingId
      );
      setMaintenance(relatedMaintenance);

    } catch (error) {
      console.error('Error loading building data:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בטעינת נתונים",
        description: "אירעה שגיאה בטעינת פרטי הבניין",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!building) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium">הבניין לא נמצא</h3>
          <p className="text-gray-500 mt-2">הבניין המבוקש לא נמצא או שאין לך הרשאות לצפות בו.</p>
          <Button asChild className="mt-4">
            <Link to={createPageUrl('Properties')}>חזרה לרשימת הנכסים</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* כותרת וכפתורי פעולה */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {building.name}
          </h1>
          <div className="flex items-center gap-2 mt-2 text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>
              {building.address?.street} {building.address?.number}, {building.address?.city}
            </span>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link to={createPageUrl(`BuildingEdit?id=${buildingId}`)}>
            <Edit className="w-4 h-4 mr-2" />
            ערוך בניין
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">פרטי בניין</TabsTrigger>
          <TabsTrigger value="properties">
            נכסים ({properties.length})
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            ספקים ({suppliers.length})
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            תחזוקה ({maintenance.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">פרטים כלליים</h3>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">סוג בניין</dt>
                        <dd className="font-medium">
                          {building.building_type === 'residential' && 'מגורים'}
                          {building.building_type === 'commercial' && 'מסחרי'}
                          {building.building_type === 'mixed' && 'מעורב'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">מיקוד</dt>
                        <dd className="font-medium">{building.address?.postal_code || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">שנת בנייה</dt>
                        <dd className="font-medium">{building.details?.year_built || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">מספר קומות</dt>
                        <dd className="font-medium">{building.details?.total_floors || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">סטטוס</dt>
                        <dd>
                          <Badge className={building.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {building.status === 'active' ? 'פעיל' : 'לא פעיל'}
                          </Badge>
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">ועד בית</h3>
                    {building.building_committee ? (
                      <dl className="space-y-3">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">איש קשר</dt>
                          <dd className="font-medium">{building.building_committee.name || '-'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">טלפון</dt>
                          <dd className="font-medium">{building.building_committee.phone || '-'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">דמי ועד חודשיים</dt>
                          <dd className="font-medium">
                            {building.building_committee.monthly_fee ? `₪${building.building_committee.monthly_fee}` : '-'}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-gray-500">לא הוגדר ועד בית</p>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">מתקנים בבניין</h3>
                    {building.amenities && building.amenities.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {building.amenities.map(amenity => (
                          <Badge key={amenity} className="bg-blue-50 text-blue-700 py-1">
                            {amenity === 'elevator' && 'מעלית'}
                            {amenity === 'parking' && 'חניה'}
                            {amenity === 'storage' && 'מחסן'}
                            {amenity === 'lobby' && 'לובי'}
                            {amenity === 'security' && 'אבטחה'}
                            {amenity === 'camera' && 'מצלמות'}
                            {amenity === 'garden' && 'גינה'}
                            {amenity === 'playground' && 'מגרש משחקים'}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">לא הוגדרו מתקנים</p>
                    )}
                  </div>

                  {building.notes && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">הערות</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-wrap">{building.notes}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold mb-3">סטטיסטיקה</h3>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">מספר נכסים</dt>
                        <dd className="font-medium">{properties.length}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">מספר ספקים</dt>
                        <dd className="font-medium">{suppliers.length}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">משימות תחזוקה פתוחות</dt>
                        <dd className="font-medium">
                          {maintenance.filter(m => m.status === 'open' || m.status === 'in_progress').length}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  נכסים בבניין
                </span>
                <Button asChild size="sm">
                  <Link to={createPageUrl(`Properties?building=${buildingId}`)}>
                    <ChevronRight className="h-4 w-4 ml-2" />
                    לדף הנכסים
                  </Link>
                </Button>
              </CardTitle>
              <CardDescription>
                רשימת כל הנכסים המשויכים לבניין זה
              </CardDescription>
            </CardHeader>
            <CardContent>
              {properties.length === 0 ? (
                <div className="text-center py-8">
                  <Info className="h-8 w-8 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">אין נכסים בבניין זה</h3>
                  <p className="text-gray-500 mt-1">ניתן להוסיף נכסים חדשים מדף הנכסים</p>
                  <Button asChild className="mt-4">
                    <Link to={createPageUrl(`Properties?building=${buildingId}`)}>
                      <Plus className="h-4 w-4 ml-2" />
                      הוסף נכס לבניין
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {properties.map(property => (
                    <Card key={property.id} className="bg-gray-50 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{property.property_number}</span>
                          </div>
                          <Badge className={
                            property.rental_details?.status === 'available' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }>
                            {property.rental_details?.status === 'available' ? 'פנוי' : 'מושכר'}
                          </Badge>
                        </div>
                        <dl className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <dt className="text-gray-500">סוג</dt>
                            <dd>
                              {property.type === 'apartment' && 'דירה'}
                              {property.type === 'office' && 'משרד'}
                              {property.type === 'store' && 'חנות'}
                              {property.type === 'parking' && 'חניה'}
                              {property.type === 'storage' && 'מחסן'}
                              {property.type === 'warehouse' && 'מחסן'}
                            </dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-500">קומה</dt>
                            <dd>{property.floor || '-'}</dd>
                          </div>
                          {property.measurements?.total_sqm && (
                            <div className="flex justify-between">
                              <dt className="text-gray-500">שטח</dt>
                              <dd>{property.measurements.total_sqm} מ"ר</dd>
                            </div>
                          )}
                        </dl>
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <Button asChild variant="outline" size="sm" className="w-full">
                            <Link to={createPageUrl(`Properties?property=${property.id}`)}>
                              <ChevronRight className="h-4 w-4 ml-1" />
                              פרטי הנכס
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                ספקים לבניין
              </CardTitle>
              <CardDescription>
                ספקי שירות המשויכים לבניין זה
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suppliers.length === 0 ? (
                <div className="text-center py-8">
                  <Info className="h-8 w-8 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">אין ספקים משויכים</h3>
                  <p className="text-gray-500 mt-1">ניתן להוסיף ספקים חדשים מדף הספקים</p>
                  <Button asChild className="mt-4">
                    <Link to={createPageUrl('Suppliers')}>
                      <Plus className="h-4 w-4 ml-2" />
                      הוסף ספק
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {suppliers.map(supplier => (
                    <Card key={supplier.id} className="bg-gray-50 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-medium">{supplier.name}</div>
                            <div className="text-sm text-gray-500">{supplier.service_type}</div>
                          </div>
                          <Badge variant="outline">ספק</Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          {supplier.phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">טלפון:</span>
                              <span>{supplier.phone}</span>
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">דוא"ל:</span>
                              <span className="truncate">{supplier.email}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <Button asChild variant="outline" size="sm" className="w-full">
                            <Link to={createPageUrl(`Suppliers?id=${supplier.id}`)}>
                              <ChevronRight className="h-4 w-4 ml-1" />
                              פרטי הספק
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                משימות תחזוקה
              </CardTitle>
              <CardDescription>
                משימות תחזוקה הקשורות לבניין זה
              </CardDescription>
            </CardHeader>
            <CardContent>
              {maintenance.length === 0 ? (
                <div className="text-center py-8">
                  <Info className="h-8 w-8 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">אין משימות תחזוקה</h3>
                  <p className="text-gray-500 mt-1">ניתן להוסיף משימות חדשות מדף התחזוקה</p>
                  <Button asChild className="mt-4">
                    <Link to={createPageUrl('Maintenance')}>
                      <Plus className="h-4 w-4 ml-2" />
                      הוסף משימת תחזוקה
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {maintenance.map(task => (
                    <div key={task.id} className="py-4 flex justify-between items-start">
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-gray-500">{task.description?.slice(0, 100)}{task.description?.length > 100 ? '...' : ''}</div>
                        {task.reported_date && (
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.reported_date).toLocaleDateString('he-IL')}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          task.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {task.status === 'open' && 'פתוח'}
                          {task.status === 'in_progress' && 'בטיפול'}
                          {task.status === 'completed' && 'הושלם'}
                          {task.status === 'cancelled' && 'בוטל'}
                        </Badge>
                        <Badge className={
                          task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {task.priority === 'urgent' && 'דחוף'}
                          {task.priority === 'high' && 'גבוה'}
                          {task.priority === 'medium' && 'בינוני'}
                          {task.priority === 'low' && 'נמוך'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
