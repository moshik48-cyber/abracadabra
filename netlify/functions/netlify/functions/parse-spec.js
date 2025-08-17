const Ajv = require("ajv");
const addFormats = require("ajv-formats").default;
const OpenAI = require("openai");
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
    const { transcript, schema, lang = "en" } = JSON.parse(event.body || "{}");
    if (!transcript || !schema) {
      return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "Missing transcript or schema" }) };
    }

    let appSpec = null;
    if (client) {
      const r = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: "You convert natural language app ideas into a strict JSON spec that matches the provided JSON Schema. Return ONLY valid JSON (no markdown). Keys: appName,dataModels,pages." },
          { role: "user", content: `Language: ${lang}\nSchema: ${JSON.stringify(schema)}\nTranscript:\n"""\n${transcript}\n"""` }
        ]
      });
      const raw = (r.choices?.[0]?.message?.content || "").trim();
      const jsonStart = raw.indexOf("{");
      if (jsonStart !== -1) {
        const jsonText = raw.slice(jsonStart);
        try { appSpec = JSON.parse(jsonText); } catch { appSpec = null; }
      }
    }

    if (!appSpec) appSpec = fallbackSpec(transcript, lang).appSpec;

    const ajv = new Ajv({ allErrors: true, strict: false }); addFormats(ajv);
    const validate = ajv.compile(schema);
    if (!validate(appSpec)) {
      appSpec = fallbackSpec(transcript, lang).appSpec;
    }

    return { statusCode: 200, headers: cors(), body: JSON.stringify({ appSpec }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ appSpec: fallbackSpec("", "en").appSpec, note: "fallback_used" }) };
  }
};

function cors() {
  return { "content-type": "application/json", "access-control-allow-origin": "*" };
}

function fallbackSpec(transcript, lang) {
  const t = (transcript || "").toLowerCase();
  const isSales = /invoice|client|quote|הצעת|לקוח|חשבונית/.test(t);
  return isSales ? {
    appSpec: {
      appName: lang === 'he' ? "מעקב לקוחות וחשבוניות" : "Client & Invoice Tracker",
      dataModels: [
        { name: "clients", fields: [
          { name: "name", type: "text", required: true },
          { name: "email", type: "text" },
          { name: "phone", type: "text" }
        ]},
        { name: "invoices", fields: [
          { name: "client", type: "text", required: true },
          { name: "amount", type: "number", required: true },
          { name: "status", type: "select", options: ["New","Sent","Paid","Overdue"] }
        ]}
      ],
      pages: [
        { name: "Dashboard", widgets: [
          { type: "kpi", title: "Total Invoices", source: "invoices", agg: "count" },
          { type: "chart", chart: "bar", title: "Invoices by Status", source: "invoices" }
        ]},
        { name: "Clients", widgets: [
          { type: "table", source: "clients", columns: ["name","email","phone"] },
          { type: "form", title: "New Client", mode: "create", source: "clients" }
        ]}
      ]
    }
  } : {
    appSpec: {
      appName: lang === 'he' ? "ניהול משימות" : "Task Manager",
      dataModels: [
        { name: "tasks", fields: [
          { name: "title", type: "text", required: true },
          { name: "due", type: "date" },
          { name: "status", type: "select", options: ["New", "Doing", "Done"] }
        ]}
      ],
      pages: [
        { name: "Overview", widgets: [
          { type: "kpi", title: "Tasks (7d)", source: "tasks", agg: "count" },
          { type: "chart", chart: "line", title: "Tasks by Day", source: "tasks" }
        ]},
        { name: "Tasks", widgets: [
          { type: "table", source: "tasks", columns: ["title","due","status"] },
          { type: "form", title: "Add Task", mode: "create", source: "tasks" }
        ]}
      ]
    }
  };
}
