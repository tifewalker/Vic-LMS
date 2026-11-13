/**
 * Image registry. Every photo used on the site is declared here once.
 * Files live in public/images/ and are served with next/image (no hotlinking).
 *
 * Section slots accept `SiteImage | null`. When a slot is null the section
 * renders without a photo (or with a neutral captioned placeholder), so client
 * photos can be added later by editing this file only.
 */

export type SiteImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** A short description for our records. Never rendered: photos show no visible captions. */
  caption?: string;
  /** CSS object-position used when the frame crops the photo, e.g. "65% 50%". */
  objectPosition?: string;
  /** Where the image came from, for our records. Not rendered. */
  source?: string;
  /** Photographer credit for licensed stock photos (kept for our records in public/images/CREDITS.md, not shown on the site). */
  credit?: { name: string; profile: string };
};

/** A Pexels photo. Pexels licence: free for commercial use, attribution not required but given. */
const pexels = (
  file: string,
  width: number,
  height: number,
  alt: string,
  caption: string,
  source: string,
  name: string,
  profile: string,
  objectPosition?: string,
): SiteImage => ({ src: `/images/programmes/${file}.webp`, width, height, alt, caption, source, credit: { name, profile }, objectPosition });

export const images = {
  oaustechLogo: {
    src: "/images/oaustech-logo.png",
    alt: "Olusegun Agagu University of Science and Technology logo, with the motto For Society and Development",
    width: 310,
    height: 65,
    source: "https://oaustech.edu.ng/images/logo.png",
  },
  campusGate: {
    src: "/images/oaustech-campus.jpg",
    alt: "The main gate of Olusegun Agagu University of Science and Technology, Okitipupa, with the university name on the arch and green grounds beyond",
    width: 1920,
    height: 550,
    caption: "Main gate, OAUSTECH, Okitipupa",
    source: "https://oaustech.edu.ng/cache/resized/0930ca64ead13e2113232a6df145a9c7.jpg",
  },
  auditorium: {
    src: "/images/oaustech-auditorium.jpg",
    alt: "The University Auditorium at OAUSTECH, a cream two-storey building with its name in red letters, framed by a curved red steel arch",
    width: 1920,
    height: 550,
    caption: "University Auditorium, OAUSTECH",
    // Keeps both the "University" and "Auditorium" signs in frame when cropped.
    objectPosition: "72% 50%",
    source: "https://oaustech.edu.ng/cache/resized/e5032fe998fcdad7d034560cc740340a.jpg",
  },
  library: {
    src: "/images/oaustech-library.jpg",
    alt: "The University Library at OAUSTECH, a three-storey white and grey building with flowering shrubs at the entrance",
    width: 1920,
    height: 550,
    caption: "University Library, OAUSTECH",
    objectPosition: "55% 50%",
    source: "https://oaustech.edu.ng/cache/resized/25409442948fc7b1a29bf29244f3c3f6.jpg",
  },
} satisfies Record<string, SiteImage>;

/**
 * Photos from Crystal Entrepreneurship Centre's past trainings, supplied by the client.
 * Originals (WhatsApp exports, 1080px wide) are kept out of the build in web/assets/photo-originals.
 * They are not upscaled, so they stay at their native width.
 */
const crystal = (file: string, width: number, height: number, alt: string, objectPosition?: string): SiteImage => ({
  src: `/images/crystal/${file}.webp`,
  width,
  height,
  alt,
  source: `Crystal Entrepreneurship Centre, web/assets/photo-originals/${file}.jpeg`,
  objectPosition,
});

export const crystalPhotos = {
  hallWide: crystal("hall-wide", 1080, 810,
    "A packed hall at a Crystal Entrepreneurship Centre training, with participants filling the floor and the balcony", "50% 62%"),
  hallAudience: crystal("hall-audience", 1080, 810,
    "Participants in a crowded hall listen during a Crystal training session, some holding notes and handouts", "50% 60%"),
  lectureTheatre: crystal("lecture-theatre", 1080, 810,
    "Students in white and blue uniforms fill the tiered seats of a lecture theatre during a Crystal training session", "50% 45%"),
  entrepreneurshipPanel: crystal("entrepreneurship-panel", 1008, 756,
    "A speaker with a microphone addresses participants from a panel table under a banner for an entrepreneurship training in Ondo State", "37% 50%"),
  lagosSession: crystal("lagos-sdg-session", 1080, 810,
    "A speaker with a microphone stands at a panel table in front of a Crystal Entrepreneurship Centre banner at a session with the Lagos State Office of Sustainable Development Goals", "50% 40%"),
} satisfies Record<string, SiteImage>;

/** Photo slots per section. Set to an image to show it, or null for none. */
export const imageSlots: {
  hero: SiteImage | null;
  oaustech: SiteImage | null;
} = {
  hero: crystalPhotos.hallWide,
  oaustech: images.campusGate,
};

/** "From our past trainings" gallery, in display order. All are real Crystal photos. */
export const pastTrainings: SiteImage[] = [
  crystalPhotos.hallWide,
  crystalPhotos.lagosSession,
  crystalPhotos.lectureTheatre,
  crystalPhotos.entrepreneurshipPanel,
  crystalPhotos.hallAudience,
];

/**
 * One photo per training area, in the order of the eight areas (01 to 08).
 * A real Crystal photo where one matches the area (01 entrepreneurship); Pexels stock
 * photos for the rest. None of these were taken at OAUSTECH.
 */
export const programmePhotos: SiteImage[] = [
  crystalPhotos.entrepreneurshipPanel,
  pexels("it-productivity", 1600, 1067,
    "Two women in green ankara prints work together at a laptop in an office with bookshelves",
    "Working through a document together on a laptop",
    "https://www.pexels.com/photo/women-looking-at-the-laptop-3869650/",
    "PICHA Stock", "https://www.pexels.com/@picha-stock-2210122/", "40% 50%"),
  pexels("digital-marketing", 1600, 2400,
    "A woman with long braids reviews printed charts beside her open laptop at a bright desk",
    "Reviewing campaign figures beside a laptop",
    "https://www.pexels.com/photo/a-trader-analyzing-graphs-7173020/",
    "Nataliya Vaitkevich", "https://www.pexels.com/@n-voitkevich/", "50% 45%"),
  pexels("ai-machine-learning", 1600, 1067,
    "A small white humanoid robot stands in a long corridor with a green wall and wooden cabinets",
    "A humanoid robot at the Goethe-Institut, Lagos",
    "https://www.pexels.com/photo/robot-in-corridor-of-goethe-institut-nigeria-16544931/",
    "Tope J. Asokere", "https://www.pexels.com/@topeasokere/", "50% 55%"),
  pexels("cybersecurity", 1600, 1068,
    "A woman in glasses stands with folded arms in a server room lit in blue",
    "An engineer in a server room",
    "https://www.pexels.com/photo/woman-standing-near-wall-1181323/",
    "Christina Morillo", "https://www.pexels.com/@divinetechygirl/", "62% 40%"),
  pexels("drones", 1600, 1384,
    "A white camera drone hovers close to the lens, with trees blurred behind it",
    "A camera drone in flight, Ekiti",
    "https://www.pexels.com/photo/drone-flying-among-trees-in-a-park-19330455/",
    "Fajuyi Samuel Olayinka", "https://www.pexels.com/@fajuyi-samuel-olayinka-589022314/"),
  pexels("data-analysis", 1600, 2400,
    "Two people at a wooden table study printed pie charts and bar charts",
    "Reading printed charts at a working session",
    "https://www.pexels.com/photo/crop-unrecognizable-black-guys-analyzing-diagrams-9430883/",
    "Monstera Production", "https://www.pexels.com/@gabby-k/", "50% 40%"),
  pexels("iot-blockchain", 1600, 1280,
    "A young man assembles a small electronic circuit board at a workbench, with a 3D printer behind him",
    "Assembling a circuit board at a workbench",
    "https://www.pexels.com/photo/man-assembling-electronic-circuit-board-indoors-39712866/",
    "Mad Knoxx Deluxe", "https://www.pexels.com/@madknoxxdeluxe/", "45% 50%"),
];
