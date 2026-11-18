/*
 * VOLQEN ERP — SITE CONFIGURATION
 * --------------------------------------------------------------
 * This is the ONE file to edit for business details.
 * Empty values ("") are treated as "not configured yet": the site
 * hides or labels them instead of showing invented details.
 * Never put passwords or API keys in this file — it is public.
 * Server secrets belong in server/.env (see server/.env.example).
 */
window.VOLQEN_CONFIG = {
  company: {
    name: "Volqen ERP",
    legalName: "",            // e.g. "Volqen Technologies (Pvt.) Ltd." — CONFIRM
    email: "",                // e.g. "sales@volqen.com" — CONFIRM
    phone: "",                // display format, e.g. "+92 300 0000000" — CONFIRM
    whatsapp: "",             // international digits only, e.g. "923000000000" — CONFIRM
    address: "",              // registered office address — CONFIRM
    city: "",                 // e.g. "Lahore" — CONFIRM
    hours: "",                // e.g. "Mon–Fri, 9:00–18:00 PKT" — CONFIRM
    linkedin: "",             // full URL — optional
    facebook: "",             // full URL — optional
    youtube: ""               // full URL — optional
  },

  // Where the demo/contact forms POST to. "/api/leads" is served by
  // server/server.js. Point it to any HTTPS endpoint you prefer later.
  forms: {
    endpoint: "/api/leads",
    // When the backend cannot be reached (e.g. the hosted design preview),
    // show a clearly-labelled preview notice instead of a generic error.
    previewFallback: true
  },

  // SaaS signup. The website talks to server/server.js under "/api".
  signup: {
    apiBase: "/api",
    // Customer ERP sites are created as <subdomain>.<tenantDomain>
    tenantDomain: "volqen.com",          // CONFIRM your domain
    // When the API cannot be reached (hosted design preview), the signup page runs a
    // clearly labelled simulation instead: no payment is taken and no site is created.
    demoFallback: true
  },

  // Shows a thin banner on every page while content is being confirmed.
  previewBanner: true,

  /*
   * PRODUCT CAPABILITY STATUS — drives every badge on the site.
   *   "available" = Available now (verified in the product)
   *   "beta"      = Early access / pilot
   *   "planned"   = On the roadmap
   *   "proposed"  = Proposed — pending confirmation (default)
   * Change a value here and every page updates.
   */
  capabilities: {
    // ERPNext v15 / Frappe HR functionality — available in the software Volqen runs
    "accounting-finance": "available",
    "inventory-warehouse": "available",
    "procurement": "available",
    "sales-crm": "available",
    "manufacturing": "available",
    "quality": "available",
    "hr-payroll": "available",
    "projects": "available",
    "assets-maintenance": "available",
    "business-intelligence": "available",
    "workflow-controls": "available",
    "open-api": "available",
    "bank-statement-import": "available",
    "multi-company": "available",
    "multi-currency": "available",
    "pos": "available",
    // Volqen service status — switch to "available" when the cloud service is live
    "cloud-deployment": "proposed",
    "on-premise-deployment": "proposed",
    // Not yet built
    "fbr-digital-invoicing": "planned",
    "mobile-app": "planned",
    "urdu-interface": "planned",
    "whatsapp-notifications": "planned",
    "biometric-attendance": "planned",
    "ai-assistant": "planned"
  }
};
