
import React from 'react';
import { 
  LayoutDashboard, Building2, Users, FileText, Bell, Home, 
  Truck, Landmark, PieChart 
} from 'lucide-react';

const menuItems = [
  { name: 'דשבורד', icon: LayoutDashboard, href: 'Dashboard' },
  { name: 'נכסים', icon: Building2, href: 'Properties' },
  { name: 'בעלי נכסים', icon: Users, href: 'Owners' },
  { name: 'דיירים', icon: Users, href: 'Tenants' },
  { name: 'חוזים', icon: FileText, href: 'Contracts' },
  { name: 'תשלומים', icon: FileText, href: 'Payments' },
  { name: 'תזכורות', icon: Bell, href: 'Reminders' },
  { name: 'ועדי בתים', icon: Home, href: 'BuildingCommittees' },
  { name: 'ספקים', icon: Truck, href: 'Suppliers' },
  { name: 'מוסדות', icon: Landmark, href: 'Institutions' },
  { name: 'מסמכים', icon: FileText, href: 'Documents' },
  { name: 'דוחות', icon: PieChart, href: 'Reports' },
];

export default function Layout() {
  // Layout implementation here
}
