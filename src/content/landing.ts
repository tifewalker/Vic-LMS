/**
 * Landing page copy as typed data.
 * Source of truth: content/landing-copy.md (approved copy). Do not edit wording here
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

export type FaqItem = { question: string; answer: string };

export type DefinitionItem = { term: string; description: string };

export const programme = {
  title: "OAUSTECH Entrepreneurship, ICT, Digital Skills & Emerging Technologies Training Programme",
  durationWeeks: 26,
} as const;

export const hero = {
  eyebrow: programme.title,
  headline: ["26 Weeks to Learn.", "Build.", "Innovate.", "Become an Entrepreneur."],
  strapline: "Powered by practical learning. Driven by innovation. Designed for the future.",
  question:
    "Are you ready to move beyond theoretical knowledge and acquire practical skills that can open doors to new opportunities?",
  intro: [
    "The Entrepreneurship, ICT/Digital Skills and Emerging Technologies Training Programme at Olusegun Agagu University of Science and Technology (OAUSTECH), Okitipupa, Ondo State, is designed to equip participants with relevant entrepreneurial, digital and technology skills for today's changing world.",
    "From learning how to build a business and use digital tools to exploring artificial intelligence, drone technology, data processing and other emerging innovations, this programme offers an opportunity to discover your potential, develop practical abilities and prepare for the opportunities of tomorrow.",
  ],
  summary: "26 weeks of learning, practical training, creativity and innovation.",
  applyLabel: "Apply for the Programme",
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
  whyHeading: "Why Participate?",
  whyItems: [
    {
      term: "Practical Skills",
      description: "Develop useful skills through guided exercises, demonstrations and hands-on activities.",
    },
    {
      term: "Entrepreneurial Thinking",
      description: "Learn how to identify opportunities, develop business ideas and create value.",
    },
    {
      term: "Technology Exposure",
      description: "Explore modern technologies and understand how they are applied in real-world industries.",
    },
    {
      term: "Problem-Solving",
      description: "Learn to use digital tools and technology to address everyday challenges.",
    },
    {
      term: "Career Opportunities",
      description: "Build knowledge and practical experience that can support your professional development.",
    },
    {
      term: "Innovation and Creativity",
      description: "Develop the confidence to experiment, build ideas and explore new possibilities.",
    },
  ] satisfies DefinitionItem[],
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
      gain: "A better understanding of how to identify opportunities, develop business ideas and take the first steps towards building a business.",
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
      gain: "Practical digital knowledge and the confidence to work with common technology tools and systems.",
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
      gain: "The ability to understand digital marketing channels, promote products and services online, and use data to evaluate performance.",
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
      gain: "An understanding of modern AI tools and how they can be used to improve productivity, solve problems and develop new opportunities.",
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
      gain: "Practical awareness of digital risks and the knowledge to adopt safer technology practices.",
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
      gain: "An understanding of drone technology, its practical uses and how aerial data can support business, research and industry.",
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
      gain: "The ability to work with data, organise information, identify patterns and communicate findings.",
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
      gain: "A foundational understanding of emerging technologies and the opportunities they may create across different industries.",
    },
  ] satisfies TrainingArea[],
} as const;

export const whoShouldParticipate = {
  heading: "Who Should Participate?",
  intro:
    "The programme is suitable for individuals who want to develop practical skills, explore entrepreneurship and understand how technology can create opportunities.",
  listLead: "It may be particularly valuable for:",
  items: [
    "Young people interested in technology and innovation.",
    "Aspiring entrepreneurs and business owners.",
    "Students and recent graduates.",
    "Individuals interested in digital careers.",
    "Professionals looking to develop additional skills.",
    "People interested in AI, data, drones and emerging technologies.",
    "Individuals seeking practical knowledge for self-employment and business development.",
  ],
  closing:
    "You do not need to have mastered every subject before joining. A willingness to learn, participate and develop new skills is important.",
} as const;

export const eligibility = {
  heading: "Eligibility Requirements",
  listLead: "Applicants should demonstrate:",
  items: [
    "Interest in entrepreneurship, technology or digital skills.",
    "Willingness to participate in the programme.",
    "Commitment to attending scheduled virtual and physical sessions.",
    "A passion for learning, innovation and personal development.",
    "Relevant educational background or interest in the selected training area.",
  ],
  closing:
    "Specific academic or professional requirements may depend on the training area and will be communicated by the programme organisers.",
} as const;

export const outcomes = {
  heading: "What You Can Expect to Gain",
  listLead: "By participating in this programme, you will have the opportunity to:",
  items: [
    "Develop entrepreneurial knowledge and business awareness.",
    "Build foundational ICT and digital skills.",
    "Understand how modern technology is used in different industries.",
    "Explore practical applications of artificial intelligence.",
    "Gain exposure to drone operations and aerial data applications.",
    "Develop basic data processing and analytical skills.",
    "Understand cybersecurity and responsible data practices.",
    "Explore emerging technologies such as IoT and blockchain.",
    "Work on practical exercises and learning activities.",
    "Identify possible business, career and innovation opportunities.",
  ],
  closing:
    "The programme is designed to encourage practical learning and confidence, helping participants understand how to apply their knowledge beyond the classroom.",
} as const;

export const whyOaustech = {
  kicker: "Why OAUSTECH?",
  heading: "Learning, Technology and Development",
  body: [
    "Olusegun Agagu University of Science and Technology (OAUSTECH), Okitipupa, is a technology-focused university established to support scientific, technological and professional development.",
    "The University's vision is to develop technologically competent individuals who can respond to the needs of their environment in a technology-driven economy.",
  ],
  /** Set large as a quote. */
  motto: "For Society and Development",
  /** The full sentence from the copy, unchanged. */
  mottoSentence:
    "Its motto, “For Society and Development,” reflects the importance of applying knowledge and innovation to improve communities and society.",
  closing:
    "This programme supports that broader direction by bringing entrepreneurship, digital skills and emerging technologies together in a practical learning experience.",
  location: "Olusegun Agagu University of Science and Technology, Okitipupa, Ondo State, Nigeria.",
  websiteLabel: "Official website",
} as const;

export const faq = {
  heading: "Frequently Asked Questions",
  items: [
    { question: "How long is the programme?", answer: "The programme runs for 26 weeks." },
    {
      question: "How will the training be delivered?",
      answer:
        "The first six weeks will be delivered virtually. Weeks 7–26 will involve physical, hands-on training at OAUSTECH, Okitipupa.",
    },
    {
      question: "Where will the physical training take place?",
      answer:
        "Physical training will take place at Olusegun Agagu University of Science and Technology, Okitipupa, Ondo State.",
    },
    {
      question: "Do I need prior experience in technology?",
      answer:
        "Prior experience may be helpful for some training areas, but the programme is intended to introduce and develop relevant knowledge and practical skills. Specific entry requirements will be communicated by the organisers.",
    },
    {
      question: "Will there be practical drone training?",
      answer:
        "Drone technology and aerial data applications are proposed as part of the training areas. Practical flying activities will depend on equipment availability, appropriate supervision and applicable safety and aviation requirements.",
    },
    {
      question: "Will I receive a certificate?",
      // TODO(content): certificate arrangements are "to be confirmed". Copy reads like an internal note;
      // confirm whether to show this answer or "Details to be announced" until organisers confirm.
      answer:
        "Certificate arrangements should be confirmed by the programme organisers. Please contact the programme team for details.",
    },
    {
      question: "How do I apply?",
      answer:
        "Complete the official application form using the application link provided on this page. Ensure that the information submitted is accurate.",
    },
    {
      question: "Who can I contact for enquiries?",
      // The phone number is appended from site.phone in the component.
      answer: "You can contact the programme team on",
    },
  ] satisfies FaqItem[],
} as const;

export const finalCta = {
  kicker: "Take the Next Step",
  heading: "Your Future Should Not Be Limited by What You Know Today.",
  body: [
    "The opportunities created by entrepreneurship and technology are growing. The ability to learn, adapt and apply new skills can help you become part of that future.",
    "Whether you want to start a business, develop a digital career, explore drone technology, understand artificial intelligence or build practical data skills, this programme is an opportunity to begin.",
  ],
  strapline: "Learn new skills. Discover opportunities. Build something meaningful.",
  applyLabel: "Apply Now",
  facts: [
    { term: "Programme", description: "Entrepreneurship, ICT/Digital Skills & Emerging Technologies Training Programme" },
    { term: "Duration", description: "26 Weeks" },
    { term: "Institution", description: "Olusegun Agagu University of Science and Technology (OAUSTECH)" },
    { term: "Location", description: "Okitipupa, Ondo State, Nigeria" },
  ] satisfies DefinitionItem[],
  enquiriesLabel: "For enquiries",
} as const;

export const contact = {
  heading: "Contact and Application Information",
  institution: "Olusegun Agagu University of Science and Technology (OAUSTECH)",
  address: "Okitipupa, Ondo State, Nigeria.",
  enquiriesLabel: "Programme Enquiries",
  formLabel: "Application Form",
  websiteLabel: "Official University Website",
  partnershipLine: "Delivered by Victory Entrepreneurship Centre in partnership with OAUSTECH",
  // Not rendered: the copy's closing note says application dates, fees, certificate arrangements,
  // available tracks and final schedules must be confirmed before publication.
  // TODO(content): add dates, fees and schedules only once organisers confirm them.
} as const;
