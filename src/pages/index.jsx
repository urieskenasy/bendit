import Layout from "./Layout.jsx";

import Properties from "./Properties";

import Owners from "./Owners";

import Tenants from "./Tenants";

import Contracts from "./Contracts";

import Payments from "./Payments";

import Reports from "./Reports";

import BuildingCommittees from "./BuildingCommittees";

import Dashboard from "./Dashboard";

import Suppliers from "./Suppliers";

import Documents from "./Documents";

import Reminders from "./Reminders";

import Layout from "./Layout";

import Buildings from "./Buildings";

import Maintenance from "./Maintenance";

import EntityRelationships from "./EntityRelationships";

import BuildingView from "./BuildingView";

import BuildingEdit from "./BuildingEdit";

import SystemLogs from "./SystemLogs";

import BaseParameters from "./BaseParameters";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Properties: Properties,
    
    Owners: Owners,
    
    Tenants: Tenants,
    
    Contracts: Contracts,
    
    Payments: Payments,
    
    Reports: Reports,
    
    BuildingCommittees: BuildingCommittees,
    
    Dashboard: Dashboard,
    
    Suppliers: Suppliers,
    
    Documents: Documents,
    
    Reminders: Reminders,
    
    Layout: Layout,
    
    Buildings: Buildings,
    
    Maintenance: Maintenance,
    
    EntityRelationships: EntityRelationships,
    
    BuildingView: BuildingView,
    
    BuildingEdit: BuildingEdit,
    
    SystemLogs: SystemLogs,
    
    BaseParameters: BaseParameters,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Properties />} />
                
                
                <Route path="/Properties" element={<Properties />} />
                
                <Route path="/Owners" element={<Owners />} />
                
                <Route path="/Tenants" element={<Tenants />} />
                
                <Route path="/Contracts" element={<Contracts />} />
                
                <Route path="/Payments" element={<Payments />} />
                
                <Route path="/Reports" element={<Reports />} />
                
                <Route path="/BuildingCommittees" element={<BuildingCommittees />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Suppliers" element={<Suppliers />} />
                
                <Route path="/Documents" element={<Documents />} />
                
                <Route path="/Reminders" element={<Reminders />} />
                
                <Route path="/Layout" element={<Layout />} />
                
                <Route path="/Buildings" element={<Buildings />} />
                
                <Route path="/Maintenance" element={<Maintenance />} />
                
                <Route path="/EntityRelationships" element={<EntityRelationships />} />
                
                <Route path="/BuildingView" element={<BuildingView />} />
                
                <Route path="/BuildingEdit" element={<BuildingEdit />} />
                
                <Route path="/SystemLogs" element={<SystemLogs />} />
                
                <Route path="/BaseParameters" element={<BaseParameters />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}