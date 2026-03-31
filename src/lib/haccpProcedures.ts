export type HaccpCategory =
  | "personal_hygiene"
  | "cross_contamination"
  | "cleaning"
  | "chilling"
  | "cooking"
  | "hot_holding"
  | "allergens"
  | "suppliers"
  | "pest_control"
  | "traceability";

export type HaccpRecordLink = {
  label: string;
  href: string;
};

export type HaccpProcedure = {
  id: string;
  title: string;
  category: HaccpCategory;
  summary: string;
  scope: string;
  hazards: string[];
  controlMeasures: string[];
  isCcp: boolean;
  criticalLimits: string[];
  monitoring: string[];
  correctiveActions: string[];
  verification: string[];
  records: HaccpRecordLink[];
};
export type HaccpDocumentMeta = {
  title: string;
  version: string;
  reviewedBy: string | null;
  lastReviewedAt: string | null;
  nextReviewDue: string | null;
  reviewIntervalMonths: number;
  siteAddress: string;
  notes: string;
};

export type HaccpProcedureOverrideRow = {
  procedure_key: string;
  title: string | null;
  summary: string | null;
  scope: string | null;
  hazards: string[] | null;
  control_measures: string[] | null;
  critical_limits: string[] | null;
  monitoring: string[] | null;
  corrective_actions: string[] | null;
  verification: string[] | null;
  is_ccp: boolean | null;
};

export const HACCP_CATEGORY_LABELS: Record<HaccpCategory, string> = {
  personal_hygiene: "Personal hygiene",
  cross_contamination: "Cross-contamination",
  cleaning: "Cleaning & disinfection",
  chilling: "Chilled storage",
  cooking: "Cooking & reheating",
  hot_holding: "Hot holding",
  allergens: "Allergen control",
  suppliers: "Delivery & supplier control",
  pest_control: "Pest control",
  traceability: "Traceability & stock control",
};

export const HACCP_PROCEDURES_DEFAULTS: HaccpProcedure[] = [
  {
    id: "personal-hygiene-fitness-to-work",
    title: "Personal hygiene and fitness to work",
    category: "personal_hygiene",
    summary:
      "Staff must be fit for work, wash hands effectively, wear suitable workwear, and report illness or wounds that could affect food safety.",
    scope:
      "Applies to all staff handling food, cleaning food areas, or working around open food.",
    hazards: [
      "Contamination of food from unwashed hands",
      "Contamination from vomiting, diarrhoea, cuts, sores, or poor personal hygiene",
      "Contamination from unsuitable clothing, jewellery, or hair",
    ],
    controlMeasures: [
      "Handwashing facilities available and stocked",
      "Staff trained on handwashing and illness reporting",
      "Cuts and sores covered with waterproof dressings",
      "Clean work clothing and appropriate hair control used",
      "Staff excluded from food handling when not fit for work",
    ],
    isCcp: false,
    criticalLimits: [
      "Food handlers with vomiting or diarrhoea must not handle food",
      "Return to food handling only after being symptom-free for 48 hours",
      "Open cuts must be fully covered with a waterproof dressing",
    ],
    monitoring: [
      "Manager checks staff are fit for work at shift start",
      "Handwashing materials checked during opening checks",
      "Ongoing supervision of hygiene standards during service",
    ],
    correctiveActions: [
      "Remove unfit staff from food handling duties immediately",
      "Discard exposed food handled by staff who were not fit for work if contamination is possible",
      "Retrain staff if hygiene standards are not being followed",
    ],
    verification: [
      "Manager review of diary/sign-off entries",
      "Refresher training records maintained",
      "Periodic review of complaints and incidents linked to hygiene failures",
    ],
    records: [
      { label: "Team & training", href: "/team" },
      { label: "Reports", href: "/reports" },
    ],
  },
  {
    id: "cross-contamination-control",
    title: "Cross-contamination control",
    category: "cross_contamination",
    summary:
      "Raw and ready-to-eat food must be separated during storage, preparation, cleaning and service to prevent bacterial contamination.",
    scope:
      "Applies to deliveries, fridge storage, prep areas, utensils, equipment, and service.",
    hazards: [
      "Transfer of harmful bacteria from raw food to ready-to-eat food",
      "Contamination from dirty utensils, cloths, boards, or hands",
      "Cross-contact between allergens and other foods",
    ],
    controlMeasures: [
      "Raw and ready-to-eat foods stored separately",
      "Dedicated or segregated prep areas and equipment",
      "Colour-coded chopping boards and utensils",
      "Two-stage cleaning between incompatible tasks",
      "Staff handwashing between raw and ready-to-eat handling",
    ],
    isCcp: false,
    criticalLimits: [
      "Ready-to-eat food must not be prepared on contaminated surfaces or with contaminated utensils",
      "Raw food must not drip onto ready-to-eat food",
    ],
    monitoring: [
      "Visual checks of fridge layout and prep flow",
      "Manager or supervisor observation during service and prep",
      "Checks that separate equipment is being used correctly",
    ],
    correctiveActions: [
      "Discard ready-to-eat food if contamination is suspected",
      "Stop prep and clean/disinfect affected surfaces and utensils",
      "Reorganise storage or prep process if repeated failures occur",
    ],
    verification: [
      "Supervisor review",
      "Routine inspection of kitchen layout and practices",
      "Complaint and incident review",
    ],
    records: [
      { label: "Allergens", href: "/allergens" },
      { label: "Cleaning rota", href: "/cleaning-rota" },
      { label: "Reports", href: "/reports" },
    ],
  },
  {
    id: "cleaning-and-disinfection",
    title: "Cleaning and disinfection",
    category: "cleaning",
    summary:
      "Food contact surfaces, equipment and high-touch areas must be cleaned effectively using a defined cleaning and disinfection process.",
    scope:
      "Applies to worktops, utensils, sinks, fridges, touch points, and food prep equipment.",
    hazards: [
      "Bacterial contamination from dirty surfaces and equipment",
      "Allergen cross-contact due to poor cleaning",
      "Chemical contamination through incorrect product use",
    ],
    controlMeasures: [
      "Two-stage cleaning used where required",
      "Correct cleaning products used at correct dilution and contact time",
      "Cleaning schedule in place for routine and deep cleaning",
      "Cloths controlled to avoid spread of contamination",
    ],
    isCcp: false,
    criticalLimits: [
      "Food contact surfaces must be visibly clean and disinfected before use where required",
      "Cleaning chemicals must be suitable for intended use and used to manufacturer instructions",
    ],
    monitoring: [
      "Daily cleaning checks",
      "Task completion through cleaning rota",
      "Manager spot checks of food contact areas and equipment",
    ],
    correctiveActions: [
      "Reclean and disinfect any surface or equipment not cleaned correctly",
      "Stop use of incorrectly diluted or unsuitable chemicals",
      "Retrain staff if cleaning standards are poor",
    ],
    verification: [
      "Manager review of cleaning completion",
      "Four-weekly review of repeat misses or issues",
      "Inspection of cleaning standards during service and close-down",
    ],
    records: [
      { label: "Cleaning rota", href: "/cleaning-rota" },
      { label: "Reports", href: "/reports" },
    ],
  },
  {
    id: "chilled-storage",
    title: "Chilled storage and chilled display",
    category: "chilling",
    summary:
      "High-risk chilled foods must be kept cold enough to prevent bacterial growth and used within safe shelf life.",
    scope:
      "Applies to fridges, chilled display units, prepared chilled foods, and opened high-risk foods.",
    hazards: [
      "Growth of harmful bacteria if chilled foods are held too warm",
      "Use of food beyond safe shelf life or use-by date",
    ],
    controlMeasures: [
      "Chilled food stored in working refrigeration",
      "Fridges set to a safe target temperature",
      "Prepared/opened foods labelled and date controlled",
      "Routine temperature checks completed",
    ],
    isCcp: true,
    criticalLimits: [
      "Chilled high-risk food held at 8°C or below",
      "Target fridge setting 5°C or below",
      "Food past use-by date must not be served",
    ],
    monitoring: [
      "Daily fridge checks",
      "Probe verification where required",
      "Date labelling and stock rotation checks",
    ],
    correctiveActions: [
      "Move food to alternative refrigeration if equipment fails",
      "Discard food if safe time/temperature cannot be confirmed",
      "Repair or replace faulty equipment",
    ],
    verification: [
      "Review of temperature logs",
      "Probe accuracy checks",
      "Manager review of recurring fridge issues",
    ],
    records: [
      { label: "Routines", href: "/routines" },
      { label: "Reports", href: "/reports" },
    ],
  },
  {
    id: "cooking-and-reheating",
    title: "Cooking and reheating",
    category: "cooking",
    summary:
      "Food must be thoroughly cooked or reheated to a safe core temperature to destroy harmful bacteria.",
    scope:
      "Applies to initial cooking, reheating, batch cooking, sauces, and high-risk foods.",
    hazards: [
      "Survival of harmful bacteria due to undercooking",
      "Survival or growth due to inadequate reheating",
    ],
    controlMeasures: [
      "Defined cooking and reheating methods",
      "Preheated equipment used correctly",
      "Probe thermometer available and used where needed",
      "Staff trained on safe cook and reheat checks",
    ],
    isCcp: true,
    criticalLimits: [
      "Food must reach a safe core time/temperature combination",
      "Reheated food must be thoroughly reheated before service or hot holding",
    ],
    monitoring: [
      "Probe checks on relevant foods",
      "Visual checks where validated and appropriate",
      "Supervisor observation of cooking and reheating practice",
    ],
    correctiveActions: [
      "Continue cooking or reheating until safe temperature is reached",
      "Discard food if safety cannot be assured",
      "Check equipment if repeated failures occur",
    ],
    verification: [
      "Probe calibration checks",
      "Review of prove-it records",
      "Manager review of undercooking incidents",
    ],
    records: [
      { label: "Routines", href: "/routines" },
      { label: "Reports", href: "/reports" },
    ],
  },
  {
    id: "hot-holding",
    title: "Hot holding",
    category: "hot_holding",
    summary:
      "Once cooked, food held for service must remain hot enough to prevent bacterial growth.",
    scope:
      "Applies to food held in hot units, bain maries, service counters, or awaiting collection.",
    hazards: ["Growth of harmful bacteria if hot food drops into unsafe temperatures"],
    controlMeasures: [
      "Preheated hot holding equipment used",
      "Food fully cooked before entering hot hold",
      "Periodic temperature checks completed",
    ],
    isCcp: true,
    criticalLimits: ["Hot held food must be kept at 63°C or above"],
    monitoring: [
      "Hot holding temperature checks during service",
      "Visual and supervisory checks on time in unit and equipment performance",
    ],
    correctiveActions: [
      "Reheat once if appropriate and return to hot hold",
      "Chill safely for later use if appropriate",
      "Discard food if safe control cannot be maintained",
    ],
    verification: [
      "Manager review of hot hold records and incidents",
      "Probe checks and equipment review",
    ],
    records: [
      { label: "Routines", href: "/routines" },
      { label: "Reports", href: "/reports" },
    ],
  },
  {
    id: "allergen-control",
    title: "Allergen control and customer information",
    category: "allergens",
    summary:
      "Accurate allergen information must be available and allergen cross-contact must be prevented during preparation and service.",
    scope:
      "Applies to recipe control, allergen matrix, customer enquiries, takeaway orders, and allergy-safe meal prep.",
    hazards: [
      "Customer allergic reaction due to incorrect allergen information",
      "Allergen cross-contact during preparation, storage, or service",
    ],
    controlMeasures: [
      "Allergen information maintained and reviewed",
      "Staff trained to answer allergen requests safely",
      "Separate or controlled prep for allergen-sensitive orders",
      "Clear identification of allergy orders",
    ],
    isCcp: false,
    criticalLimits: [
      "Allergen information provided must be accurate and up to date",
      "Food described as suitable or free from must not be contaminated with the named allergen",
    ],
    monitoring: [
      "Manager review of allergen matrix and recipe changes",
      "Checks on order handling and allergy meal prep",
      "Staff supervision during service",
    ],
    correctiveActions: [
      "If a mistake is made, discard the dish and remake from scratch",
      "Update incorrect allergen information immediately",
      "Escalate serious allergen incidents and review controls",
    ],
    verification: [
      "Periodic allergen review",
      "Training refreshers",
      "Complaint and incident review",
    ],
    records: [
      { label: "Allergens", href: "/allergens" },
      { label: "Reports", href: "/reports" },
      { label: "Team & training", href: "/team" },
    ],
  },
  {
    id: "supplier-and-delivery-control",
    title: "Supplier approval and delivery checks",
    category: "suppliers",
    summary:
      "Food and ingredients must be sourced from suitable suppliers and checked at delivery to ensure they are safe and correctly handled.",
    scope:
      "Applies to deliveries, supplier approval, transport checks, and incoming stock acceptance.",
    hazards: [
      "Unsafe food entering the business through poor supply chain control",
      "Incorrectly handled chilled or frozen food at delivery",
      "Incorrect allergen information from substituted or mislabelled products",
    ],
    controlMeasures: [
      "Approved or reputable suppliers used",
      "Delivery checks on temperature, packaging, dates and condition",
      "Rejected deliveries not accepted into stock",
      "Supplier and product traceability maintained",
    ],
    isCcp: false,
    criticalLimits: [
      "Food not meeting acceptance standards must be rejected",
      "Products past use-by date must not be accepted for sale or use",
    ],
    monitoring: [
      "Delivery checks on receipt",
      "Manager review of supplier performance",
      "Spot checks on chilled and frozen goods",
    ],
    correctiveActions: [
      "Reject unsafe or damaged delivery",
      "Contact supplier immediately",
      "Update allergen information if any product substitution is accepted",
    ],
    verification: [
      "Supplier review",
      "Invoice and receipt checks",
      "Complaint and incident review linked to suppliers",
    ],
    records: [
      { label: "Suppliers", href: "/suppliers" },
      { label: "Reports", href: "/reports" },
    ],
  },
  {
    id: "pest-control",
    title: "Pest control",
    category: "pest_control",
    summary:
      "Premises must be maintained and checked to prevent pest access and contamination of food or food areas.",
    scope:
      "Applies to the whole premises including kitchen, storage, external areas, and bins.",
    hazards: ["Contamination of food and surfaces by rodents, insects, or birds"],
    controlMeasures: [
      "Routine pest checks",
      "Good housekeeping and waste control",
      "Building maintained to prevent entry points",
      "Pest contractor used where needed",
    ],
    isCcp: false,
    criticalLimits: [
      "Food affected by pests must not be used",
      "Active signs of infestation must trigger immediate action",
    ],
    monitoring: [
      "Opening and closing visual checks",
      "Checks of bins, external areas, and deliveries",
      "Review of pest sightings and signs",
    ],
    correctiveActions: [
      "Discard affected food",
      "Clean and disinfect affected areas",
      "Call pest contractor and investigate source",
    ],
    verification: [
      "Review pest contractor reports",
      "Manager review of repeat sightings",
      "Maintenance follow-up on entry points",
    ],
    records: [
      { label: "Reports", href: "/reports" },
      { label: "Suppliers", href: "/suppliers" },
    ],
  },
  {
    id: "traceability-and-stock-rotation",
    title: "Traceability and stock rotation",
    category: "traceability",
    summary:
      "Food must be traceable back to source and rotated properly so unsafe or out-of-date stock is not used.",
    scope:
      "Applies to stock receipt, storage, date coding, use-by control, and recall readiness.",
    hazards: [
      "Use of food beyond safe shelf life",
      "Inability to trace food in case of complaint, recall, or incident",
    ],
    controlMeasures: [
      "Invoices and receipts retained",
      "Date labelling and first-in-first-out rotation",
      "Use-by dates checked routinely",
      "Recall and withdrawal process understood",
    ],
    isCcp: false,
    criticalLimits: [
      "Food past use-by date must not be used or served",
      "Traceability records must identify supplier and product source",
    ],
    monitoring: [
      "Stock checks",
      "Date checks during opening, closing or prep",
      "Manager review of traceability records",
    ],
    correctiveActions: [
      "Discard out-of-date food immediately",
      "Quarantine recalled or withdrawn products",
      "Review stock control failures and retrain staff if needed",
    ],
    verification: [
      "Manager checks on stock rotation",
      "Review of traceability file completeness",
      "Mock or actual recall review where appropriate",
    ],
    records: [
      { label: "Suppliers", href: "/suppliers" },
      { label: "Reports", href: "/reports" },
    ],
  },
];

export function cloneDefaultHaccpProcedures(): HaccpProcedure[] {
  return HACCP_PROCEDURES_DEFAULTS.map((item) => ({
    ...item,
    hazards: [...item.hazards],
    controlMeasures: [...item.controlMeasures],
    criticalLimits: [...item.criticalLimits],
    monitoring: [...item.monitoring],
    correctiveActions: [...item.correctiveActions],
    verification: [...item.verification],
    records: item.records.map((record) => ({ ...record })),
  }));
}

export function cloneHaccpProcedures(items: HaccpProcedure[]): HaccpProcedure[] {
  return items.map((item) => ({
    ...item,
    hazards: [...item.hazards],
    controlMeasures: [...item.controlMeasures],
    criticalLimits: [...item.criticalLimits],
    monitoring: [...item.monitoring],
    correctiveActions: [...item.correctiveActions],
    verification: [...item.verification],
    records: item.records.map((record) => ({ ...record })),
  }));
}

export function mergeProcedureOverrides(
  defaults: HaccpProcedure[],
  overrides: HaccpProcedureOverrideRow[],
): HaccpProcedure[] {
  const byKey = new Map(overrides.map((row) => [row.procedure_key, row]));

  return defaults.map((item) => {
    const row = byKey.get(item.id);
    if (!row) return item;

    return {
      ...item,
      title: row.title ?? item.title,
      summary: row.summary ?? item.summary,
      scope: row.scope ?? item.scope,
      hazards: row.hazards ?? item.hazards,
      controlMeasures: row.control_measures ?? item.controlMeasures,
      criticalLimits: row.critical_limits ?? item.criticalLimits,
      monitoring: row.monitoring ?? item.monitoring,
      correctiveActions: row.corrective_actions ?? item.correctiveActions,
      verification: row.verification ?? item.verification,
      isCcp: row.is_ccp ?? item.isCcp,
    };
  });
}