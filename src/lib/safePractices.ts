export type SafePracticeCategory =
  | "personal_hygiene"
  | "cross_contamination"
  | "cleaning"
  | "chilling"
  | "cooking"
  | "pest_control"
  | "allergens"
  | "management";

export type SafePracticeSeverity = "info" | "warning" | "critical";

export type SafePracticeItem = {
  id: string;
  title: string;
  category: SafePracticeCategory;
  summary: string;
  whyItMatters: string;
  keywords: string[];
  safetyPoints: string[];
  checks?: string[];
  whatToDoIfWrong?: string[];
  prevention?: string[];
  relatedIds?: string[];
  pageHints?: string[];
  severity?: SafePracticeSeverity;
  sourceLabel?: string;
};

export const SAFE_PRACTICE_CATEGORY_LABELS: Record<SafePracticeCategory, string> = {
  personal_hygiene: "Personal hygiene",
  cross_contamination: "Cross-contamination",
  cleaning: "Cleaning",
  chilling: "Chilling & freezing",
  cooking: "Cooking & reheating",
  pest_control: "Pest control",
  allergens: "Allergens",
  management: "Management",
};

export const SAFE_PRACTICES: SafePracticeItem[] = [
  {
    id: "handwashing",
    title: "Handwashing",
    category: "personal_hygiene",
    summary:
      "Wash hands properly with warm running water and liquid soap before handling food, after raw food, after cleaning, after bins, after toilet breaks, and before preparing food for an allergic customer.",
    whyItMatters:
      "Handwashing is one of the most important ways to stop bacteria and viruses spreading to food.",
    keywords: [
      "handwashing",
      "wash hands",
      "hands",
      "soap",
      "paper towels",
      "gloves",
      "disposable gloves",
      "gel",
      "hand rub",
      "ready to eat",
      "allergy order",
    ],
    safetyPoints: [
      "Wet hands thoroughly under warm running water.",
      "Apply liquid soap and lather palms, backs of hands, fingers, thumbs and fingertips.",
      "Rinse with clean running water.",
      "Dry thoroughly using a disposable towel.",
      "Turn off the tap with the towel where possible.",
      "Do not use gloves as a replacement for handwashing.",
      "If using gloves, wash hands before putting them on and after taking them off.",
    ],
    checks: [
      "Hand basins should have warm running water, liquid soap and preferably disposable towels.",
      "Antibacterial soap should ideally meet BS EN 1499.",
      "Check soap and paper towels are stocked and staff are actually washing hands.",
    ],
    whatToDoIfWrong: [
      "If a staff member has not washed their hands, stop the task and get them to wash immediately.",
      "Replace missing soap or towels straight away.",
      "Re-clean any food contact area if poor hand hygiene may have contaminated it.",
    ],
    prevention: [
      "Keep sinks convenient and fully stocked.",
      "Re-train staff on when and how to wash hands.",
      "Supervise more closely during busy periods.",
    ],
    relatedIds: [
      "fitness-for-work",
      "separating-foods",
      "allergen-safe-prep",
      "two-stage-cleaning",
    ],
    pageHints: ["/dashboard", "/routines", "/allergens", "/cleaning-rota", "/team"],
    severity: "critical",
    sourceLabel: "SFBB: Handwashing",
  },
  {
    id: "fitness-for-work",
    title: "Fitness to work",
    category: "personal_hygiene",
    summary:
      "Food handlers must be fit for work. Anyone with diarrhoea or vomiting must report it immediately and stay away from food handling until symptom-free for 48 hours.",
    whyItMatters:
      "Ill staff can spread harmful bacteria or viruses to food, equipment and surfaces.",
    keywords: [
      "fitness to work",
      "vomiting",
      "diarrhoea",
      "diarrhea",
      "sick",
      "illness",
      "cut",
      "sores",
      "waterproof dressing",
      "staff sickness",
    ],
    safetyPoints: [
      "Staff must report diarrhoea and vomiting immediately.",
      "Staff with diarrhoea or vomiting must not handle food.",
      "Do not allow return to food work until 48 hours after symptoms stop.",
      "Cuts and sores must be fully covered with a brightly coloured waterproof dressing.",
      "Staff should understand what symptoms and conditions must be reported.",
    ],
    checks: [
      "Confirm staff have been symptom-free for 48 hours before returning.",
      "Check dressings are waterproof and visible.",
      "Make sure staff know who to report illness to.",
    ],
    whatToDoIfWrong: [
      "Move unfit staff out of food areas or send them home.",
      "Throw away any unwrapped food handled by someone who was not fit for work.",
      "Review whether any surfaces or equipment now need cleaning and disinfection.",
    ],
    prevention: [
      "Train staff on illness reporting rules.",
      "Keep spare waterproof dressings available.",
      "Improve supervision at shift start.",
    ],
    relatedIds: ["handwashing", "opening-closing-checks", "training-supervision"],
    pageHints: ["/dashboard", "/team"],
    severity: "critical",
    sourceLabel: "SFBB: Personal hygiene & fitness",
  },
  {
    id: "cloths-and-wiping",
    title: "Cloths and wiping safely",
    category: "cross_contamination",
    summary:
      "Use disposable cloths where possible. Reusable cloths must be washed, disinfected and dried properly between tasks, not just when they look dirty.",
    whyItMatters:
      "Dirty cloths are one of the easiest ways to spread bacteria, viruses and allergens around the kitchen.",
    keywords: [
      "cloths",
      "cloth",
      "dish cloth",
      "tea towel",
      "paper towel",
      "wiping",
      "wipe down",
      "disposable cloths",
      "reusable cloths",
    ],
    safetyPoints: [
      "Use disposable cloths wherever possible and throw them away after use.",
      "Use clean or freshly cleaned/disinfected cloths for food-contact surfaces.",
      "Do not use the same cloth for food prep and general cleaning jobs.",
      "Wash reusable cloths on a very hot cycle where possible.",
      "If washing by hand, clean off dirt first, then disinfect properly and dry fully.",
    ],
    checks: [
      "Keep a clear separation between clean cloths and dirty cloths.",
      "Keep a good supply of clean cloths available.",
      "Make sure cloth choice matches the job.",
    ],
    whatToDoIfWrong: [
      "Remove dirty cloths for washing or disposal immediately.",
      "If a dirty cloth touched food-contact areas, wash, disinfect and dry those areas again.",
      "Throw away any food that may have been contaminated.",
    ],
    prevention: [
      "Increase stock of clean or disposable cloths.",
      "Train staff on which cloths are for which jobs.",
      "Supervise wiping down between tasks.",
    ],
    relatedIds: ["two-stage-cleaning", "clear-clean-as-you-go", "separating-foods"],
    pageHints: ["/cleaning-rota", "/dashboard"],
    severity: "warning",
    sourceLabel: "SFBB: Cloths",
  },
  {
    id: "separating-foods",
    title: "Separating raw and ready-to-eat food",
    category: "cross_contamination",
    summary:
      "Keep raw food separate from ready-to-eat food during delivery, storage, defrosting, preparation and service. Where possible, use separate equipment and prep areas.",
    whyItMatters:
      "Raw meat, poultry, fish, eggs and unwashed vegetables can spread harmful bacteria onto food that will not be cooked again.",
    keywords: [
      "separate foods",
      "cross contamination",
      "raw and ready to eat",
      "raw meat",
      "cooked food",
      "colour coded boards",
      "chopping boards",
      "separate equipment",
      "prep area",
      "defrosting below",
    ],
    safetyPoints: [
      "Store raw foods separately from ready-to-eat foods.",
      "If sharing a fridge, keep raw meat, poultry, fish and eggs below ready-to-eat food.",
      "Keep unwashed fruit and vegetables separate from ready-to-eat food.",
      "Prepare raw and ready-to-eat foods in different areas where possible.",
      "If using the same area, separate by time and clean/disinfect thoroughly between tasks.",
      "Use separate colour-coded chopping boards and utensils.",
      "Do not wash raw meat or poultry.",
      "Do not use the same complex machinery for raw and ready-to-eat foods.",
    ],
    checks: [
      "Check storage layout in fridges and prep areas.",
      "Check raw food is not dripping onto ready-to-eat food.",
      "Check separate utensils and boards are actually being used.",
    ],
    whatToDoIfWrong: [
      "Throw away ready-to-eat food if it may have been contaminated by raw food.",
      "Wash, disinfect and dry equipment, surfaces and utensils touched by raw food.",
      "Reorganise storage or prep flow immediately if the setup is causing repeat errors.",
    ],
    prevention: [
      "Re-train staff on raw/ready-to-eat separation.",
      "Improve supervision.",
      "Reorganise delivery, storage and preparation to make separation easier.",
    ],
    relatedIds: [
      "handwashing",
      "cloths-and-wiping",
      "allergen-safe-prep",
      "ready-to-eat-handling",
    ],
    pageHints: ["/dashboard", "/routines", "/allergens"],
    severity: "critical",
    sourceLabel: "SFBB: Separating foods",
  },
  {
    id: "chemical-storage",
    title: "Storing cleaning chemicals correctly",
    category: "cleaning",
    summary:
      "Store cleaning chemicals separately from food, keep them clearly labelled, and always follow manufacturer instructions for storage and use.",
    whyItMatters:
      "Poor chemical storage can lead to chemical contamination of food, packaging, equipment and surfaces.",
    keywords: [
      "cleaning chemicals",
      "chemicals",
      "chemical storage",
      "sanitiser",
      "sanitizer",
      "disinfectant",
      "bleach",
      "labelled bottles",
      "food safe chemicals",
      "contamination",
    ],
    safetyPoints: [
      "Store cleaning chemicals away from food.",
      "Keep all chemicals clearly labelled.",
      "Follow manufacturer instructions on storage and use.",
      "Only use chemicals suitable for food-contact surfaces where relevant.",
      "Never allow pest control chemicals or cleaning chemicals to contact food, packaging or food-contact surfaces.",
    ],
    checks: [
      "Check chemicals are in labelled containers.",
      "Check food and chemicals are physically separated.",
      "Check staff know which products are suitable for food-contact surfaces.",
    ],
    whatToDoIfWrong: [
      "If chemicals get into food, throw the food away.",
      "If a food-contact surface has been contaminated, re-clean and disinfect it correctly before use.",
      "Stop using any unlabelled chemical until it is identified or disposed of safely.",
    ],
    prevention: [
      "Review storage locations and segregation.",
      "Train staff again on safe chemical handling.",
      "Use a consistent chemical labelling system.",
    ],
    relatedIds: ["two-stage-cleaning", "clear-clean-as-you-go", "pest-control-signs"],
    pageHints: ["/cleaning-rota", "/dashboard"],
    severity: "critical",
    sourceLabel: "SFBB: Physical and chemical contamination",
  },
  {
    id: "two-stage-cleaning",
    title: "Two-stage cleaning",
    category: "cleaning",
    summary:
      "Clean first to remove grease and dirt, then disinfect using the correct product, dilution and contact time.",
    whyItMatters:
      "Disinfectants and sanitisers do not work properly if dirt and grease are still on the surface.",
    keywords: [
      "two stage clean",
      "cleaning effectively",
      "sanitize",
      "sanitise",
      "disinfect",
      "contact time",
      "dilution",
      "bs en 1276",
      "bs en 13697",
      "food contact surfaces",
    ],
    safetyPoints: [
      "Stage 1: remove visible dirt, grease and debris using hot soapy water or a cleaning product.",
      "Stage 2: apply disinfectant or sanitiser and leave it on for the required contact time.",
      "Follow manufacturer instructions for dilution and use.",
      "Use products meeting BS EN 1276 or BS EN 13697 where appropriate.",
      "Clean and disinfect thoroughly after raw food and before ready-to-eat prep.",
    ],
    checks: [
      "Check staff know the difference between cleaning and disinfecting.",
      "Check products are diluted correctly.",
      "Check staff actually wait for the required contact time.",
    ],
    whatToDoIfWrong: [
      "If an item is not properly clean, clean and disinfect it again and allow it to dry.",
      "If the wrong product or dilution was used, repeat the job correctly.",
      "If a surface was used before proper cleaning, assess whether food may need to be discarded.",
    ],
    prevention: [
      "Keep product instructions accessible.",
      "Train staff again on the two-stage clean.",
      "Review the cleaning schedule and supervision.",
    ],
    relatedIds: ["cloths-and-wiping", "chemical-storage", "clear-clean-as-you-go"],
    pageHints: ["/cleaning-rota", "/dashboard"],
    severity: "critical",
    sourceLabel: "SFBB: Cleaning effectively",
  },
  {
    id: "clear-clean-as-you-go",
    title: "Clear and clean as you go",
    category: "cleaning",
    summary:
      "Keep work areas uncluttered, remove waste quickly, deal with spills immediately, and clean between tasks to stop dirt, bacteria and allergens spreading.",
    whyItMatters:
      "A cluttered kitchen becomes harder to keep safe and makes contamination and pest issues more likely.",
    keywords: [
      "clear and clean",
      "clean as you go",
      "spills",
      "packaging waste",
      "food waste",
      "sink strainer",
      "waste bins",
      "kitchen clutter",
    ],
    safetyPoints: [
      "Remove outer packaging before bringing food into prep areas where possible.",
      "Throw away packaging and raw food waste promptly.",
      "Keep sinks and work surfaces clear and clean.",
      "Wipe up spills straight away.",
      "Clean and disinfect surfaces after raw food spills.",
      "Use a clean cloth for each appropriate task.",
      "Scrape food into bins before washing up.",
      "Use strainers over plugholes to stop drains blocking.",
    ],
    checks: [
      "Check bins are being used properly and emptied regularly.",
      "Check sinks and drains are not blocked by food waste.",
      "Check clutter is not building up on work surfaces.",
    ],
    whatToDoIfWrong: [
      "Throw away loose packaging or waste immediately.",
      "If surfaces or equipment are not clean, wash, disinfect and dry them before use.",
      "If sinks or drains block, review scraping and strainer use straight away.",
    ],
    prevention: [
      "Review cleaning flow and staffing levels.",
      "Train staff again on waste handling and task order.",
      "Rework the kitchen process if clutter keeps building up.",
    ],
    relatedIds: ["two-stage-cleaning", "cloths-and-wiping", "pest-control-signs"],
    pageHints: ["/cleaning-rota", "/dashboard"],
    severity: "warning",
    sourceLabel: "SFBB: Clear and clean as you go",
  },
  {
    id: "pest-control-signs",
    title: "Pest control and signs of rodents",
    category: "pest_control",
    summary:
      "Check regularly for signs of pests such as droppings, gnawed packaging, grease marks, nests, holes, insects or damage around the premises and deliveries.",
    whyItMatters:
      "Pests spread harmful bacteria and can contaminate food, packaging, equipment and surfaces.",
    keywords: [
      "pests",
      "pest control",
      "rodents",
      "rats",
      "mice",
      "droppings",
      "gnawed packaging",
      "grease marks",
      "smear marks",
      "holes",
      "nests",
      "flies",
      "cockroaches",
      "ants",
      "weevils",
      "beetles",
    ],
    safetyPoints: [
      "Check the premises regularly for signs of pests.",
      "Check deliveries for pest damage or infestation signs.",
      "Keep external areas tidy and free from weeds and rubbish.",
      "Use bins with close-fitting lids and clean them regularly.",
      "Maintain the building so pests cannot get in easily.",
    ],
    checks: [
      "Rodent signs include droppings, footprints in dust, nests, gnawed goods or packaging, grease marks, urine stains, holes in walls and doors.",
      "Flying insect signs include bodies, live insects, maggots, buzzing, webbing and nests.",
      "Check both inside and outside the building.",
    ],
    whatToDoIfWrong: [
      "If signs of infestation are found, call a pest contractor immediately.",
      "Throw away any food touched by pests or likely contaminated.",
      "Wash, disinfect and dry any surfaces, equipment or utensils pests may have touched.",
    ],
    prevention: [
      "Increase pest checks.",
      "Improve housekeeping and cleaning standards.",
      "Train staff to recognise signs and report immediately.",
      "Use a pest contractor if problems persist.",
    ],
    relatedIds: ["chemical-storage", "clear-clean-as-you-go", "opening-closing-checks"],
    pageHints: ["/dashboard", "/reports"],
    severity: "critical",
    sourceLabel: "SFBB: Pest control",
  },
  {
    id: "defrosting-safely",
    title: "Defrosting safely",
    category: "chilling",
    summary:
      "Defrost food thoroughly before cooking unless the manufacturer says cook from frozen. Defrost in the fridge where possible, or use another controlled method safely.",
    whyItMatters:
      "If food is still frozen in the middle, the outside may cook while the centre stays undercooked and unsafe.",
    keywords: [
      "defrosting",
      "defrost",
      "thawing",
      "fridge defrost",
      "cold running water",
      "microwave defrost",
      "room temperature",
      "ice crystals",
      "raw chicken",
    ],
    safetyPoints: [
      "Plan ahead and defrost small amounts in the fridge where possible.",
      "If needed, use cold running water or a microwave defrost setting safely.",
      "Keep raw meat and poultry separate while defrosting.",
      "Raw meat and poultry should not be defrosted under running water unless in a sealed container.",
      "If using a sink, it must be clean and disinfected afterwards.",
      "Check for ice crystals before cooking.",
    ],
    checks: [
      "Check food is fully defrosted before cooking.",
      "Use your hand or a skewer to check for ice crystals.",
      "With birds, check the joints are flexible.",
    ],
    whatToDoIfWrong: [
      "If food is not fully defrosted, continue defrosting and test again before cooking.",
      "Speed up safely using cold water or a microwave if needed.",
      "If there is not enough time, use an alternative menu item rather than guessing.",
    ],
    prevention: [
      "Allow enough time for defrosting.",
      "Defrost smaller portions.",
      "Create more fridge space if defrosting is a recurring bottleneck.",
    ],
    relatedIds: ["separating-foods", "chilled-storage", "cooking-safely"],
    pageHints: ["/routines", "/dashboard"],
    severity: "critical",
    sourceLabel: "SFBB: Defrosting",
  },
  {
    id: "chilled-storage",
    title: "Chilled storage and display",
    category: "chilling",
    summary:
      "Keep chilled foods cold enough, monitor equipment daily, and make sure food with a use-by date or requiring refrigeration stays safely stored and labelled.",
    whyItMatters:
      "If chilled food is not kept cold enough, harmful bacteria can grow.",
    keywords: [
      "chilled storage",
      "fridge temperature",
      "cold display",
      "display fridge",
      "refrigeration",
      "use by date",
      "8c",
      "5c",
      "fridge checks",
      "cold holding",
    ],
    safetyPoints: [
      "Keep foods that require refrigeration properly chilled.",
      "Use food before its use-by date.",
      "Label prepared or opened foods so staff know when to use or discard them.",
      "Set fridges and chilled display units appropriately, ideally 5°C or below.",
      "Only display as much chilled food as needed.",
      "Keep chilled food out of room temperature for the shortest time possible.",
    ],
    checks: [
      "Check fridge and chilled display temperatures at least daily.",
      "Use a probe or suitable thermometer to confirm equipment is keeping food safe.",
      "If using a digital display or dial, verify accuracy regularly.",
    ],
    whatToDoIfWrong: [
      "If chilling equipment fails, move food to other safe cold storage immediately.",
      "If food needing refrigeration has been out for more than four hours, throw it away.",
      "If you do not know how long the failure lasted, seek advice rather than guessing.",
    ],
    prevention: [
      "Review chilled display methods.",
      "Train staff again on chilled storage and time control.",
      "Upgrade equipment if it is not suitable for the business.",
    ],
    relatedIds: ["defrosting-safely", "hot-holding", "opening-closing-checks"],
    pageHints: ["/routines", "/dashboard", "/reports"],
    severity: "critical",
    sourceLabel: "SFBB: Chilled storage/displays",
  },
  {
    id: "cooking-safely",
    title: "Cooking safely",
    category: "cooking",
    summary:
      "Cook food thoroughly, use correct checks for the type of dish, and use a disinfected probe where needed to prove it has reached a safe temperature.",
    whyItMatters:
      "Undercooked food may still contain harmful bacteria and be unsafe to serve.",
    keywords: [
      "cooking safely",
      "cook thoroughly",
      "probe",
      "burger temperature",
      "sausage temperature",
      "chicken temperature",
      "safe temperature",
      "reheat",
      "undercooked",
    ],
    safetyPoints: [
      "Follow manufacturer cooking instructions where appropriate.",
      "Preheat ovens, grills and other equipment before cooking.",
      "Keep raw food away from cooked food during cooking.",
      "Use separate utensils, plates and containers for raw and cooked food.",
      "Cook poultry, burgers, sausages, rolled joints and other relevant foods thoroughly in the centre.",
      "Stir liquid dishes and check several places if needed.",
      "Use a disinfected probe to check safe temperatures when appropriate.",
    ],
    checks: [
      "Examples of safe time/temperature combinations include 80°C for 6 seconds, 75°C for 30 seconds, 70°C for 2 minutes, 65°C for 10 minutes, or 60°C for 45 minutes.",
      "Check for no pink or red where relevant.",
      "Check the thickest part or centre of the food.",
    ],
    whatToDoIfWrong: [
      "Cook the food for longer.",
      "Speed up safe cooking by reducing portion size if appropriate.",
      "Do not serve until the safe check is passed.",
    ],
    prevention: [
      "Review the cooking method, time, temperature and equipment.",
      "Maintain and service equipment.",
      "Re-train staff on probe use and dish-specific checks.",
    ],
    relatedIds: ["defrosting-safely", "hot-holding", "probe-checks"],
    pageHints: ["/routines", "/dashboard", "/reports"],
    severity: "critical",
    sourceLabel: "SFBB: Cooking safely",
  },
  {
    id: "hot-holding",
    title: "Hot holding",
    category: "cooking",
    summary:
      "Once food is cooked, keep it at 63°C or above until served, using suitable preheated hot holding equipment.",
    whyItMatters:
      "If hot food drops into unsafe temperatures, harmful bacteria can grow.",
    keywords: [
      "hot holding",
      "63c",
      "bain marie",
      "soup kettle",
      "hot display",
      "service holding",
      "delivery holding",
      "hold hot",
    ],
    safetyPoints: [
      "Use suitable equipment for hot holding.",
      "Preheat hot holding equipment before adding food.",
      "Only hot hold food that has already been cooked thoroughly.",
      "Do not use hot holding equipment to cook or reheat food.",
      "Keep food hot until collected or delivered if it is meant to be served hot.",
    ],
    checks: [
      "Food in hot holding should stay at 63°C or above.",
      "Use a disinfected probe to prove the method is working.",
      "Do not guess from steam alone.",
    ],
    whatToDoIfWrong: [
      "If food is not hot enough, reheat it properly once and return it to hot holding.",
      "Or chill it down safely and reheat later if appropriate.",
      "If neither option is safe or practical, throw it away.",
    ],
    prevention: [
      "Check equipment is working correctly.",
      "Use smaller batches if needed.",
      "Review temperature settings and staff supervision.",
    ],
    relatedIds: ["cooking-safely", "chilled-storage", "probe-checks"],
    pageHints: ["/routines", "/dashboard"],
    severity: "critical",
    sourceLabel: "SFBB: Hot holding",
  },
  {
    id: "allergen-safe-prep",
    title: "Preparing food safely for allergic customers",
    category: "allergens",
    summary:
      "Use accurate allergen information, check labels and ingredients carefully, and prevent cross-contact when preparing, storing and serving food for allergic customers.",
    whyItMatters:
      "Even tiny amounts of an allergen can trigger a serious or life-threatening reaction.",
    keywords: [
      "allergens",
      "allergy",
      "allergic customer",
      "allergen matrix",
      "cross contact",
      "free from",
      "ingredient check",
      "takeaway allergy order",
      "epipen",
      "anaphylaxis",
    ],
    safetyPoints: [
      "Check the exact ingredient and label information before confirming a dish is safe.",
      "Check oils, sauces, dressings, glazes and garnishes too.",
      "If an ingredient says it may contain something relevant, tell the customer and let them decide.",
      "Clean work surfaces and equipment thoroughly before preparing allergy-safe food.",
      "Wash hands thoroughly before preparing allergy-safe food.",
      "Use separate equipment and boards for allergy-safe meals where possible.",
      "If a mistake is made, start again from scratch with fresh ingredients.",
      "Store foods clearly labelled and contained to prevent cross-contact.",
      "Keep allergy takeaway orders clearly identified and separated.",
    ],
    checks: [
      "Staff should know where current allergen information is kept.",
      "Allergen information must be accurate, consistent and up to date.",
      "For PPDS food, use full ingredient labelling with allergens emphasised.",
      "If allergen info is not written on loose foods, clear signposting must tell customers where to get it.",
    ],
    whatToDoIfWrong: [
      "If you think a customer is having a severe allergic reaction, call 999 immediately and state possible anaphylaxis.",
      "Help the customer access their adrenaline pen if they have one.",
      "If an allergen error occurred during prep, discard the dish and remake it from scratch.",
    ],
    prevention: [
      "Train staff again on allergen handling and requests.",
      "Keep ingredient and supplier info up to date.",
      "Review prep flow for allergy-safe meals.",
      "Do not use 'free from' claims loosely or lazily.",
    ],
    relatedIds: [
      "handwashing",
      "separating-foods",
      "ready-to-eat-handling",
      "opening-closing-checks",
    ],
    pageHints: ["/allergens", "/dashboard", "/reports"],
    severity: "critical",
    sourceLabel: "SFBB: Managing food allergen information",
  },
  {
    id: "ready-to-eat-handling",
    title: "Handling ready-to-eat food safely",
    category: "allergens",
    summary:
      "Ready-to-eat food must be protected from raw food, dirty surfaces, dirty hands and allergens because it will not be cooked again before serving.",
    whyItMatters:
      "If ready-to-eat food is contaminated, there is no later kill step to make it safe.",
    keywords: [
      "ready to eat",
      "rte",
      "salad prep",
      "sandwiches",
      "cooked meat",
      "desserts",
      "slicer",
      "use by",
      "opened food",
    ],
    safetyPoints: [
      "Keep ready-to-eat food separate from raw meat, poultry, fish, eggs and unwashed vegetables.",
      "Use clean and, where needed, disinfected work surfaces and utensils.",
      "Keep ready-to-eat food covered during prep and storage.",
      "Follow storage instructions and use-by dates.",
      "Label prepared or opened foods so staff know when to use or throw them away.",
      "Clean slicers properly and avoid unnecessary hand contact with food.",
    ],
    checks: [
      "Check ready-to-eat food is held cold enough.",
      "Check opened or prepared foods are dated.",
      "Check staff are not using raw-food equipment for ready-to-eat tasks.",
    ],
    whatToDoIfWrong: [
      "Throw away ready-to-eat food if it may have been contaminated by raw food, dirty equipment or poor temperature control.",
      "If vegetables or salad ingredients were not washed properly, wash them correctly and re-clean the area.",
      "Discard ready-to-eat food past its use-by date.",
    ],
    prevention: [
      "Review the supplier, receiving and prep process.",
      "Train staff again on ready-to-eat handling.",
      "Improve separation and supervision.",
    ],
    relatedIds: ["separating-foods", "allergen-safe-prep", "chilled-storage"],
    pageHints: ["/allergens", "/dashboard", "/routines"],
    severity: "critical",
    sourceLabel: "SFBB: Ready-to-eat food",
  },
  {
    id: "opening-closing-checks",
    title: "Opening and closing checks",
    category: "management",
    summary:
      "Use opening and closing checks every day to confirm core food safety controls are in place before service and properly shut down afterwards.",
    whyItMatters:
      "Daily checks catch obvious failures early, before they turn into contaminated food, missed controls or inspection problems.",
    keywords: [
      "opening checks",
      "closing checks",
      "daily checks",
      "startup checks",
      "end of day checks",
      "probe wipes",
      "fridge working",
      "fit for work",
      "allergen info",
    ],
    safetyPoints: [
      "At opening, check fridges, freezers and other equipment are working properly.",
      "Check staff are fit for work and in clean work clothes.",
      "Check prep areas are clean and disinfected.",
      "Check for signs of pests.",
      "Check soap, paper towels, sanitiser and hot water are available.",
      "Check the probe thermometer is working and probe wipes are available.",
      "Check allergen information is accurate.",
      "At closing, make sure food is covered, labelled and stored correctly.",
      "Throw away food on its use-by date.",
      "Clean or dispose of dirty cleaning equipment.",
      "Remove waste and clean prep areas.",
      "Make sure washing up is complete, floors are clean and prove-it checks are recorded.",
    ],
    checks: [
      "These checks should be completed every day.",
      "They should tie directly into your diary or daily sign-off flow.",
    ],
    whatToDoIfWrong: [
      "Do not start service while core controls are clearly not in place.",
      "Fix missing consumables, cleaning, labelling or storage issues immediately.",
      "Escalate equipment failures before relying on guesswork.",
    ],
    prevention: [
      "Keep the checklists short, visible and mandatory.",
      "Tie them to digital sign-off.",
      "Review repeat failures during weekly or four-weekly review.",
    ],
    relatedIds: [
      "handwashing",
      "fitness-for-work",
      "pest-control-signs",
      "probe-checks",
      "training-supervision",
    ],
    pageHints: ["/dashboard", "/reports"],
    severity: "critical",
    sourceLabel: "SFBB: Opening and closing checks",
  },
  {
    id: "probe-checks",
    title: "Probe thermometer use and checks",
    category: "management",
    summary:
      "Use a clean, disinfected probe to prove cooking, reheating, hot holding and chilling controls are actually safe, not just assumed safe.",
    whyItMatters:
      "A probe gives objective evidence. Human guesswork in kitchens is famous for being terrible.",
    keywords: [
      "probe",
      "thermometer",
      "temperature probe",
      "calibration",
      "boiling water check",
      "ice water check",
      "probe wipes",
      "prove it",
    ],
    safetyPoints: [
      "Clean and disinfect the probe before and after each use.",
      "Insert the tip into the centre or thickest part of the food.",
      "Use the probe to verify cooking, reheating, hot holding and chilled food temperatures.",
      "Keep probe wipes available.",
      "Store the probe safely and avoid damage.",
    ],
    checks: [
      "Check the probe in iced water: it should read between -1°C and 1°C.",
      "Check the probe in boiling water: it should read between 99°C and 101°C.",
      "If readings are outside this range, replace or recalibrate the probe.",
    ],
    whatToDoIfWrong: [
      "If the probe is inaccurate, stop relying on it and replace or recalibrate it.",
      "If no clean probe is available, clean and disinfect one before any food temperature check.",
      "Record important prove-it checks where relevant.",
    ],
    prevention: [
      "Build regular calibration checks into extra checks.",
      "Keep spare batteries and wipes available.",
      "Train staff to use and disinfect probes properly.",
    ],
    relatedIds: ["cooking-safely", "hot-holding", "chilled-storage", "opening-closing-checks"],
    pageHints: ["/routines", "/dashboard", "/reports"],
    severity: "critical",
    sourceLabel: "SFBB: Prove it",
  },
  {
    id: "training-supervision",
    title: "Training and supervision",
    category: "management",
    summary:
      "Staff must be trained in the safe methods relevant to their role and supervised to make sure they actually follow them during real work.",
    whyItMatters:
      "Food safety falls apart when training is vague, undocumented or never checked in practice.",
    keywords: [
      "training",
      "staff training",
      "supervision",
      "refresher training",
      "safe methods",
      "first day training",
      "induction",
      "staff records",
    ],
    safetyPoints: [
      "Train staff on all safe methods relevant to their job.",
      "Show them what to do, question their understanding, then watch them do it.",
      "Keep records of training and refresher training.",
      "Supervise staff during real tasks, not just during induction.",
      "Use diary reviews and recurring issues to target retraining.",
    ],
    checks: [
      "Make sure every role has a clear list of required safe methods.",
      "Record when staff were trained and by whom.",
      "Check performance on shift, not just in theory.",
    ],
    whatToDoIfWrong: [
      "If a staff member is not following a safe method, stop and retrain them.",
      "Document recurring issues and review root causes.",
      "Increase supervision where repeated failures occur.",
    ],
    prevention: [
      "Use structured induction and refresher training.",
      "Tie training records to team profiles where possible.",
      "Use four-weekly reviews to identify patterns.",
    ],
    relatedIds: ["opening-closing-checks", "probe-checks", "fitness-for-work"],
    pageHints: ["/team", "/dashboard", "/reports"],
    severity: "warning",
    sourceLabel: "SFBB: Training and supervision",
  },
];

export const SAFE_PRACTICES_BY_ID: Record<string, SafePracticeItem> = Object.fromEntries(
  SAFE_PRACTICES.map((item) => [item.id, item]),
);

export function getSafePracticeById(id: string): SafePracticeItem | null {
  return SAFE_PRACTICES_BY_ID[id] ?? null;
}

export function getSafePracticesByCategory(
  category: SafePracticeCategory,
): SafePracticeItem[] {
  return SAFE_PRACTICES.filter((item) => item.category === category);
}

function normalise(text: string): string {
  return text.trim().toLowerCase();
}

function scoreSafePractice(item: SafePracticeItem, rawQuery: string): number {
  const query = normalise(rawQuery);
  if (!query) return 0;

  let score = 0;

  const haystacks = [
    item.title,
    item.summary,
    item.whyItMatters,
    ...item.keywords,
    ...(item.safetyPoints ?? []),
    ...(item.checks ?? []),
    ...(item.whatToDoIfWrong ?? []),
    ...(item.prevention ?? []),
  ].map(normalise);

  for (const text of haystacks) {
    if (text === query) score += 100;
    if (text.includes(query)) score += 20;
  }

  for (const keyword of item.keywords.map(normalise)) {
    if (keyword === query) score += 60;
    if (keyword.includes(query) || query.includes(keyword)) score += 15;
  }

  const queryWords = query.split(/\s+/).filter(Boolean);
  for (const word of queryWords) {
    if (word.length < 2) continue;

    if (normalise(item.title).includes(word)) score += 8;
    if (normalise(item.summary).includes(word)) score += 5;
    if (item.keywords.some((k) => normalise(k).includes(word))) score += 10;
    if (item.safetyPoints.some((p) => normalise(p).includes(word))) score += 4;
  }

  return score;
}

export function searchSafePractices(query: string): SafePracticeItem[] {
  const q = normalise(query);
  if (!q) return SAFE_PRACTICES;

  return [...SAFE_PRACTICES]
    .map((item) => ({
      item,
      score: scoreSafePractice(item, q),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .map((entry) => entry.item);
}

export function getRelatedSafePractices(id: string, limit = 4): SafePracticeItem[] {
  const item = getSafePracticeById(id);
  if (!item?.relatedIds?.length) return [];

  return item.relatedIds
    .map((relatedId) => getSafePracticeById(relatedId))
    .filter((value): value is SafePracticeItem => Boolean(value))
    .slice(0, limit);
}

export function getSuggestedSafePracticesForPath(pathname: string): SafePracticeItem[] {
  const path = normalise(pathname);

  const exactMatches = SAFE_PRACTICES.filter((item) =>
    item.pageHints?.some((hint) => normalise(hint) === path),
  );

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  const partialMatches = SAFE_PRACTICES.filter((item) =>
    item.pageHints?.some((hint) => path.startsWith(normalise(hint))),
  );

  if (partialMatches.length > 0) {
    return partialMatches;
  }

  return [
    getSafePracticeById("opening-closing-checks"),
    getSafePracticeById("handwashing"),
    getSafePracticeById("separating-foods"),
    getSafePracticeById("allergen-safe-prep"),
  ].filter((value): value is SafePracticeItem => Boolean(value));
}

export const SAFE_PRACTICE_QUICK_SEARCHES = [
  "Rodents",
  "Cleaning chemicals",
  "Handwashing",
  "Allergens",
  "Defrosting chicken",
  "Hot holding",
  "Probe checks",
  "Ready-to-eat food",
];

export const SAFE_PRACTICE_EMERGENCY_IDS = [
  "pest-control-signs",
  "chemical-storage",
  "allergen-safe-prep",
  "chilled-storage",
  "cooking-safely",
] as const;