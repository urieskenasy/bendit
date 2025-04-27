import React, { useState, useEffect } from 'react';
import { Building } from '@/api/entities';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowLeft, Save } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BuildingForm from '../components/buildings/BuildingForm';

export default function BuildingEditPage() {
  const [building, setBuilding] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // קבלת מזהה הבניין מה-URL
  const urlParams = new URLSearchParams(window.location.search);
  const buildingId = urlParams.get('id');

  useEffect(() => {
    if (buildingId) {
      loadBuildingData();
    } else {
      // אם אין מזהה בניין בקישור, הגענו לדף הוספת בניין חדש
      setIsLoading(false);
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
        navigate(createPageUrl('Properties'));
        return;
      }
      setBuilding(buildingData[0]);
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

  const handleSubmit = async (buildingData) => {
    try {
      if (buildingId) {
        // עדכון בניין קיים
        await Building.update(buildingId, buildingData);
        toast({
          title: "הבניין עודכן בהצלחה",
          description: "פרטי הבניין עודכנו במערכת",
        });
      } else {
        // יצירת בניין חדש
        const newBuilding = await Building.create(buildingData);
        toast({
          title: "הבניין נוצר בהצלחה",
          description: "הבניין החדש נוסף למערכת",
        });
        // נווט לדף הצפייה בבניין החדש
        if (newBuilding && newBuilding.id) {
          navigate(createPageUrl(`BuildingView?id=${newBuilding.id}`));
          return;
        }
      }
      
      // אם זה עדכון בניין קיים, נווט בחזרה לדף הצפייה
      if (buildingId) {
        navigate(createPageUrl(`BuildingView?id=${buildingId}`));
      } else {
        // אם משום מה לא הצלחנו לקבל ID של בניין חדש, נחזור לרשימת הנכסים
        navigate(createPageUrl('Properties'));
      }
    } catch (error) {
      console.error('Error saving building:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בשמירת הבניין",
        description: "אירעה שגיאה בעת שמירת נתוני הבניין",
      });
    }
  };

  const handleCancel = () => {
    if (buildingId) {
      navigate(createPageUrl(`BuildingView?id=${buildingId}`));
    } else {
      navigate(createPageUrl('Properties'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Card>
          <Skeleton className="h-[400px]" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {buildingId ? 'עריכת בניין' : 'בניין חדש'}
        </h1>
        <Button asChild variant="outline">
          <Link to={buildingId ? createPageUrl(`BuildingView?id=${buildingId}`) : createPageUrl('Properties')}>
            <ArrowLeft className="h-4 w-4 ml-2" />
            {buildingId ? 'חזרה לפרטי הבניין' : 'חזרה לרשימת הנכסים'}
          </Link>
        </Button>
      </div>

      <BuildingForm
        building={building}
        buildingCommittees={[]}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}