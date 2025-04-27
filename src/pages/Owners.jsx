
import React, { useState, useEffect } from 'react';
import { Owner } from '@/api/entities';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Plus, Search } from 'lucide-react';
import OwnerList from '../components/owners/OwnerList';
import OwnerForm from '../components/owners/OwnerForm';
import { useToast } from "@/components/ui/use-toast"

export default function OwnersPage() {
  const [owners, setOwners] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const { toast } = useToast()

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const ownersData = await Owner.list();
    setOwners(ownersData);
  };

  const handleSubmit = async (ownerData) => {
    if (selectedOwner) {
      await Owner.update(selectedOwner.id, ownerData);
    } else {
      await Owner.create(ownerData);
    }
    setShowForm(false);
    setSelectedOwner(null);
    loadData();
  };

  const handleEdit = (owner) => {
    setSelectedOwner(owner);
    setShowForm(true);
  };

  const handleDelete = async (ownerId) => {
    try {
      await Owner.delete(ownerId);
      loadData();
      toast({
        title: "בעל הנכס נמחק בהצלחה",
        description: "בעל הנכס הוסר מהמערכת",
      });
    } catch (error) {
      console.error('Error deleting owner:', error);
      toast({
        variant: "destructive",
        title: "שגיאה במחיקת בעל הנכס",
        description: "אירעה שגיאה בעת מחיקת בעל הנכס",
      });
    }
  };

  const filteredOwners = owners.filter(owner =>
    owner.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6" />
          בעלי נכסים
        </h1>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 ml-2" />
          בעל נכס חדש
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="חיפוש לפי שם..."
            className="pr-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      {showForm && (
        <OwnerForm
          owner={selectedOwner}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setSelectedOwner(null);
          }}
        />
      )}

      <OwnerList
        owners={filteredOwners}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
