// netlify/functions/parse-spec.js
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// סכמה פשוטה ל-"Spec" (דמו)
const specSchema = {
  type: "object",
  properties: {
    appName: { type: "string" },
    entities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          fields: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string" }
              },
              required: ["name", "type"]
            }
          }
        },
        required: ["name", "fields"]
      }
    },
    pages: { type: "array" }
  },
  required: ["appName", "entities"]
};

// “NL → Spec” דמו בסיסי מאוד (לוגיקה קצרה)
function naiveNlToSpec(text) {
  const t = (text || "").toLowerCase();
  const isInvoices = t.includes("invoice") || t.includes("חשבונית");
  const isTodo = t.includes("todo") || t.includes("משימות") || t.includes("לוח שנה");
  const isCrm = t.includes("crm") || t.includes("לידים") || t.includes("לקוחות");

  if (isInvoices) {
    return {
      appName: "Client & Invoice Tracker",
      entities: [
        { name: "Client", fields: [{ name: "name", type: "string" }, { name: "email", type: "string" }] },
        { name: "Invoice", fields: [{ name: "clientId", type: "relation" }, { name: "amount", type: "number" }, { name: "status", type: "string" }] }
      ],
      pages: ["Clients", "Invoices", "Dashboard"]
    };
  }
  if (isTodo) {
    return {
      appName: "To-Do with Calendar",
      entities: [
        { name: "Task", fields: [{ name: "title", type: "string" }, { name: "due", type: "date" }, { name: "status", type: "string" }] }
      ],
      pages: ["Tasks", "Calendar"]
    };
  }
  if (isCrm) {
    return {
      appName: "Simple CRM for Leads",
      entities: [
        { name: "Lead", fields: [{ name: "name", type: "string" }, { name: "source", type: "string" }, { name: "stage", type: "string" }] }
      ],
      pages: ["Leads", "Pipeline"]
    };
  }
  // ברירת מחדל
  return {
    appName: "Generic App",
    entities: [
      { name: "Item", fields: [{ name: "title", type: "string" }, { name: "notes", type: "text" }] }
    ],
    pages: ["Home"]
  };
}

export default async (req, context) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: true, health: "ok" }), {
        headers: { "content-type": "application/json" }
      });
    }
    const body = await req.json().catch(() => ({}));
    const { text, preset } = body || {};

    // תמיכה ב־presets מהכפתורים
    let spec;
    if (preset === "invoice") spec = naiveNlToSpec("invoice");
    else if (preset === "todo") spec = naiveNlToSpec("todo");
    else if (preset === "crm") spec = naiveNlToSpec("crm");
    else spec = naiveNlToSpec(text || "");

    // ולידציה
    const validate = ajv.compile(specSchema);
    if (!validate(spec)) {
      return new Response(JSON.stringify({ error: "Invalid spec", details: validate.errors }), {
        status: 400, headers: { "content-type": "application/json" }
      });
    }

    // דמו: החזרת sampleData עבור Preview
    const sampleData = {
      Client: [{ name: "Alice", email: "alice@ex.com" }, { name: "Bob", email: "bob@ex.com" }],
      Invoice: [{ clientId: 1, amount: 1200, status: "Sent" }, { clientId: 2, amount: 800, status: "Paid" }],
      Task: [{ title: "Send quote", due: "2025-08-20", status: "Open" }],
      Lead: [{ name: "Acme", source: "Website", stage: "New" }]
    };

    return new Response(JSON.stringify({ spec, sampleData }), {
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Server error" }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }
};
