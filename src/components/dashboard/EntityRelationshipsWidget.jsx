import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function EntityRelationshipsWidget() {
  // מבנה היררכי של הישויות במערכת - בניין -> נכס -> חוזה וכו'
  const hierarchyData = [
    {
      name: 'בניין (Building)',
      children: [
        {
          name: 'נכס (Property)',
          children: [
            {
              name: 'חוזה (Contract)',
              children: [
                { name: 'דייר (Tenant)', children: [] },
                { name: 'ערבויות (Guarantees)', children: [] },
                { 
                  name: 'תשלומים (Payments)', 
                  children: [
                    { name: 'מסמכים (Documents)', children: [] }
                  ] 
                }
              ]
            }
          ]
        }
      ]
    }
  ];

  // ישויות צד שאינן חלק מההיררכיה הישירה
  const sideEntities = [
    { name: 'ספקים (Suppliers)', relatesTo: ['בניין', 'נכס'] },
    { name: 'תחזוקה (Maintenance)', relatesTo: ['בניין', 'נכס', 'ספקים'] },
    { name: 'בעלי נכסים (Owners)', relatesTo: ['נכס'] },
    { name: 'תזכורות (Reminders)', relatesTo: ['חוזה', 'דייר', 'תשלום', 'תחזוקה'] },
    { name: 'דוחות (Reports)', relatesTo: ['*כל הישויות'] }
  ];

  return (
    <Card className="border-t-4 border-t-indigo-500">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Network className="h-5 w-5 text-indigo-500" />
          תרשים היררכית ישויות
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* תרשים היררכיה */}
          <div className="border-r-2 border-indigo-100 pr-4">
            {hierarchyData.map((entity, idx) => (
              <EntityTree key={idx} entity={entity} level={0} />
            ))}
          </div>
          
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            <h4 className="font-semibold text-indigo-700 mb-1">ישויות קשורות:</h4>
            <ul className="list-disc list-inside space-y-1 pr-2">
              {sideEntities.map((entity, idx) => (
                <li key={idx}>
                  <span className="font-medium">{entity.name}</span>
                  {entity.relatesTo.length > 0 && (
                    <span className="text-gray-500 text-xs"> ← קשור ל: {entity.relatesTo.join(', ')}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="text-center">
            <Link to={createPageUrl("Reports")}>
              <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                <span>צפייה בדוחות</span>
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// רכיב המציג את עץ ההיררכיה של הישויות
function EntityTree({ entity, level }) {
  const paddingStyle = { paddingRight: `${level * 12}px` };
  
  return (
    <div className="py-1" style={paddingStyle}>
      <div className="flex items-center gap-1 font-medium text-gray-800">
        {level > 0 && <span className="text-sm text-indigo-400">└─</span>}
        <span>{entity.name}</span>
      </div>
      
      {entity.children && entity.children.map((child, idx) => (
        <EntityTree key={idx} entity={child} level={level + 1} />
      ))}
    </div>
  );
}