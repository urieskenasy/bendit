
import React, { useState, useEffect } from 'react';
import { BuildingCommittee } from '@/api/entities';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Home, Plus, Search } from 'lucide-react';
import CommitteeList from '../components/committees/CommitteeList';
import CommitteeForm from '../components/committees/CommitteeForm';
import { useToast } from "@/components/ui/use-toast"

export default function BuildingCommitteesPage() {
  const [committees, setCommittees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedCommittee, setSelectedCommittee] = useState(null);
  const { toast } = useToast()

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const committeesData = await BuildingCommittee.list();
    setCommittees(committeesData);
  };

  const handleSubmit = async (committeeData) => {
    if (selectedCommittee) {
      await BuildingCommittee.update(selectedCommittee.id, committeeData);
    } else {
      await BuildingCommittee.create(committeeData);
    }
    setShowForm(false);
    setSelectedCommittee(null);
    loadData();
  };

  const handleEdit = (committee) => {
    setSelectedCommittee(committee);
    setShowForm(true);
  };

  const handleDelete = async (committeeId) => {
    try {
      await BuildingCommittee.delete(committeeId);
      loadData();
      toast({
        title: "ועד הבית נמחק בהצלחה",
        description: "ועד הבית הוסר מהמערכת",
      });
    } catch (error) {
      console.error('Error deleting building committee:', error);
      toast({
        variant: "destructive",
        title: "שגיאה במחיקת ועד הבית",
        description: "אירעה שגיאה בעת מחיקת ועד הבית",
      });
    }
  };

  const filteredCommittees = committees.filter(committee =>
    committee.building_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (committee.contact_name && committee.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Home className="w-6 h-6" />
          ועדי בתים
        </h1>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 ml-2" />
          ועד בית חדש
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="חיפוש לפי כתובת או איש קשר..."
            className="pr-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      {showForm && (
        <CommitteeForm
          committee={selectedCommittee}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setSelectedCommittee(null);
          }}
        />
      )}

      <CommitteeList
        committees={filteredCommittees}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
