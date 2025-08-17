// Netlify Function: parse-spec
export async function handler(event) {
  // CORS בסיסי
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const text = (body.text || '').toLowerCase();
    const action = body.action || 'spec';

    // "NL→Spec" דמו פשטני
    const entities = [];
    if (text.includes('invoice') || text.includes('client')) {
      entities.push(
        { name: 'clients', fields: [
          { name:'name', type:'string' },
          { name:'email', type:'string' },
          { name:'phone', type:'string' }
        ]},
        { name: 'invoices', fields: [
          { name:'clientId', type:'ref:clients' },
          { name:'total', type:'number' },
          { name:'status', type:'enum:Draft,Paid,Overdue' },
          { name:'issuedAt', type:'date' }
        ]},
        { name: 'payments', fields: [
          { name:'invoiceId', type:'ref:invoices' },
          { name:'amount', type:'number' },
          { name:'paidAt', type:'date' }
        ]}
      );
    } else if (text.includes('todo') || text.includes('task')) {
      entities.push(
        { name:'tasks', fields:[
          { name:'title', type:'string' },
          { name:'due', type:'date' },
          { name:'status', type:'enum:Open,Done' }
        ]}
      );
    } else {
      entities.push(
        { name:'items', fields:[
          { name:'title', type:'string' },
          { name:'status', type:'string' }
        ]}
      );
    }

    const spec = {
      app: 'Abracadabra Demo',
      language: 'en',        // ברירת מחדל אנגלית
      entities
    };

    // דמו-פריוויו (טבלה + "גרף" טקסטואלי)
    const preview = {
      tableRows: demoRows(entities[0]?.name),
      chart: [
        { label: 'Draft', value: 3 },
        { label: 'Paid', value: 6 },
        { label: 'Overdue', value: 2 }
      ]
    };

    const payload = (action === 'preview')
      ? { ok:true, spec, preview }
      : { ok:true, spec };

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok:false, error: e.message })
    };
  }
}

function demoRows(kind='items'){
  if (kind === 'clients') {
    return [
      { name:'Acme Ltd', status:'Active', total:'$12,300' },
      { name:'Globex', status:'Active', total:'$5,100' },
      { name:'Initech', status:'On Hold', total:'$800' },
    ];
  }
  if (kind === 'tasks') {
    return [
      { name:'Draft proposal', status:'Open' },
      { name:'Email client', status:'Done' },
      { name:'Schedule meeting', status:'Open' },
    ];
  }
  return [
      { name:'Sample A', status:'Draft' },
      { name:'Sample B', status:'Paid' },
      { name:'Sample C', status:'Overdue' },
  ];
}
