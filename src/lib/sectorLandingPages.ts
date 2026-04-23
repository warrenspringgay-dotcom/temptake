export type SectorFeature = {
  title: string;
  body: string;
};

export type SectorFaq = {
  question: string;
  answer: string;
};

export type SectorPageContent = {
  slug: string;
  seoTitle: string;
  metaDescription: string;
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;

  heroImageSrc: string;
  heroImageAlt: string;

  selectionImageSrc: string;
  selectionImageAlt: string;

  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;

  painTitle: string;
  painIntro: string;
  painPoints: string[];

  solutionTitle: string;
  solutionBody: string;

  featuresTitle: string;
  features: SectorFeature[];

  builtForTitle: string;
  builtForBody: string;

  ctaBandTitle: string;
  ctaBandBody: string;

  faqsTitle: string;
  faqs: SectorFaq[];
};

export const sectorPages: Record<string, SectorPageContent> = {
  takeaway: {
    slug: "takeaway-food-safety-app",
    seoTitle: "Food Safety App for Takeaways | TempTake",
    metaDescription:
      "Food safety app for takeaways. Replace paper temperature logs, cleaning records and allergen sheets with one digital system built for busy UK takeaway teams.",
    eyebrow: "For takeaways",
    heroTitle: "Food safety app for takeaways",
    heroDescription:
      "TempTake helps takeaways replace paper food safety records with one digital system for temperature logs, cleaning checks, sign-offs, allergen records and daily compliance.",
    heroImageSrc: "/images/sectors/takeaway.png",
    heroImageAlt:
      "Takeaway staff member using a phone in a busy kitchen while completing a food safety check.",
    selectionImageSrc: "/images/sectors/takeaway2.png",
    selectionImageAlt:
      "Takeaway kitchen worker using a phone in a busy prep area without text overlay.",
    primaryCtaLabel: "Start free trial",
    primaryCtaHref: "/signup",
    secondaryCtaLabel: "View live demo",
    secondaryCtaHref: "/demo",
    painTitle: "Takeaway paperwork gets skipped when service gets busy",
    painIntro:
      "Rush periods do not care about your clipboards. When teams are flat out, paperwork becomes rushed, delayed or forgotten. That leaves you with weak records and no clean view of what actually happened.",
    painPoints: [
      "Temperature checks get missed during rush periods",
      "Cleaning records are inconsistent",
      "Allergen information drifts out of date",
      "Paper folders are messy, incomplete or easy to lose",
      "Managers have to trust that checks were done properly",
    ],
    solutionTitle: "A quicker way to keep takeaway records under control",
    solutionBody:
      "TempTake gives takeaway teams one place to record temperatures, complete cleaning tasks, keep allergen information current and show what was done without digging through paper sheets.",
    featuresTitle: "What takeaways use TempTake for",
    features: [
      {
        title: "Digital temperature logs",
        body: "Record fridge, freezer, hot-hold and food temperatures quickly during service.",
      },
      {
        title: "Cleaning checks",
        body: "Keep opening, during-service and end-of-day cleaning tasks organised.",
      },
      {
        title: "Allergen records",
        body: "Keep allergen information easier to review, update and use during service.",
      },
      {
        title: "Reports and proof",
        body: "Show clear digital records when a manager or inspector needs to see them.",
      },
    ],
    builtForTitle: "Made for busy takeaway kitchens",
    builtForBody:
      "Whether you run a kebab shop, pizza takeaway, chicken shop, curry house or small multi-site takeaway group, TempTake is built for the pace of real service and the reality of short-staffed shifts.",
    ctaBandTitle: "Ready to replace paper food safety records in your takeaway?",
    ctaBandBody:
      "Start your free trial and keep temperatures, cleaning and allergens in one place.",
    faqsTitle: "Takeaway FAQ",
    faqs: [
      {
        question: "Is TempTake suitable for small takeaways?",
        answer:
          "Yes. It is built to be simple enough for small teams and fast enough for busy services.",
      },
      {
        question: "Can takeaway staff use it on their phones?",
        answer:
          "Yes. TempTake is designed for quick daily use on mobile during real shifts.",
      },
      {
        question: "Can it replace paper food safety records?",
        answer:
          "Yes. That is the point. It is built to replace scattered paper logs with organised digital records.",
      },
      {
        question: "Does it cover cleaning, temperatures and allergens?",
        answer: "Yes. Those are core parts of the system.",
      },
      {
        question: "Can I use it across more than one takeaway?",
        answer:
          "Yes. TempTake is structured around locations, so it can support multiple sites.",
      },
    ],
  },

  cafe: {
    slug: "cafe-food-safety-app",
    seoTitle: "Food Safety App for Cafés | TempTake",
    metaDescription:
      "Food safety app for cafés. Manage temperature checks, cleaning tasks, allergen records and daily food hygiene logs in one simple system for UK café teams.",
    eyebrow: "For cafés",
    heroTitle: "Food safety app for cafés",
    heroDescription:
      "TempTake helps cafés replace paper food safety records with one system for chilled storage checks, cleaning tasks, allergen records and daily compliance logging.",
    heroImageSrc: "/images/sectors/cafe.png",
    heroImageAlt:
      "Café staff member using a phone near a display fridge and prep counter.",
    selectionImageSrc: "/images/sectors/cafe2.png",
    selectionImageAlt:
      "Café worker using a phone near a counter and display case without text overlay.",
    primaryCtaLabel: "Start free trial",
    primaryCtaHref: "/signup",
    secondaryCtaLabel: "View live demo",
    secondaryCtaHref: "/demo",
    painTitle: "Cafés need simple records, not more admin",
    painIntro:
      "Most cafés do not have a compliance department. The owner or manager is usually juggling service, prep, stock, staff and admin at the same time. Paper logs just add friction.",
    painPoints: [
      "Small teams do not have time for messy paperwork",
      "Fridge and display checks still need doing",
      "Cleaning standards need to stay consistent",
      "Allergen information must stay clear and current",
      "You want records ready if anyone asks to see them",
    ],
    solutionTitle: "A café food safety system that stays practical",
    solutionBody:
      "Use TempTake to log key checks, keep cleaning organised and store the records you need without relying on clipboards, loose sheets or memory.",
    featuresTitle: "What cafés use TempTake for",
    features: [
      {
        title: "Daily checks",
        body: "Keep opening and closing food safety checks visible and easier to complete.",
      },
      {
        title: "Fridge and display temperatures",
        body: "Log chilled food and storage temperatures without paper forms.",
      },
      {
        title: "Cleaning records",
        body: "Keep front-of-house and kitchen cleaning more consistent.",
      },
      {
        title: "Allergen information",
        body: "Keep allergen records easier to review, maintain and trust.",
      },
    ],
    builtForTitle: "Ideal for cafés, coffee shops and sandwich bars",
    builtForBody:
      "TempTake suits independent cafés that need a practical system without heavy admin. It is especially useful where one small team is doing everything and records still need to stay tidy.",
    ctaBandTitle: "Make café food safety records simpler",
    ctaBandBody:
      "Start your free trial and keep checks, cleaning and allergen records in one place.",
    faqsTitle: "Café FAQ",
    faqs: [
      {
        question: "Is TempTake good for small café teams?",
        answer: "Yes. It is built to be simple, quick and easy to manage.",
      },
      {
        question: "Can I manage cleaning and temperature checks together?",
        answer:
          "Yes. TempTake is designed to keep those daily jobs together in one place.",
      },
      {
        question: "Does it help with allergen records?",
        answer:
          "Yes. Allergen management is part of the wider food safety workflow.",
      },
      {
        question: "Is it suitable for coffee shops that also serve food?",
        answer:
          "Yes. It works well for cafés, coffee shops and sandwich bars where chilled storage, prep and cleaning all need tracking.",
      },
      {
        question: "Can I use it for more than one café?",
        answer:
          "Yes. Multi-location use is supported through location-based setup.",
      },
    ],
  },

  restaurant: {
    slug: "restaurant-food-safety-app",
    seoTitle: "Food Safety Software for Restaurants | TempTake",
    metaDescription:
      "Food safety software for restaurants. Manage kitchen temperature logs, cleaning schedules, allergen controls and daily food hygiene records in one system.",
    eyebrow: "For restaurants",
    heroTitle: "Food safety software for restaurants",
    heroDescription:
      "TempTake helps restaurants replace paper food safety records with one system for kitchen temperature logs, cleaning schedules, allergen controls and manager visibility.",
    heroImageSrc: "/images/sectors/restaurant.png",
    heroImageAlt:
      "Restaurant chef or kitchen manager checking a phone or tablet during prep.",
    selectionImageSrc: "/images/sectors/restaurant2.png",
    selectionImageAlt:
      "Restaurant chef using a phone in a professional kitchen without text overlay.",
    primaryCtaLabel: "Start free trial",
    primaryCtaHref: "/signup",
    secondaryCtaLabel: "View live demo",
    secondaryCtaHref: "/demo",
    painTitle: "Restaurant compliance gets messy when records live on paper",
    painIntro:
      "Restaurants have more prep areas, more staff and more moving parts. That means more chances for tasks to be missed, records to be incomplete and managers to lose visibility across the day.",
    painPoints: [
      "Different prep areas mean more checks to track",
      "Tasks are split across multiple team members",
      "Cleaning needs stronger oversight",
      "Larger menus increase allergen risk",
      "Managers need visibility without chasing clipboards",
    ],
    solutionTitle: "Bring restaurant food safety into one clear system",
    solutionBody:
      "TempTake helps restaurant teams keep records organised and visible. Managers can see what is completed, what is overdue and where attention is needed without relying on blind trust.",
    featuresTitle: "What restaurants use TempTake for",
    features: [
      {
        title: "Temperature routines",
        body: "Create clear checks for fridges, freezers, prep and service areas.",
      },
      {
        title: "Cleaning management",
        body: "Keep recurring cleaning tasks visible and easier to complete.",
      },
      {
        title: "Allergen controls",
        body: "Keep allergen records and review points in one place.",
      },
      {
        title: "Team visibility",
        body: "See what is done, missed or unresolved without being on site all day.",
      },
      {
        title: "Reporting",
        body: "Generate clearer records and reports when they are requested.",
      },
    ],
    builtForTitle: "Built for restaurant kitchens with more moving parts",
    builtForBody:
      "If your kitchen has multiple prep stations, multiple staff and multiple daily checks, you need more than scattered paper sheets. TempTake gives restaurants a practical system for keeping the basics under control.",
    ctaBandTitle: "Get restaurant food safety records under control",
    ctaBandBody:
      "Start your free trial and give your team one place for temperatures, cleaning, allergens and records.",
    faqsTitle: "Restaurant FAQ",
    faqs: [
      {
        question: "Is TempTake suitable for independent restaurants?",
        answer:
          "Yes. It is designed to work for real restaurant teams, not just large chains.",
      },
      {
        question: "Can managers see what has and has not been completed?",
        answer: "Yes. Visibility is a major part of the value.",
      },
      {
        question: "Can multiple staff use it?",
        answer: "Yes. It is built around team use and operational records.",
      },
      {
        question: "Does it help with allergen management?",
        answer:
          "Yes. Allergen review and record-keeping are part of the platform.",
      },
      {
        question: "Can it work across multiple locations?",
        answer:
          "Yes. TempTake supports multiple sites through location-based structure and setup.",
      },
    ],
  },

  fishAndChips: {
    slug: "fish-and-chip-shop-food-safety-app",
    seoTitle: "Food Safety App for Fish & Chip Shops | TempTake",
    metaDescription:
      "Food safety app for fish and chip shops. Keep temperature logs, cleaning checks and daily food hygiene records organised in one simple system.",
    eyebrow: "For fish & chip shops",
    heroTitle: "Food safety app for fish & chip shops",
    heroDescription:
      "TempTake helps fish and chip shops replace paper records with one system for temperature checks, cleaning tasks, allergen records and daily food safety logging.",
    heroImageSrc: "/images/sectors/fish-and-chips.png",
    heroImageAlt:
      "Fish and chip shop staff member using a phone in a fryer or prep area.",
    selectionImageSrc: "/images/sectors/fish-and-chips2.png",
    selectionImageAlt:
      "Fish and chip shop worker using a phone in a fryer area without text overlay.",
    primaryCtaLabel: "Start free trial",
    primaryCtaHref: "/signup",
    secondaryCtaLabel: "View live demo",
    secondaryCtaHref: "/demo",
    painTitle: "Busy chippies need something faster than paper",
    painIntro:
      "Peak periods are relentless. The last thing anyone wants is to stop and wrestle with paper logs that end up incomplete, scruffy or forgotten by the end of the day.",
    painPoints: [
      "Hot-hold and chilled storage both need checking",
      "Paper records are easy to miss during busy periods",
      "Daily cleaning still needs proper completion",
      "Small teams need something quick and obvious",
      "Managers need records without extra hassle",
    ],
    solutionTitle: "A simpler way to keep chippy records tidy",
    solutionBody:
      "Use TempTake to keep the key checks in one place and make food safety admin less painful for busy fish and chip shops.",
    featuresTitle: "What fish & chip shops use TempTake for",
    features: [
      {
        title: "Temperature checks",
        body: "Record chilled storage and hot-hold temperatures quickly.",
      },
      {
        title: "Cleaning tasks",
        body: "Keep opening, during-day and closing checks organised.",
      },
      {
        title: "Allergen records",
        body: "Keep key allergen information easier to manage and review.",
      },
      {
        title: "Reports",
        body: "Keep clear records ready when needed.",
      },
    ],
    builtForTitle: "Designed for independent chippies and small groups",
    builtForBody:
      "Fish & chip shops are a distinct trade with their own pace and pressure. TempTake fits operators who want something practical, simple and built around real service conditions.",
    ctaBandTitle: "Still using paper records in your fish & chip shop?",
    ctaBandBody:
      "Start your free trial and switch to a simpler digital system.",
    faqsTitle: "Fish & chip shop FAQ",
    faqs: [
      {
        question: "Is TempTake a good fit for fish & chip shops?",
        answer:
          "Yes. It is especially suited to fast-moving food businesses with repeated daily checks.",
      },
      {
        question: "Can it handle hot-hold and chilled checks?",
        answer: "Yes. Temperature logging is a core part of the platform.",
      },
      {
        question: "Is it suitable for owner-operated shops?",
        answer: "Yes. It is built to stay simple enough for small teams.",
      },
      {
        question: "Can I use it across more than one shop?",
        answer: "Yes. Multi-location use is supported.",
      },
      {
        question: "Does it help replace paper cleaning records?",
        answer: "Yes. Cleaning records are one of the main use cases.",
      },
    ],
  },

  pub: {
    slug: "pub-food-safety-app",
    seoTitle: "Food Safety Software for Pubs Serving Food | TempTake",
    metaDescription:
      "Food safety software for pubs serving food. Manage kitchen temperature checks, cleaning tasks, allergen records and daily food hygiene logs in one practical system.",
    eyebrow: "For pubs serving food",
    heroTitle: "Food safety software for pubs serving food",
    heroDescription:
      "TempTake helps pubs serving food replace paper kitchen records with one system for temperature checks, cleaning tasks, allergen records and shift visibility.",
    heroImageSrc: "/images/sectors/pub.png",
    heroImageAlt:
      "Pub kitchen staff member using a phone to complete a food safety check.",
    selectionImageSrc: "/images/sectors/pub2.png",
    selectionImageAlt:
      "Pub kitchen worker using a phone near plated food without text overlay.",
    primaryCtaLabel: "Start free trial",
    primaryCtaHref: "/signup",
    secondaryCtaLabel: "View live demo",
    secondaryCtaHref: "/demo",
    painTitle: "Food service in pubs gets messy when records are spread everywhere",
    painIntro:
      "Pubs already have enough to juggle. Once food service is involved, it becomes easy for checks to drift across shifts, staff and days unless the system is obvious and consistent.",
    painPoints: [
      "Food checks compete with everything else going on",
      "Different shifts make accountability harder",
      "Cleaning becomes inconsistent without structure",
      "Allergen information has to stay up to date",
      "Managers want visibility without paperwork chaos",
    ],
    solutionTitle: "Give your pub kitchen one clear daily system",
    solutionBody:
      "TempTake helps pub teams keep essential food safety tasks organised while giving managers clearer oversight of what is done, missed or still needs attention.",
    featuresTitle: "What pubs use TempTake for",
    features: [
      {
        title: "Daily kitchen checks",
        body: "Keep routine temperature and food safety checks in one place.",
      },
      {
        title: "Cleaning control",
        body: "Track recurring cleaning tasks across shifts.",
      },
      {
        title: "Allergen records",
        body: "Keep allergen information clearer and easier to review.",
      },
      {
        title: "Team visibility",
        body: "Make it easier to see what is done and what still needs attention.",
      },
    ],
    builtForTitle: "For pubs, gastro pubs and hospitality venues serving food",
    builtForBody:
      "Pub kitchens need systems that are practical, not overcomplicated. TempTake helps teams handle food safety tasks in a way that fits real hospitality work.",
    ctaBandTitle: "Make pub kitchen food safety easier to manage",
    ctaBandBody:
      "Start your free trial and get one place for checks, cleaning and records.",
    faqsTitle: "Pub FAQ",
    faqs: [
      {
        question: "Is TempTake suitable for pubs serving food?",
        answer:
          "Yes. It is built for food operations that need practical daily record-keeping.",
      },
      {
        question: "Can it help across different shifts?",
        answer: "Yes. It gives a clearer record of what has been completed.",
      },
      {
        question: "Does it include cleaning and temperature checks?",
        answer: "Yes. Those are core parts of the system.",
      },
      {
        question: "Does it help with allergen records?",
        answer: "Yes. Allergen workflows are part of the platform.",
      },
      {
        question: "Can pub groups use it across sites?",
        answer: "Yes. TempTake supports multiple locations.",
      },
    ],
  },

  mobileCatering: {
    slug: "mobile-catering-food-safety-app",
    seoTitle: "Food Safety App for Mobile Caterers | TempTake",
    metaDescription:
      "Food safety app for mobile caterers and food trucks. Keep temperature checks, cleaning records and allergen information organised on your phone wherever you trade.",
    eyebrow: "For mobile caterers",
    heroTitle: "Food safety app for mobile caterers",
    heroDescription:
      "TempTake helps mobile caterers and food trucks replace paper records with one phone-friendly system for temperature checks, cleaning records and allergen information.",
    heroImageSrc: "/images/sectors/mobile-catering.png",
    heroImageAlt:
      "Food truck or mobile caterer using a phone to record food safety checks.",
    selectionImageSrc: "/images/sectors/mobile-catering2.png",
    selectionImageAlt:
      "Mobile caterer in a food truck using a phone without text overlay.",
    primaryCtaLabel: "Start free trial",
    primaryCtaHref: "/signup",
    secondaryCtaLabel: "View live demo",
    secondaryCtaHref: "/demo",
    painTitle: "Paper records are a pain when your business is on the move",
    painIntro:
      "Mobile food businesses still need proper records, but paper forms are awkward in small spaces, temporary setups and fast-moving environments.",
    painPoints: [
      "Paper records are difficult to manage on the go",
      "Checks still need doing at temporary sites",
      "Small working spaces make admin harder",
      "Allergens must still be clearly managed",
      "You need records you can access anywhere",
    ],
    solutionTitle: "Keep mobile catering records portable and practical",
    solutionBody:
      "Use TempTake on your phone to manage the checks you need, keep records together and avoid carrying loose sheets, folders and half-completed paperwork.",
    featuresTitle: "What mobile caterers use TempTake for",
    features: [
      {
        title: "Mobile-friendly checks",
        body: "Complete daily checks on your phone wherever you are trading.",
      },
      {
        title: "Temperature logs",
        body: "Record storage and food temperatures on the move.",
      },
      {
        title: "Cleaning records",
        body: "Keep cleaning tasks visible even in compact setups.",
      },
      {
        title: "Allergen records",
        body: "Keep allergen information organised and accessible.",
      },
      {
        title: "Digital records",
        body: "Have a clearer audit trail without the paper mess.",
      },
    ],
    builtForTitle: "Perfect for food trucks, street food traders and event caterers",
    builtForBody:
      "TempTake works well for operators who need a practical digital system that travels with them and does not rely on an office, clipboard or fixed site.",
    ctaBandTitle: "Take your food safety records off paper",
    ctaBandBody:
      "Start your free trial and keep mobile catering records on your phone.",
    faqsTitle: "Mobile catering FAQ",
    faqs: [
      {
        question: "Is TempTake suitable for food trucks?",
        answer:
          "Yes. It is especially useful for businesses that work in smaller, mobile environments.",
      },
      {
        question: "Can I use it on my phone?",
        answer: "Yes. That is one of the main advantages for mobile operators.",
      },
      {
        question: "Does it still work for temporary trading locations?",
        answer:
          "Yes. It is designed to keep records organised wherever you are working.",
      },
      {
        question: "Can it help with allergens and cleaning too?",
        answer: "Yes. It is not just for temperature logging.",
      },
      {
        question: "Is it suitable for event caterers as well as food trucks?",
        answer: "Yes. It works for a wide range of mobile food businesses.",
      },
    ],
  },
};