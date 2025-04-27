import React, { useState, useEffect } from 'react';
import { Building, BuildingCommittee } from '@/api/entities';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building2, Plus, Search } from 'lucide-react';
import BuildingList from '../components/buildings/BuildingList';
import BuildingForm from '../components/buildings/BuildingForm';

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState([]);
  const [buildingCommittees, setBuildingCommittees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [buildingsData, committeesData] = await Promise.all([
      Building.list(),
      BuildingCommittee.list()
    ]);
    setBuildings(buildingsData);
    setBuildingCommittees(committeesData);
  };

  const handleSubmit = async (buildingData) => {
    if (selectedBuilding) {
      await Building.update(selectedBuilding.id, buildingData);
    } else {
      await Building.create(buildingData);
    }
    setShowForm(false);
    setSelectedBuilding(null);
    loadData();
  };

  const handleEdit = (building) => {
    setSelectedBuilding(building);
    setShowForm(true);
  };

  const filteredBuildings = buildings.filter(building =>
    building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (building.address?.city && building.address.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (building.address?.street && building.address.street.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          ניהול בניינים
        </h1>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 ml-2" />
          בניין חדש
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="חיפוש לפי שם בניין או כתובת..."
            className="pr-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      {showForm && (
        <BuildingForm
          building={selectedBuilding}
          buildingCommittees={buildingCommittees}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setSelectedBuilding(null);
          }}
        />
      )}

      <BuildingList
        buildings={filteredBuildings}
        onEdit={handleEdit}
      />
    </div>
  );
}