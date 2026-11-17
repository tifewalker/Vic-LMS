/**
 * Demo accounts for testing: 3 tutors and 100 students, activated and enrolled in the
 * 8 programmes. Classes and content are left to the admins.
 *
 * Usage: pnpm seed:demo   (SEED_TEST_PASSWORD: shared password for every demo account)
 *
 * Rerunnable: it deletes only the exact example.com accounts it generates, then recreates
 * them. Programmes are kept as they are; any of the 8 that is missing is created.
 *
 * Writes the logins to backups/demo-credentials.csv (gitignored). The password is not written.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { passwordProblems } from "../lib/tokens.js";
import { admin } from "../supabase.js";

const password = process.env.SEED_TEST_PASSWORD ?? "";

if (!password) fail("Set SEED_TEST_PASSWORD first.");
const problems = passwordProblems(password);
if (problems.length) fail(`SEED_TEST_PASSWORD: ${problems.join(" ")}`);

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/* ------------------------------------------------------------------ data */

// Titles and descriptions from the landing page training areas (web/src/content/landing.ts).
const PROGRAMMES = [
  {
    title: "Entrepreneurship and Business Development",
    description:
      "Turn ideas into opportunities. Learn how to recognise business opportunities, develop business ideas and understand what it takes to establish and manage a sustainable business.",
  },
  {
    title: "Information Technology and Digital Productivity",
    description:
      "Understand the technology behind today's digital world. Develop foundational IT knowledge and learn how digital tools can improve productivity, communication and business operations.",
  },
  {
    title: "Digital Marketing and Business Analytics",
    description: "Learn how businesses attract customers and make better decisions using digital platforms and data.",
  },
  {
    title: "Artificial Intelligence and Machine Learning",
    description:
      "Explore how intelligent systems are changing the world. Get introduced to artificial intelligence and understand how it can be applied in business, education, agriculture, research and everyday problem-solving.",
  },
  {
    title: "Cybersecurity and Data Protection",
    description:
      "Learn how to protect information, devices and digital systems. As more businesses and individuals depend on digital platforms, understanding cybersecurity is increasingly important.",
  },
  {
    title: "Drone Technology and Aerial Data Applications",
    description:
      "Take technology beyond the computer screen. Discover how unmanned aerial vehicles (UAVs), commonly known as drones, are used in modern industries.",
  },
  {
    title: "Data Processing, Analysis and Visualisation",
    description:
      "Learn how to turn raw information into useful insights: methods of collecting, organising, processing and interpreting data.",
  },
  {
    title: "Emerging Technologies: Internet of Things and Blockchain",
    description: "Explore technologies shaping the next generation of digital products and services.",
  },
];

// Same rule as the API's slugify in routes/programmes.ts.
const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const SLUGS = PROGRAMMES.map((p) => slugify(p.title));
const ENT = 0; // index of Entrepreneurship and Business Development

// Programme indexes per tutor. Every programme has at least one tutor; Entrepreneurship has two.
const TUTORS = [
  { name: "Adebayo Ogunleye", tutorId: "VEC-TUT-0001", programmes: [0, 2, 6] },
  { name: "Folasade Adeyemi", tutorId: "VEC-TUT-0002", programmes: [0, 1, 3, 4] },
  { name: "Oluwaseun Bamidele", tutorId: "VEC-TUT-0003", programmes: [5, 6, 7] },
];

const FIRST = [
  "Temitope", "Ifeoluwa", "Daniel", "Grace", "Oluwadamilare", "Adunni", "Babatunde", "Kehinde", "Taiwo", "Funmilayo",
  "Ayomide", "Olamide", "Samuel", "Esther", "Tolulope", "Abimbola", "David", "Mercy", "Oluwafemi", "Damilola",
  "Joseph", "Blessing", "Opeyemi", "Adeola", "Michael", "Sarah", "Gbenga", "Yewande", "John", "Ruth",
  "Toyin", "Segun", "Deborah", "Bukola", "Peter", "Victoria", "Kayode", "Omolara", "Emmanuel", "Joy",
];
const LAST = [
  "Adewale", "Ogundipe", "Johnson", "Okafor-Smith", "Afolabi", "Oyelaran", "Adeleke", "Balogun", "Olaniyan", "Akinola",
  "Williams", "Fashola", "Oyewole", "Ajayi", "Thompson", "Ogunbiyi", "Adebisi", "Martins", "Olatunji", "Coker",
  "Ilesanmi", "Davies", "Akintola", "Ayodele", "Bello", "Edwards", "Oladipo", "Babalola", "Phillips", "Ogunsanya",
];

/** 100 distinct full names, stable across runs. */
function studentNames(): string[] {
  const names: string[] = [];
  const seen = new Set(TUTORS.map((t) => t.name));
  for (let i = 0; names.length < 100; i++) {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + Math.floor(i / FIRST.length)) % LAST.length]}`;
    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

const emailFor = (name: string) => `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`;
const matricFor = (n: number) => `OAUSTECH/26/${String(n).padStart(4, "0")}`;

/**
 * Students 1 to 30 in Entrepreneurship; 31 to 100 spread 10 each over the other 7.
 * Students 1 to 5 also take a second programme (2 to 6), to test multi-programme.
 */
function programmesFor(n: number): number[] {
  if (n <= 30) return n <= 5 ? [ENT, n] : [ENT];
  return [1 + Math.floor((n - 31) / 10)];
}

/* --------------------------------------------------------------- helpers */

async function check<T>(label: string, p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) fail(`${label}: ${error.message}`);
  return data as NonNullable<T>;
}

async function pool<T, R>(items: T[], size: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

async function allAuthUsers() {
  const users: { id: string; email?: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) fail(`List auth users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

/* ----------------------------------------------------------------- clear */

const students = studentNames().map((name, i) => ({ n: i + 1, name, email: emailFor(name), matric: matricFor(i + 1) }));
const tutors = TUTORS.map((t) => ({ ...t, email: emailFor(t.name) }));
const demoEmails = new Set([...students, ...tutors].map((p) => p.email));

const demoUsers = (await allAuthUsers()).filter((u) => u.email && demoEmails.has(u.email.toLowerCase()));
await pool(demoUsers, 5, async (u) => {
  const { error } = await admin.auth.admin.deleteUser(u.id); // cascades to profile, role row and enrolments
  if (error) fail(`Delete ${u.email}: ${error.message}`);
});
console.log(`Cleared ${demoUsers.length} demo accounts.`);

/* ------------------------------------------------------------ programmes */

const existing = await check("Load programmes", admin.from("programmes").select("id, slug").in("slug", SLUGS));
const missing = PROGRAMMES.map((p, i) => ({ title: p.title, slug: SLUGS[i], description: p.description })).filter(
  (p) => !existing.some((e) => e.slug === p.slug),
);
const created = missing.length ? await check("Create programmes", admin.from("programmes").insert(missing).select("id, slug")) : [];
const programmeRows = [...existing, ...created];
const programmeId = SLUGS.map((s) => programmeRows.find((r) => r.slug === s)!.id);

/* -------------------------------------------------------------- accounts */

/** An active, confirmed account with the shared password and an activated invitation. */
async function createAccount(role: "student" | "tutor", fullName: string, email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) fail(`Create ${email}: ${error?.message}`);
  const id = data.user.id;
  await check(`Profile ${email}`, admin.from("profiles").insert({ id, role, full_name: fullName, email, status: "active" }));
  const now = new Date().toISOString();
  await check(
    `Invitation ${email}`,
    admin.from("invitations").insert({ profile_id: id, status: "activated", used_at: now, last_sent_at: now }),
  );
  return id;
}

const tutorProfile: string[] = [];
for (const t of tutors) {
  const id = await createAccount("tutor", t.name, t.email);
  // Insert with the sequence default first, so the sequence moves past the fixed IDs and a
  // tutor created later through the API never gets VEC-TUT-0001 to 0003.
  await check(`Tutor row ${t.email}`, admin.from("tutors").insert({ profile_id: id }));
  const { error } = await admin.from("tutors").update({ tutor_id: t.tutorId }).eq("profile_id", id);
  if (error) fail(`${t.tutorId} is already taken by another tutor (${error.message}).`);
  tutorProfile.push(id);
}
await check(
  "Assign tutors",
  admin.from("programme_tutors").insert(tutors.flatMap((t, i) => t.programmes.map((p) => ({ programme_id: programmeId[p], tutor_id: tutorProfile[i] })))),
);

const studentProfile = await pool(students, 5, async (s) => {
  const id = await createAccount("student", s.name, s.email);
  await check(`Student row ${s.email}`, admin.from("students").insert({ profile_id: id, matric_no: s.matric }));
  return id;
});
await check(
  "Enrol students",
  admin.from("programme_students").insert(students.flatMap((s, i) => programmesFor(s.n).map((p) => ({ programme_id: programmeId[p], student_id: studentProfile[i] })))),
);

/* ------------------------------------------------------------ credentials */

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const rows = [
  ["name", "role", "login_id", "email", "programmes"],
  ...tutors.map((t) => [t.name, "tutor", t.tutorId, t.email, t.programmes.map((p) => PROGRAMMES[p].title).join("; ")]),
  ...students.map((st) => [st.name, "student", st.matric, st.email, programmesFor(st.n).map((p) => PROGRAMMES[p].title).join("; ")]),
];
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const csvPath = resolve(repoRoot, "backups/demo-credentials.csv");
mkdirSync(dirname(csvPath), { recursive: true });
writeFileSync(csvPath, rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n");

const entCount = students.filter((st) => programmesFor(st.n).includes(ENT)).length;
console.log(
  `Programmes: ${existing.length} kept, ${created.length} created. Created ${tutors.length} tutors and ` +
    `${students.length} students (${entCount} in Entrepreneurship, 5 in two programmes).\nLogins written to ${csvPath}`,
);
