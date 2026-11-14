import { partnershipLine } from "@/lib/site";
/**
 * Landing page copy as typed data.
 * Source: content/landing-copy.md (approved copy, with the changes listed at its top). Do not edit wording here
 * without updating that file. Contact details and links live in src/lib/site.ts.
 *
 * Headings that appear in capitals in the copy file are stored in title case here;
 * capitalisation is a presentation choice made in the components.
 */

export type Phase = {
  id: "virtual" | "physical";
  label: string;
  title: string;
  weeks: { from: number; to: number };
  weeksLabel: string;
  lede: string;
  body: string[];
};

export type TrainingArea = {
  number: number;
  title: string;
  tagline: string;
  intro: string[];
  topics: string[];
  gain: string;
  note?: string;
};

/** Inline link targets resolved from src/lib/site.ts at render time. */
export type LinkTarget = "phone" | "activate";

/** A run of text where some pieces are links. */
export type RichText = (string | { text: string; link: LinkTarget })[];

export type FaqItem = { question: string; answer: RichText };

export type DefinitionItem = { term: string; description: string };

export const programme = {
  title: "OAUSTECH Entrepreneurship, ICT, Digital Skills & Emerging Technologies Training Programme",
  durationWeeks: 26,
} as const;

export const hero = {
  eyebrow: programme.title,
  /** Line breaks are a layout choice; the words are the copy's, unchanged. */
  headline: ["26 Weeks to Learn.", "Build. Innovate.", "Become an Entrepreneur."],
  strapline: "Powered by practical learning. Driven by innovation. Designed for the future.",
  question:
    "Are you ready to move beyond theoretical knowledge and acquire practical skills that can open doors to new opportunities?",
  intro: [
    "The Entrepreneurship, ICT/Digital Skills and Emerging Technologies Training Programme at Olusegun Agagu University of Science and Technology (OAUSTECH), Okitipupa, Ondo State, is designed to equip participants with relevant entrepreneurial, digital and technology skills for today's changing world.",
    "From learning how to build a business and use digital tools to exploring artificial intelligence, drone technology, data processing and other emerging innovations, this programme offers an opportunity to discover your potential, develop practical abilities and prepare for the opportunities of tomorrow.",
  ],
  summary: "26 weeks of learning, practical training, creativity and innovation.",
  loginLabel: "Log in to your dashboard",
  activatePrompt: "First time here?",
  activateLabel: "Activate your account",
  enquireLabel: "Enquire",
  location: "OAUSTECH, Okitipupa, Ondo State, Nigeria",
} as const;

export const about = {
  kicker: "About the Programme",
  heading: "Skills That Prepare You for the Real World",
  body: [
    "The world of work and business is changing rapidly. Technology is transforming how businesses operate, how information is processed, how products are delivered and how people solve everyday problems.",
    "This programme is designed to help participants become part of that transformation.",
    "Through a combination of virtual instruction and physical, hands-on training, participants will explore entrepreneurship, information technology, digital business tools and emerging technologies.",
    "The programme goes beyond introducing participants to technology. It encourages them to understand how technology can be applied to solve real problems, create business opportunities, improve productivity and develop sustainable sources of income.",
    "Whether your ambition is to establish a business, become a skilled professional, work with technology or explore a new career path, this programme provides a foundation for your next step.",
  ],
  /**
   * "Why participate" and "What you can expect to gain" merged into one list. Every phrase
   * comes from those two lists in content/landing-copy.md; duplicates removed.
   */
  benefitsHeading: "What You Will Gain",
  benefits: [
    {
      term: "Practical Skills",
      description: "Develop useful skills through guided exercises, demonstrations and hands-on activities.",
    },
    {
      term: "Entrepreneurial Thinking",
      description: "Learn how to identify opportunities, develop business ideas and create value.",
    },
    {
      term: "Digital Skills",
      description: "Build foundational ICT and digital skills, and learn to use digital tools to address everyday challenges.",
    },
    {
      term: "Technology Exposure",
      description: "Explore artificial intelligence, data, drones, cybersecurity, IoT and blockchain, and how they are applied in real-world industries.",
    },
    {
      term: "Career Opportunities",
      description: "Identify possible business, career and innovation opportunities, with practical experience that supports your professional development.",
    },
    {
      term: "Innovation and Creativity",
      description: "Develop the confidence to experiment, build ideas and explore new possibilities.",
    },
  ] satisfies DefinitionItem[],
  /** Condensed from "Who should participate". */
  audience: "Open to students, graduates, aspiring entrepreneurs and professionals who want practical skills.",
} as const;

export const structure = {
  kicker: "Programme Structure",
  heading: "A 26-Week Learning Experience",
  intro:
    "The programme is organised into two major phases to combine foundational learning with practical experience.",
  phases: [
    {
      id: "virtual",
      label: "Phase One",
      title: "Virtual Learning",
      weeks: { from: 1, to: 6 },
      weeksLabel: "Weeks 1–6",
      lede: "Build your foundation through structured online instruction.",
      body: [
        "During the first six weeks, participants will receive virtual learning and guided instruction covering relevant programme concepts, introductory knowledge and preparation for practical training.",
        "This phase is designed to introduce participants to the subject areas, build foundational understanding and prepare them for the next stage.",
      ],
    },
    {
      id: "physical",
      label: "Phase Two",
      title: "Physical and Practical Training",
      weeks: { from: 7, to: 26 },
      weeksLabel: "Weeks 7–26",
      lede: "Move from learning concepts to applying them.",
      body: [
        "The second phase will involve physical, hands-on training at OAUSTECH, Okitipupa.",
        "Participants will engage in practical sessions, demonstrations, exercises and guided activities designed to help them understand how their acquired knowledge can be applied.",
        "The focus will be on building confidence, developing practical competence and exploring real-world applications.",
      ],
    },
  ] satisfies Phase[],
} as const;

export const trainingAreas = {
  kicker: "Key Training Areas",
  topicsLabel: "Topics may include:",
  gainLabel: "What you will gain:",
  areas: [
    {
      number: 1,
      title: "Entrepreneurship and Business Development",
      tagline: "Turn ideas into opportunities.",
      intro: [
        "Learn how to recognise business opportunities, develop business ideas and understand what it takes to establish and manage a sustainable business.",
      ],
      topics: [
        "Introduction to entrepreneurship and innovation.",
        "Identifying business opportunities and market needs.",
        "Business idea development and validation.",
        "Business planning and strategy.",
        "Customer discovery and market research.",
        "Business model development.",
        "Financial literacy and basic business management.",
        "Digital tools for small businesses.",
        "Building and promoting a business.",
        "Introduction to business growth and sustainability.",
      ],
      gain: "How to identify opportunities and take the first steps towards building a business.",
    },
    {
      number: 2,
      title: "Information Technology and Digital Productivity",
      tagline: "Understand the technology behind today's digital world.",
      intro: [
        "Develop foundational IT knowledge and learn how digital tools can improve productivity, communication and business operations.",
      ],
      topics: [
        "Computer fundamentals and digital literacy.",
        "Internet technologies and online collaboration.",
        "Introduction to programming and logical thinking.",
        "Web technologies and digital platforms.",
        "Productivity tools and digital workflows.",
        "Introduction to databases and information management.",
        "Basic technical troubleshooting.",
        "Digital safety and responsible technology use.",
      ],
      gain: "Confidence with common technology tools and systems.",
    },
    {
      number: 3,
      title: "Digital Marketing and Business Analytics",
      tagline:
        "Learn how businesses attract customers and make better decisions using digital platforms and data.",
      intro: [],
      topics: [
        "Introduction to digital marketing.",
        "Social media marketing and content creation.",
        "Online branding and audience development.",
        "Search engine optimisation fundamentals.",
        "Digital advertising concepts.",
        "Marketing campaign planning.",
        "Introduction to website analytics.",
        "Understanding business and customer data.",
        "Data visualisation and reporting.",
        "Using analytics to improve business decisions.",
      ],
      gain: "Promote products and services online and use data to evaluate performance.",
    },
    {
      number: 4,
      title: "Artificial Intelligence and Machine Learning",
      tagline: "Explore how intelligent systems are changing the world.",
      intro: [
        "Get introduced to artificial intelligence and understand how it can be applied in business, education, agriculture, research and everyday problem-solving.",
      ],
      topics: [
        "Introduction to artificial intelligence.",
        "Understanding machine learning concepts.",
        "Generative AI and practical AI tools.",
        "AI-assisted content creation and productivity.",
        "Introduction to data preparation and analysis.",
        "AI applications in business and entrepreneurship.",
        "Introduction to automation and intelligent workflows.",
        "Responsible and ethical use of AI.",
      ],
      gain: "How modern AI tools can improve productivity and solve problems.",
    },
    {
      number: 5,
      title: "Cybersecurity and Data Protection",
      tagline: "Learn how to protect information, devices and digital systems.",
      intro: [
        "As more businesses and individuals depend on digital platforms, understanding cybersecurity is increasingly important.",
      ],
      topics: [
        "Introduction to cybersecurity.",
        "Common online threats and cyber risks.",
        "Password security and account protection.",
        "Phishing and online fraud awareness.",
        "Safe internet and device usage.",
        "Data privacy and protection principles.",
        "Basic network security concepts.",
        "Cybersecurity awareness for businesses.",
        "Responsible handling of digital information.",
      ],
      gain: "Awareness of digital risks and safer technology practices.",
    },
    {
      number: 6,
      title: "Drone Technology and Aerial Data Applications",
      tagline: "Take technology beyond the computer screen.",
      intro: [
        "Discover how unmanned aerial vehicles (UAVs), commonly known as drones, are used in modern industries.",
        "Participants can be introduced to drone technology and its applications in agriculture, environmental monitoring, construction, mapping, surveying and media production.",
      ],
      topics: [
        "Introduction to drone technology.",
        "Types of drones and their applications.",
        "Drone components and basic operations.",
        "Flight principles and safety procedures.",
        "Introduction to drone flight planning.",
        "Practical drone operation and supervised flying exercises.",
        "Aerial photography and image capture.",
        "Introduction to aerial data collection.",
        "Processing and interpreting drone-captured data.",
        "Real-world applications of drone technology.",
      ],
      gain: "How drones and aerial data can support business, research and industry.",
      note: "Practical drone operations will be subject to equipment availability, appropriate supervision and applicable aviation and safety requirements.",
    },
    {
      number: 7,
      title: "Data Processing, Analysis and Visualisation",
      tagline: "Learn how to turn raw information into useful insights.",
      intro: [
        "Data is an important resource in business, research, agriculture, technology and decision-making. This training area introduces participants to methods of collecting, organising, processing and interpreting data.",
      ],
      topics: [
        "Introduction to data and information.",
        "Data collection methods.",
        "Data cleaning and organisation.",
        "Spreadsheet-based data processing.",
        "Basic statistical concepts.",
        "Data analysis and interpretation.",
        "Charts, reports and data visualisation.",
        "Introduction to mapping and geospatial data.",
        "Understanding aerial and drone-generated datasets.",
        "Using data to support decisions.",
      ],
      gain: "Work with data, identify patterns and communicate findings.",
    },
    {
      number: 8,
      title: "Emerging Technologies: Internet of Things and Blockchain",
      tagline: "Explore technologies shaping the next generation of digital products and services.",
      intro: [],
      topics: [
        "Introduction to emerging technologies.",
        "Internet of Things (IoT) concepts.",
        "Smart devices and connected systems.",
        "Sensors and data collection.",
        "Practical applications of IoT in agriculture and industry.",
        "Introduction to blockchain technology.",
        "Understanding decentralised systems.",
        "Blockchain applications in business and digital services.",
        "Innovation opportunities around emerging technologies.",
      ],
      gain: "A foundation in emerging technologies and the opportunities they may create.",
    },
  ] satisfies TrainingArea[],
} as const;

/** "Who's behind the programme": Crystal Entrepreneurship Centre and OAUSTECH. */
export const behind = {
  kicker: "About Us",
  heading: "Who's Behind the Programme",
  crystal: {
    heading: "Crystal Entrepreneurship Centre",
    body: "Crystal Entrepreneurship Centre delivers practical training in entrepreneurship and digital skills. Our sessions are hands-on: participants learn by doing, work with real tools and leave with skills they can use straight away. This programme with OAUSTECH builds on that experience. The photos here are from our past trainings.",
  },
  oaustech: {
    heading: "OAUSTECH",
    /** Shortened from the copy's "Why OAUSTECH?" section. */
    body: [
      "Olusegun Agagu University of Science and Technology (OAUSTECH), Okitipupa, is a technology-focused university established to support scientific, technological and professional development.",
      "This programme supports that broader direction by bringing entrepreneurship, digital skills and emerging technologies together in a practical learning experience.",
    ],
    /** Set large as a quote. */
    motto: "For Society and Development",
    mottoLabel: "The university's motto",
    websiteLabel: "Official website",
  },
} as const;

/** "From our past trainings": photo gallery of Crystal's past sessions. */
export const pastTrainingsGallery = {
  kicker: "Gallery",
  heading: "From our past trainings",
  intro: "Photos from training sessions run by Crystal Entrepreneurship Centre.",
  viewAll: "View all photos",
  /** The grid shows at most this many photos; the rest are reached through the lightbox. */
  maxInGrid: 8,
} as const;

export const faq = {
  heading: "Frequently Asked Questions",
  items: [
    { question: "How long is the programme?", answer: ["The programme runs for 26 weeks."] },
    {
      question: "How will the training be delivered?",
      answer: ["The first six weeks will be delivered virtually. Weeks 7–26 will involve physical, hands-on training at OAUSTECH, Okitipupa."],
    },
    {
      question: "Where will the physical training take place?",
      answer: ["Physical training will take place at Olusegun Agagu University of Science and Technology, Okitipupa, Ondo State."],
    },
    {
      question: "How do I access the programme?",
      answer: [
        "Applications for this cohort have closed. Registered participants can log in with their matric number or email. If you have not activated your account yet, use ",
        { text: "Activate your account", link: "activate" },
        ".",
      ],
    },
    {
      question: "Will there be practical drone training?",
      answer: ["Drone technology and aerial data applications are proposed as part of the training areas. Practical flying activities will depend on equipment availability, appropriate supervision and applicable safety and aviation requirements."],
    },
    {
      question: "Who can I contact for enquiries?",
      answer: ["You can contact the programme team on ", { text: "+234 703 203 8565", link: "phone" }, "."],
    },
  ] satisfies FaqItem[],
} as const;

/** Applications are closed, so the closing block points registered participants to the platform. */
export const finalCta = {
  heading: "Already registered?",
  body: "Log in to see your classes, materials and assessments.",
  loginLabel: "Log in",
  activatePrompt: "First time here?",
  activateLabel: "Activate your account",
  facts: [
    { term: "Programme", description: "Entrepreneurship, ICT/Digital Skills & Emerging Technologies Training Programme" },
    { term: "Duration", description: "26 Weeks" },
    { term: "Institution", description: "Olusegun Agagu University of Science and Technology (OAUSTECH)" },
    { term: "Location", description: "Okitipupa, Ondo State, Nigeria" },
  ] satisfies DefinitionItem[],
  enquiriesLabel: "For enquiries",
} as const;

export const contact = {
  heading: "Contact Information",
  institution: "Olusegun Agagu University of Science and Technology (OAUSTECH)",
  address: "Okitipupa, Ondo State, Nigeria.",
  enquiriesLabel: "Programme Enquiries",
  platformLabel: "Registered Participants",
  platformLinkLabel: "Log in to the training platform",
  websiteLabel: "Official University Website",
  partnershipLine,
  // Not rendered: the copy's closing note says fees, certificate arrangements, available tracks
  // and final schedules must be confirmed before publication.
  // TODO(content): add fees and schedules only once organisers confirm them.
} as const;
