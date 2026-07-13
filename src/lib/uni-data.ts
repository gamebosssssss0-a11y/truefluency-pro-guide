export type Level = "100" | "200" | "300" | "400" | "500";

export const facultyData: Record<string, string[]> = {
  "Faculty of Agriculture and Forestry": [
    "Agricultural Economics", "Agricultural Extension and Rural Development",
    "Crop and Horticultural Sciences", "Soil Resources Management",
    "Animal Science", "Crop Protection and Environmental Biology"
  ],
  "Faculty of Arts": [
    "Anthropology", "Arabic Language and Literature", "Archaeology",
    "Classical Studies", "Communication and Language Arts",
    "European Studies - French", "European Studies - German",
    "European Studies - Russian", "English", "History", "Islamic Studies",
    "Linguistics", "Linguistics - Igbo", "Linguistics - Yoruba", "Music",
    "Philosophy", "Religious Studies", "Theatre Arts"
  ],
  "College of Medicine": [
    "Biochemistry", "Dentistry", "Environmental Health Science",
    "Human Nutrition and Dietetics", "Medical Laboratory Science",
    "Medicine and Surgery", "Nursing Science", "Physiology", "Physiotherapy"
  ],
  "Faculty of Computing": ["Computer Science"],
  "Faculty of Economics and Management Sciences": [
    "Economics", "Accounting", "Banking and Finance",
    "Marketing and Consumer Studies"
  ],
  "Faculty of Education": [
    "Adult Education", "Business Education", "Early Childhood Education",
    "Education and Arabic Studies", "Education and Biology",
    "Education and Chemistry", "Education and Religious Studies",
    "Education and Communication and Language Arts", "Education and Economics",
    "Education and English", "Education and French", "Education and Geography",
    "Education and History", "Education and Islamic Studies",
    "Education and Computer Science", "Educational Technology",
    "Education and Mathematics", "Education and Physics",
    "Education and Political Science", "Education and Yoruba",
    "Educational Management", "Guidance and Counselling", "Health Education",
    "Human Kinetics", "Library, Archival and Information Studies",
    "Special Education"
  ],
  "Faculty of Environmental Design and Management": [
    "Architecture", "Estate Management", "Urban and Regional Planning",
    "Quantity Surveying"
  ],
  "Faculty of Law": ["Law"],
  "Faculty of Pharmacy": ["Pharmacy"],
  "Faculty of Renewable Natural Resources": [
    "Aquaculture and Fisheries Management", "Forest Production and Products",
    "Wildlife and Ecotourism Management", "Social and Environmental Forestry"
  ],
  "Faculty of Science": [
    "Anthropology", "Archaeology", "Botany", "Chemistry", "Geography",
    "Geology", "Industrial Chemistry", "Mathematics", "Microbiology",
    "Physics", "Statistics", "Zoology"
  ],
  "Faculty of the Social Sciences": [
    "Geography", "Political Science", "Psychology", "Sociology"
  ],
  "Faculty of Technology": [
    "Agricultural and Environmental Engineering", "Automotive Engineering",
    "Biomedical Engineering", "Civil Engineering",
    "Electrical and Electronics Engineering", "Food Technology",
    "Industrial and Production Engineering", "Mechanical Engineering",
    "Petroleum Engineering", "Wood Products Engineering"
  ],
  "Faculty of Veterinary Medicine": ["Veterinary Medicine"],
  "Faculty of Multidisciplinary Studies": [],
};

export type Course = {
  code: string;
  title: string;
  kind: "compulsory" | "required" | "department";
};

export const gesCoursesByLevel: Record<Level, Course[]> = {
  "100": [
    { code: "GES 101", title: "Use of English I", kind: "compulsory" },
    { code: "GES 107", title: "Reproductive Health, STIs & HIV", kind: "required" },
    { code: "GES 108", title: "Introduction to French", kind: "required" },
  ],
  "200": [
    { code: "GES 201", title: "Use of English II", kind: "compulsory" },
    { code: "GES 102", title: "Nigerian Peoples and Culture", kind: "required" },
    { code: "GES 104", title: "History and Philosophy of Science", kind: "required" },
    { code: "GES 106", title: "Social Sciences and Citizenship", kind: "required" },
  ],
  "300": [
    { code: "GES 301", title: "Introduction to Entrepreneurial Skills", kind: "compulsory" },
    { code: "GES 103", title: "Communication in English", kind: "required" },
    { code: "GES 106", title: "Social Sciences and Citizenship", kind: "required" },
  ],
  "400": [],
  "500": [],
};

// Mock department courses — structured so real data can swap in later.
// Fallback used when a department/level isn't in the map.
const genericDept = (dept: string, level: Level): Course[] => {
  const prefix = dept.split(" ")[0].slice(0, 3).toUpperCase() || "DPT";
  const n = level[0];
  return [
    { code: `${prefix} ${n}01`, title: `Foundations of ${dept}`, kind: "department" },
    { code: `${prefix} ${n}02`, title: `Core Methods in ${dept}`, kind: "department" },
    { code: `${prefix} ${n}03`, title: `Applied ${dept} Studies`, kind: "department" },
    { code: `${prefix} ${n}04`, title: `${dept} Seminar`, kind: "department" },
  ];
};

const departmentCourses: Record<string, Partial<Record<Level, Course[]>>> = {
  "Computer Science": {
    "100": [
      { code: "CSC 101", title: "Introduction to Computer Science", kind: "department" },
      { code: "CSC 102", title: "Introduction to Problem Solving", kind: "department" },
      { code: "MAT 111", title: "Elementary Mathematics I", kind: "department" },
    ],
    "200": [
      { code: "CSC 201", title: "Computer Programming I", kind: "department" },
      { code: "CSC 203", title: "Discrete Structures", kind: "department" },
      { code: "CSC 205", title: "Digital Logic Design", kind: "department" },
      { code: "CSC 207", title: "Data Structures", kind: "department" },
    ],
    "300": [
      { code: "CSC 301", title: "Algorithms and Complexity", kind: "department" },
      { code: "CSC 305", title: "Operating Systems", kind: "department" },
      { code: "CSC 311", title: "Database Systems", kind: "department" },
      { code: "CSC 321", title: "Software Engineering", kind: "department" },
    ],
    "400": [
      { code: "CSC 401", title: "Artificial Intelligence", kind: "department" },
      { code: "CSC 411", title: "Computer Networks", kind: "department" },
      { code: "CSC 421", title: "Compiler Construction", kind: "department" },
      { code: "CSC 499", title: "Final Year Project", kind: "department" },
    ],
  },
  "Law": {
    "100": [
      { code: "LAW 101", title: "Nigerian Legal System I", kind: "department" },
      { code: "LAW 102", title: "Constitutional Law I", kind: "department" },
    ],
    "200": [
      { code: "LAW 201", title: "Law of Contract", kind: "department" },
      { code: "LAW 203", title: "Criminal Law", kind: "department" },
      { code: "LAW 205", title: "Law of Torts", kind: "department" },
    ],
  },
};

export function getDepartmentCourses(department: string, level: Level): Course[] {
  return departmentCourses[department]?.[level] ?? genericDept(department, level);
}
