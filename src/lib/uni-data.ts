// Data layer for TrueFluency Pro. facultyData + GES rules follow the spec verbatim.
// Department course lookups read from `uiCourseCatalog` keyed as `${department}_${level}`.

import { uiCourseCatalog, type CatalogEntry, type CatalogStatus } from "./course-catalog";
export { uiCourseCatalog };
export type { CatalogEntry, CatalogStatus };

export type Level = "100" | "200" | "300" | "400" | "500";

export const facultyData: Record<string, string[]> = {
  "Faculty of Agriculture and Forestry": [
    "Agricultural Economics", "Agricultural Extension and Rural Development",
    "Crop and Horticultural Sciences", "Soil Resources Management",
    "Animal Science", "Crop Protection and Environmental Biology",
  ],
  "Faculty of Arts": [
    "Anthropology", "Arabic Language and Literature", "Archaeology",
    "Classical Studies", "Communication and Language Arts",
    "European Studies - French", "European Studies - German",
    "European Studies - Russian", "English", "History", "Islamic Studies",
    "Linguistics", "Linguistics - Igbo", "Linguistics - Yoruba", "Music",
    "Philosophy", "Religious Studies", "Theatre Arts",
  ],
  "College of Medicine": [
    "Biochemistry", "Dentistry", "Environmental Health Science",
    "Human Nutrition and Dietetics", "Medical Laboratory Science",
    "Medicine and Surgery", "Nursing Science", "Physiology", "Physiotherapy",
  ],
  "Faculty of Computing": ["Computer Science"],
  "Faculty of Economics and Management Sciences": [
    "Economics", "Accounting", "Banking and Finance",
    "Marketing and Consumer Studies",
  ],
  "Faculty of Education": [
    "Adult Education", "Business Education", "Early Childhood Education",
    "Educational Management", "Educational Technology",
    "Guidance and Counselling", "Health Education", "Human Kinetics",
    "Library, Archival and Information Studies", "Special Education",
  ],
  "Faculty of Environmental Design and Management": [
    "Architecture", "Estate Management", "Urban and Regional Planning",
    "Quantity Surveying",
  ],
  "Faculty of Law": ["Law"],
  "Faculty of Pharmacy": ["Pharmacy"],
  "Faculty of Renewable Natural Resources": [
    "Aquaculture and Fisheries Management", "Forest Production and Products",
    "Wildlife and Ecotourism Management", "Social and Environmental Forestry",
  ],
  "Faculty of Science": [
    "Anthropology", "Archaeology", "Botany", "Chemistry",
    "Industrial Chemistry", "Geography", "Geology", "Mathematics",
    "Microbiology", "Physics", "Statistics", "Zoology",
  ],
  "Faculty of the Social Sciences": [
    "Political Science", "Psychology", "Sociology",
  ],
  "Faculty of Technology": [
    "Agricultural and Environmental Engineering", "Automotive Engineering",
    "Biomedical Engineering", "Civil Engineering",
    "Electrical and Electronics Engineering", "Food Technology",
    "Industrial and Production Engineering", "Mechanical Engineering",
    "Petroleum Engineering", "Wood Products Engineering",
  ],
  "Faculty of Veterinary Medicine": ["Veterinary Medicine"],
  "Faculty of Multidisciplinary Studies": [],
};

/**
 * GES/GST courses per level — spec 1.2.
 * Rendered on Screen 4 above the department courses, pre-checked and locked.
 */
export const gesCoursesByLevel: Record<Level, CatalogEntry[]> = {
  "100": [
    { code: "C-GST111", name: "Communication in English I", status: "Compulsory" },
    { code: "C-GST112", name: "Nigerian Peoples and Culture", status: "Compulsory" },
    { code: "C-UI-GES107", name: "Reproductive Health, STIs, Drugs and Mankind", status: "Required" },
    { code: "C-UI-GES108", name: "Introduction to French", status: "Required" },
  ],
  "200": [
    { code: "GST212", name: "Philosophy, Logic and Human Existence", status: "Compulsory" },
    { code: "ENT211", name: "Entrepreneurship and Innovation", status: "Compulsory" },
  ],
  "300": [
    { code: "GST312", name: "Peace and Conflict Resolution", status: "Compulsory" },
    { code: "GES301", name: "Introduction to Entrepreneurial Skills", status: "Compulsory" },
  ],
  "400": [],
  "500": [],
};

/** True when the entry (or set of entries) requires the manual-entry flow. */
export function isUnverifiedEntry(e: CatalogEntry) { return e.code === "UNVERIFIED"; }
export function isUnverifiedEntries(entries: CatalogEntry[] | undefined) {
  return !entries || entries.length === 0 || entries.every(isUnverifiedEntry);
}

export function catalogKey(department: string, level: Level) {
  return `${department}_${level}`;
}

export function getDepartmentEntries(department: string, level: Level): CatalogEntry[] | undefined {
  return uiCourseCatalog[catalogKey(department, level)];
}

/** Flat list of every catalog entry, tagged with its department + level. Used by the browse-first search. */
export type FlatCatalogEntry = CatalogEntry & { department: string; level: Level };

let _flat: FlatCatalogEntry[] | null = null;
export function flatCatalog(): FlatCatalogEntry[] {
  if (_flat) return _flat;
  const out: FlatCatalogEntry[] = [];
  for (const [key, entries] of Object.entries(uiCourseCatalog)) {
    const idx = key.lastIndexOf("_");
    const dept = key.slice(0, idx);
    const level = key.slice(idx + 1) as Level;
    for (const e of entries) {
      if (e.code === "UNVERIFIED") continue;
      out.push({ ...e, department: dept, level });
    }
  }
  _flat = out;
  return out;
}
