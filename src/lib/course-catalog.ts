// AUTO-GENERATED FROM SPEC — DO NOT HAND-EDIT except to sync with spec.
// Keyed as `${department}_${level}`. status is "Compulsory" | "Required" | "Elective".
// code === "UNVERIFIED" means an entry that must trigger the manual-entry flow.

export type CatalogStatus = "Compulsory" | "Required" | "Elective";
export type CatalogEntry = { code: string; name: string; status: CatalogStatus };

export const uiCourseCatalog: Record<string, CatalogEntry[]> = {
  "Statistics_100": [
    {
      "code": "C-STA122",
      "name": "Statistical Computing I",
      "status": "Compulsory"
    },
    {
      "code": "C-STA121",
      "name": "Statistical Inference I",
      "status": "Compulsory"
    },
    {
      "code": "C-GST111",
      "name": "Communication in English I",
      "status": "Compulsory"
    },
    {
      "code": "C-GST112",
      "name": "Nigerian Peoples and Culture",
      "status": "Compulsory"
    },
    {
      "code": "C-MTH101",
      "name": "Elementary Mathematics I",
      "status": "Compulsory"
    },
    {
      "code": "C-MTH102",
      "name": "Elementary Mathematics II",
      "status": "Compulsory"
    },
    {
      "code": "C-COS101",
      "name": "Introduction to Computing Science",
      "status": "Compulsory"
    },
    {
      "code": "C-UI-GES107",
      "name": "Reproductive Health, STIs, Drugs and Mankind",
      "status": "Required"
    },
    {
      "code": "C-UI-GES108",
      "name": "Introduction to French",
      "status": "Required"
    },
    {
      "code": "C-PHY101",
      "name": "Elementary Physics I (Mechanics and Properties of Matter)",
      "status": "Elective"
    },
    {
      "code": "C-PHY102",
      "name": "General Physics II",
      "status": "Elective"
    },
    {
      "code": "C-PHY103",
      "name": "General Physics III",
      "status": "Elective"
    },
    {
      "code": "ECO101",
      "name": "Introduction to Economics I",
      "status": "Elective"
    },
    {
      "code": "C-MAT103",
      "name": "Elementary Mathematics III (Vectors, Geometry and Dynamics)",
      "status": "Elective"
    },
    {
      "code": "C-MAT142",
      "name": "Introduction to Actuarial Mathematics",
      "status": "Elective"
    }
  ],
  "Statistics_200": [
    {
      "code": "STA202",
      "name": "Statistics for Physical Sciences and Engineering",
      "status": "Required"
    },
    {
      "code": "STA203",
      "name": "Statistics for the Social Sciences",
      "status": "Required"
    },
    {
      "code": "STA211",
      "name": "Probability II",
      "status": "Compulsory"
    },
    {
      "code": "STA212",
      "name": "Social and Economic Statistics",
      "status": "Compulsory"
    },
    {
      "code": "STA221",
      "name": "Statistical Inference II",
      "status": "Compulsory"
    },
    {
      "code": "STA231",
      "name": "Statistical Computing II",
      "status": "Compulsory"
    }
  ],
  "Statistics_300": [
    {
      "code": "STA311",
      "name": "Probability and Stochastic Processes I",
      "status": "Compulsory"
    },
    {
      "code": "STA312",
      "name": "Distribution Theory I",
      "status": "Compulsory"
    },
    {
      "code": "STA316",
      "name": "Introduction to Environmental Statistics",
      "status": "Elective"
    },
    {
      "code": "STA321",
      "name": "Statistical Inference III",
      "status": "Compulsory"
    },
    {
      "code": "STA322",
      "name": "Regression and Analysis of Variance I",
      "status": "Compulsory"
    },
    {
      "code": "STA323",
      "name": "Design and Analysis of Experiments I",
      "status": "Compulsory"
    },
    {
      "code": "STA324",
      "name": "Survey Methods and Sampling Theory",
      "status": "Compulsory"
    },
    {
      "code": "STA331",
      "name": "Introduction to Basic Programming",
      "status": "Required"
    },
    {
      "code": "STA341",
      "name": "Statistical Quality Control",
      "status": "Compulsory"
    },
    {
      "code": "STA315",
      "name": "Time Series Analysis I",
      "status": "Compulsory"
    },
    {
      "code": "STA326",
      "name": "Introduction to Stochastic Processes I",
      "status": "Compulsory"
    },
    {
      "code": "STA342",
      "name": "Demography I",
      "status": "Compulsory"
    },
    {
      "code": "STA343",
      "name": "Operation Research I",
      "status": "Compulsory"
    },
    {
      "code": "STA351",
      "name": "Biometric Methods I",
      "status": "Required"
    },
    {
      "code": "STI399",
      "name": "Industrial Attachment (Internship in Statistics for 3 Months)",
      "status": "Compulsory"
    }
  ],
  "Statistics_400": [
    {
      "code": "STA411",
      "name": "Probability and Stochastic Processes II",
      "status": "Compulsory"
    },
    {
      "code": "STA412",
      "name": "Distribution Theory II",
      "status": "Compulsory"
    },
    {
      "code": "STA413",
      "name": "Linear Models",
      "status": "Compulsory"
    },
    {
      "code": "STA414",
      "name": "Stochastic Processes II",
      "status": "Compulsory"
    },
    {
      "code": "STA415",
      "name": "Regression and Analysis of Variance II",
      "status": "Compulsory"
    },
    {
      "code": "STA421",
      "name": "Time Series Analysis II",
      "status": "Compulsory"
    },
    {
      "code": "STA422",
      "name": "Logical Background of Statistics and Analysis of Theory",
      "status": "Compulsory"
    },
    {
      "code": "STA423",
      "name": "Design and Analysis of Experiments II",
      "status": "Compulsory"
    },
    {
      "code": "STA424",
      "name": "Sampling Techniques",
      "status": "Compulsory"
    },
    {
      "code": "STA431",
      "name": "Project",
      "status": "Compulsory"
    },
    {
      "code": "STA441",
      "name": "Multivariate Statistical Methods",
      "status": "Compulsory"
    },
    {
      "code": "STA442",
      "name": "Non-Parametric Methods",
      "status": "Compulsory"
    },
    {
      "code": "STA443",
      "name": "Operation Research II",
      "status": "Compulsory"
    },
    {
      "code": "STA444",
      "name": "Econometric Methods",
      "status": "Compulsory"
    },
    {
      "code": "STA451",
      "name": "Biometric Methods II",
      "status": "Elective"
    },
    {
      "code": "STA452",
      "name": "Psychometric Methods",
      "status": "Elective"
    },
    {
      "code": "STA453",
      "name": "Bayesian Inference and Decision Theory",
      "status": "Elective"
    },
    {
      "code": "STA454",
      "name": "Introduction to Environmental Statistics II",
      "status": "Elective"
    },
    {
      "code": "STA455",
      "name": "Educational Statistics",
      "status": "Elective"
    },
    {
      "code": "STA456",
      "name": "Health Statistics",
      "status": "Elective"
    },
    {
      "code": "STA457",
      "name": "Medical Statistics",
      "status": "Elective"
    },
    {
      "code": "STA458",
      "name": "Energy Statistics",
      "status": "Elective"
    },
    {
      "code": "STA459",
      "name": "Demography II",
      "status": "Elective"
    },
    {
      "code": "STA461",
      "name": "Actuarial Statistics",
      "status": "Elective"
    }
  ],
  "Physics_100": [
    {
      "code": "PHY102",
      "name": "Introductory Mechanics and Properties of Matter",
      "status": "Compulsory"
    },
    {
      "code": "PHY103",
      "name": "Introductory Heat and Thermodynamics",
      "status": "Compulsory"
    },
    {
      "code": "PHY104",
      "name": "Introductory Electricity and Magnetism",
      "status": "Compulsory"
    },
    {
      "code": "PHY105",
      "name": "Introductory Waves, Optics and Modern Physics",
      "status": "Compulsory"
    },
    {
      "code": "PHY118",
      "name": "Experimental Physics I",
      "status": "Compulsory"
    },
    {
      "code": "PHY101",
      "name": "Elementary Physics for Agricultural and Veterinary Fields",
      "status": "Required"
    },
    {
      "code": "PHY112",
      "name": "Basic Principles of Physics II (Non-Majors)",
      "status": "Required"
    },
    {
      "code": "PHY113",
      "name": "Basic Principles of Physics III (Non-Majors)",
      "status": "Required"
    },
    {
      "code": "PHY114",
      "name": "Basic Principles of Physics I (Non-Majors)",
      "status": "Required"
    },
    {
      "code": "PHY115",
      "name": "Basic Principles IV (Non-Majors)",
      "status": "Required"
    }
  ],
  "Physics_200": [
    {
      "code": "PHY201",
      "name": "Classical Physics I",
      "status": "Required"
    },
    {
      "code": "PHY203",
      "name": "Elements of Modern Physics",
      "status": "Required"
    },
    {
      "code": "PHY204",
      "name": "Classical Physics II - Electromagnetism",
      "status": "Required"
    },
    {
      "code": "PHY290",
      "name": "Industrial Training I",
      "status": "Compulsory"
    },
    {
      "code": "PHY298",
      "name": "Experimental Physics II",
      "status": "Compulsory"
    },
    {
      "code": "PHY299",
      "name": "Experimental Physics III",
      "status": "Compulsory"
    },
    {
      "code": "PHY251",
      "name": "Electrophysics for Physiotherapy Students",
      "status": "Required"
    },
    {
      "code": "PHY271",
      "name": "Physics for Biology I",
      "status": "Elective"
    },
    {
      "code": "PHY272",
      "name": "Physics for Biology II",
      "status": "Elective"
    }
  ],
  "Physics_300": [
    {
      "code": "PHY303",
      "name": "Classical Physics III",
      "status": "Compulsory"
    },
    {
      "code": "PHY304",
      "name": "Principles of Quantum Physics I",
      "status": "Compulsory"
    },
    {
      "code": "PHY305",
      "name": "Numerical Computation in Physics",
      "status": "Compulsory"
    },
    {
      "code": "PHY306",
      "name": "Introduction to Electronics",
      "status": "Compulsory"
    },
    {
      "code": "PHY307",
      "name": "Solid State Physics I",
      "status": "Compulsory"
    },
    {
      "code": "PHY308",
      "name": "Electromagnetism",
      "status": "Compulsory"
    },
    {
      "code": "PHY309",
      "name": "Acoustics",
      "status": "Elective"
    },
    {
      "code": "PHY310",
      "name": "Introduction to Nuclear Physics",
      "status": "Required"
    },
    {
      "code": "PHY311",
      "name": "Mathematical Methods for Physics I",
      "status": "Compulsory"
    },
    {
      "code": "PHY312",
      "name": "Mathematical Methods for Physics II",
      "status": "Compulsory"
    },
    {
      "code": "PHY313",
      "name": "Introduction to Special Relativity",
      "status": "Elective"
    },
    {
      "code": "PHY314",
      "name": "Semiconductor Devices",
      "status": "Elective"
    },
    {
      "code": "PHY372",
      "name": "Physics for Biology III",
      "status": "Elective"
    },
    {
      "code": "PHY390",
      "name": "Industrial Training II",
      "status": "Compulsory"
    },
    {
      "code": "PHY398",
      "name": "Experimental Physics IV",
      "status": "Compulsory"
    },
    {
      "code": "PHY399",
      "name": "Experimental Physics V",
      "status": "Compulsory"
    }
  ],
  "Physics_400": [
    {
      "code": "PHY403",
      "name": "Statistical and Thermal Physics Kinetic Theory",
      "status": "Compulsory"
    },
    {
      "code": "PHY405",
      "name": "Principles of Quantum Physics II",
      "status": "Compulsory"
    },
    {
      "code": "PHY406",
      "name": "Classical Mechanics IV",
      "status": "Compulsory"
    },
    {
      "code": "PHY407",
      "name": "Solid State Physics II",
      "status": "Compulsory"
    },
    {
      "code": "PHY408",
      "name": "Electromagnetic Theory",
      "status": "Compulsory"
    },
    {
      "code": "PHY409",
      "name": "Modern Optics",
      "status": "Elective"
    },
    {
      "code": "PHY410",
      "name": "Nuclear Physics",
      "status": "Compulsory"
    },
    {
      "code": "PHY411",
      "name": "Introduction to Astrophysics",
      "status": "Elective"
    },
    {
      "code": "PHY498",
      "name": "Experimental Physics VI",
      "status": "Compulsory"
    },
    {
      "code": "PHY499",
      "name": "Undergraduate Project",
      "status": "Compulsory"
    }
  ],
  "Chemistry_100": [
    {
      "code": "CHE126",
      "name": "Inorganic Chemistry I",
      "status": "Compulsory"
    },
    {
      "code": "CHE156",
      "name": "Physical Chemistry I",
      "status": "Compulsory"
    },
    {
      "code": "CHE176",
      "name": "Organic Chemistry I",
      "status": "Compulsory"
    },
    {
      "code": "CHE191",
      "name": "Practical Chemistry for 100 Level",
      "status": "Compulsory"
    },
    {
      "code": "CHE195",
      "name": "Practical Chemistry (Non-Majors)",
      "status": "Elective"
    },
    {
      "code": "CHE127",
      "name": "Inorganic Chemistry (Non-Majors)",
      "status": "Elective"
    },
    {
      "code": "CHE157",
      "name": "Physical Chemistry (Non-Majors)",
      "status": "Elective"
    },
    {
      "code": "CHE177",
      "name": "Organic Chemistry I (Non-Majors)",
      "status": "Elective"
    }
  ],
  "Chemistry_200": [
    {
      "code": "CHE218",
      "name": "Introductory Analytical Chemistry",
      "status": "Compulsory"
    },
    {
      "code": "CHE227",
      "name": "Inorganic Chemistry II",
      "status": "Compulsory"
    },
    {
      "code": "CHE229",
      "name": "Basic Inorganic Chemistry for Non-majors",
      "status": "Required"
    },
    {
      "code": "CHE251",
      "name": "Electrochemistry I",
      "status": "Compulsory"
    },
    {
      "code": "CHE256",
      "name": "Physical Chemistry II",
      "status": "Compulsory"
    },
    {
      "code": "CHE259",
      "name": "Physical Chemistry for Life Sciences",
      "status": "Required"
    },
    {
      "code": "CHE279",
      "name": "Basic Aromatic and Natural Products Chemistry for Nonmajors",
      "status": "Elective"
    },
    {
      "code": "CHE281",
      "name": "Research Methods and Presentation Techniques",
      "status": "Compulsory"
    }
  ],
  "Chemistry_300": [
    {
      "code": "CHE318",
      "name": "Instrumental Methods of Analysis",
      "status": "Compulsory"
    },
    {
      "code": "CHE327",
      "name": "Inorganic Chemistry III",
      "status": "Compulsory"
    },
    {
      "code": "CHE329",
      "name": "Inorganic Chemistry for Life Sciences",
      "status": "Elective"
    },
    {
      "code": "CHE351",
      "name": "Electrochemistry II",
      "status": "Compulsory"
    },
    {
      "code": "CHE356",
      "name": "Physical Chemistry III",
      "status": "Compulsory"
    },
    {
      "code": "CHE357",
      "name": "Introductory Quantum Chemistry, Statistical Thermodynamics/Electrochemistry",
      "status": "Compulsory"
    },
    {
      "code": "CHE376",
      "name": "Organic Chemistry III",
      "status": "Compulsory"
    },
    {
      "code": "CHE377",
      "name": "Heterocyclics, Carbocyclics and Reaction Mechanism",
      "status": "Compulsory"
    },
    {
      "code": "ICH397",
      "name": "Industrial Attachment (Industrial Chemistry)",
      "status": "Compulsory"
    }
  ],
  "Chemistry_400": [
    {
      "code": "CHE416",
      "name": "Chemical Environmental Assessment and Management",
      "status": "Required"
    },
    {
      "code": "CHE417",
      "name": "Advanced Analytical Chemistry and Application",
      "status": "Compulsory"
    },
    {
      "code": "CHE427",
      "name": "Inorganic Chemistry IV",
      "status": "Compulsory"
    },
    {
      "code": "CHE451",
      "name": "Advanced Chemical Kinetics",
      "status": "Compulsory"
    },
    {
      "code": "CHE452",
      "name": "Molecular Spectroscopy",
      "status": "Compulsory"
    },
    {
      "code": "CHE457",
      "name": "Quantum Mechanical Treatment of Chemical Bonding and Kinetics",
      "status": "Compulsory"
    },
    {
      "code": "CHE458",
      "name": "Symmetry and Group Theory",
      "status": "Compulsory"
    },
    {
      "code": "CHE476",
      "name": "Photochemistry and Biologically Active Natural Products",
      "status": "Compulsory"
    },
    {
      "code": "CHE481",
      "name": "Chemistry Seminars",
      "status": "Compulsory"
    },
    {
      "code": "CHE495",
      "name": "Final Year Project",
      "status": "Compulsory"
    },
    {
      "code": "CHE496",
      "name": "Research Project",
      "status": "Compulsory"
    },
    {
      "code": "ICH467",
      "name": "Process Chemistry (Industrial Chemistry)",
      "status": "Compulsory"
    }
  ],
  "Mathematics_100": [
    {
      "code": "MAT111",
      "name": "Algebra",
      "status": "Required"
    },
    {
      "code": "MAT121",
      "name": "Calculus and Trigonometry",
      "status": "Required"
    },
    {
      "code": "MAT141",
      "name": "Analytical Geometry and Mechanics",
      "status": "Required"
    },
    {
      "code": "MAT142",
      "name": "Introduction to Actuarial Mathematics",
      "status": "Elective"
    },
    {
      "code": "MAT101",
      "name": "Supplementary Mathematics (Non-Majors)",
      "status": "Elective"
    },
    {
      "code": "GST111",
      "name": "Communication in English I",
      "status": "Compulsory"
    },
    {
      "code": "GST112",
      "name": "Nigerian Peoples and Culture",
      "status": "Compulsory"
    },
    {
      "code": "MTH101",
      "name": "Elementary Mathematics I",
      "status": "Compulsory"
    },
    {
      "code": "MTH102",
      "name": "Elementary Mathematics II",
      "status": "Compulsory"
    },
    {
      "code": "CSC101",
      "name": "Introduction to Computer Sciences",
      "status": "Compulsory"
    },
    {
      "code": "MTH103",
      "name": "Elementary Mathematics III",
      "status": "Compulsory"
    }
  ],
  "Mathematics_200": [
    {
      "code": "MTH201",
      "name": "Mathematical Methods I",
      "status": "Compulsory"
    },
    {
      "code": "MTH202",
      "name": "Elementary Differential Equations",
      "status": "Compulsory"
    },
    {
      "code": "MTH203",
      "name": "Sets Logic and Algebra I",
      "status": "Compulsory"
    },
    {
      "code": "MTH204",
      "name": "Linear Algebra I",
      "status": "Compulsory"
    },
    {
      "code": "GST212",
      "name": "Philosophy, Logic and Human Existence",
      "status": "Compulsory"
    },
    {
      "code": "ENT211",
      "name": "Entrepreneurship and Innovation",
      "status": "Compulsory"
    },
    {
      "code": "COS201",
      "name": "Computer Programming",
      "status": "Compulsory"
    }
  ],
  "Mathematics_300": [
    {
      "code": "MTH301",
      "name": "Metric Space Topology",
      "status": "Compulsory"
    },
    {
      "code": "MTH302",
      "name": "Real Analysis I",
      "status": "Compulsory"
    },
    {
      "code": "MTH303",
      "name": "Abstract Algebra I",
      "status": "Compulsory"
    },
    {
      "code": "MTH311",
      "name": "Complex Analysis I",
      "status": "Compulsory"
    },
    {
      "code": "MTH312",
      "name": "Ordinary Differential Equations",
      "status": "Compulsory"
    },
    {
      "code": "MTH341",
      "name": "Mathematical Methods II",
      "status": "Compulsory"
    }
  ],
  "Mathematics_400": [
    {
      "code": "MTH401",
      "name": "Theory of Ordinary Differential Equations",
      "status": "Compulsory"
    },
    {
      "code": "MTH402",
      "name": "Functional Analysis",
      "status": "Compulsory"
    },
    {
      "code": "MTH403",
      "name": "Abstract Algebra II",
      "status": "Compulsory"
    },
    {
      "code": "MTH404",
      "name": "Real Analysis II",
      "status": "Compulsory"
    },
    {
      "code": "MTH412",
      "name": "Partial Differential Equations",
      "status": "Compulsory"
    },
    {
      "code": "MTH499",
      "name": "Undergraduate Project / Research Essay",
      "status": "Compulsory"
    }
  ],
  "Botany_100": [
    {
      "code": "C-BOT102",
      "name": "Introductory Botany",
      "status": "Compulsory"
    },
    {
      "code": "C-UI-BOT111",
      "name": "Cryptogamic Botany",
      "status": "Required"
    },
    {
      "code": "C-UI-BOT141",
      "name": "Basic Principles in Botany",
      "status": "Required"
    },
    {
      "code": "C-MTH101",
      "name": "Elementary Mathematics I",
      "status": "Compulsory"
    },
    {
      "code": "C-MTH102",
      "name": "Elementary Mathematics II",
      "status": "Compulsory"
    },
    {
      "code": "C-COS101",
      "name": "Introduction to Computing Sciences",
      "status": "Compulsory"
    },
    {
      "code": "C-BIO101",
      "name": "General Biology I",
      "status": "Compulsory"
    },
    {
      "code": "C-BIO107",
      "name": "General Biology Practical I",
      "status": "Compulsory"
    },
    {
      "code": "C-CHM101",
      "name": "General Chemistry I",
      "status": "Compulsory"
    },
    {
      "code": "C-CHM107",
      "name": "General Chemistry Practical I",
      "status": "Compulsory"
    },
    {
      "code": "C-PHY101",
      "name": "General Physics I",
      "status": "Compulsory"
    },
    {
      "code": "C-GST111",
      "name": "Communication in English",
      "status": "Compulsory"
    },
    {
      "code": "C-GST112",
      "name": "Nigerian Peoples and Culture",
      "status": "Compulsory"
    },
    {
      "code": "C-BIO102",
      "name": "General Biology II",
      "status": "Compulsory"
    },
    {
      "code": "C-BIO108",
      "name": "General Biology Practical II",
      "status": "Compulsory"
    },
    {
      "code": "C-CHM102",
      "name": "General Chemistry II",
      "status": "Compulsory"
    },
    {
      "code": "C-PHY102",
      "name": "General Physics II",
      "status": "Compulsory"
    }
  ],
  "Botany_200": [
    {
      "code": "C-BIO201",
      "name": "Genetics I",
      "status": "Compulsory"
    },
    {
      "code": "C-BIO203",
      "name": "General Physiology",
      "status": "Compulsory"
    },
    {
      "code": "C-BOT202",
      "name": "Seedless Plants",
      "status": "Compulsory"
    },
    {
      "code": "C-UI-BIO215",
      "name": "Genetics II",
      "status": "Required"
    },
    {
      "code": "C-UI-BOT271",
      "name": "Introduction to Ethnobotany",
      "status": "Required"
    },
    {
      "code": "C-UI-BOT212",
      "name": "Introduction to Plant Ecology",
      "status": "Required"
    },
    {
      "code": "C-GST212",
      "name": "Philosophy, Logic and Human Existence",
      "status": "Compulsory"
    },
    {
      "code": "C-ENT211",
      "name": "Entrepreneurship and Innovation",
      "status": "Compulsory"
    },
    {
      "code": "C-BIO204",
      "name": "Biological Techniques",
      "status": "Compulsory"
    },
    {
      "code": "C-BIO205",
      "name": "Introductory Developmental/Cell Biology",
      "status": "Compulsory"
    },
    {
      "code": "C-BOT203",
      "name": "Seed Plants",
      "status": "Compulsory"
    },
    {
      "code": "C-UI-BOT245",
      "name": "Plant Biotechnology",
      "status": "Required"
    },
    {
      "code": "C-UI-BOT211",
      "name": "Mechanical Tissues of Plant",
      "status": "Required"
    },
    {
      "code": "C-UI-BOT241",
      "name": "Research Methods",
      "status": "Required"
    },
    {
      "code": "C-UI-BOT246",
      "name": "Botanical Products",
      "status": "Required"
    },
    {
      "code": "C-UI-CHM211",
      "name": "Organic Chemistry I",
      "status": "Elective"
    }
  ],
  "Botany_300": [
    {
      "code": "BOT321",
      "name": "Mycology",
      "status": "Compulsory"
    },
    {
      "code": "BOT341",
      "name": "Taxonomy of Angiosperm",
      "status": "Compulsory"
    },
    {
      "code": "BOT311",
      "name": "Bryophytes, Pteridophytes and Angiosperm",
      "status": "Compulsory"
    },
    {
      "code": "BOT399",
      "name": "Industrial Field Experience",
      "status": "Compulsory"
    },
    {
      "code": "GES301",
      "name": "Introduction to Entrepreneurial Skills",
      "status": "Compulsory"
    },
    {
      "code": "BOT343",
      "name": "Introduction to Palaeobotany",
      "status": "Required"
    },
    {
      "code": "BIO311",
      "name": "Genetic Variability and Evolution",
      "status": "Required"
    },
    {
      "code": "BIO313",
      "name": "General Ecology",
      "status": "Required"
    },
    {
      "code": "ARC222",
      "name": "Introduction to Environmental Archaeology",
      "status": "Elective"
    }
  ],
  "Botany_400": [
    {
      "code": "BOT441",
      "name": "Advanced Taxonomy of Angiosperms",
      "status": "Compulsory"
    },
    {
      "code": "BOT433",
      "name": "Field Course II",
      "status": "Compulsory"
    },
    {
      "code": "BOT491",
      "name": "Research Project and Seminar",
      "status": "Compulsory"
    },
    {
      "code": "BOT421",
      "name": "Advanced Mycology",
      "status": "Compulsory"
    },
    {
      "code": "BOT462",
      "name": "Plant Physiology",
      "status": "Compulsory"
    },
    {
      "code": "BOT416",
      "name": "Phycology and Bryology",
      "status": "Required"
    },
    {
      "code": "BOT461",
      "name": "Plant Cell Biochemistry",
      "status": "Required"
    },
    {
      "code": "BOT431",
      "name": "Ecology of Weed",
      "status": "Required"
    },
    {
      "code": "BOT451",
      "name": "Host-Pathogen Relations and Disease Management",
      "status": "Required"
    },
    {
      "code": "BOT463",
      "name": "Introduction to Mushroom Growing Technology",
      "status": "Elective"
    },
    {
      "code": "BOT471",
      "name": "Economic Botany",
      "status": "Elective"
    },
    {
      "code": "MIC423",
      "name": "Industrial Microbiology",
      "status": "Elective"
    }
  ],
  "Zoology_100": [
    {
      "code": "ZOO112",
      "name": "The Mammalian Body",
      "status": "Compulsory"
    },
    {
      "code": "ZOO114",
      "name": "Principles of Cell Biology and Genetics",
      "status": "Compulsory"
    },
    {
      "code": "ZOO115",
      "name": "Introductory Ecology",
      "status": "Compulsory"
    },
    {
      "code": "ZOO116",
      "name": "Introductory Invertebrate Zoology",
      "status": "Compulsory"
    },
    {
      "code": "ZOO117",
      "name": "Introductory Vertebrate Zoology",
      "status": "Compulsory"
    },
    {
      "code": "ZOO118",
      "name": "Practical Zoology",
      "status": "Compulsory"
    },
    {
      "code": "GES101",
      "name": "Use of English I",
      "status": "Compulsory"
    },
    {
      "code": "GES107",
      "name": "Reproductive Health, STIs and HIV",
      "status": "Compulsory"
    },
    {
      "code": "CHE127",
      "name": "Inorganic Chemistry I (Non-Majors)",
      "status": "Required"
    },
    {
      "code": "CHE157",
      "name": "Physical Chemistry I (Non-Majors)",
      "status": "Required"
    },
    {
      "code": "CHE177",
      "name": "Organic Chemistry I (Non-Majors)",
      "status": "Required"
    },
    {
      "code": "CHE195",
      "name": "Practical Chemistry for 100 Level",
      "status": "Required"
    },
    {
      "code": "PHY102",
      "name": "Introductory Mechanics and Properties of Matter",
      "status": "Required"
    },
    {
      "code": "PHY103",
      "name": "Introductory Heat and Thermodynamics",
      "status": "Required"
    },
    {
      "code": "BOT111",
      "name": "Cryptogamic Botany",
      "status": "Required"
    },
    {
      "code": "BOT141",
      "name": "Basic Principles in Botany",
      "status": "Required"
    },
    {
      "code": "STA114",
      "name": "General Statistics I",
      "status": "Required"
    },
    {
      "code": "STA121",
      "name": "Statistical Inference I",
      "status": "Required"
    },
    {
      "code": "ARC123",
      "name": "Introduction to Humans and Environment",
      "status": "Elective"
    },
    {
      "code": "GEY101",
      "name": "Introduction to Geology",
      "status": "Elective"
    },
    {
      "code": "STA131",
      "name": "Statistical Computing I",
      "status": "Elective"
    },
    {
      "code": "STA115",
      "name": "Introduction to Probability",
      "status": "Elective"
    },
    {
      "code": "MIC121",
      "name": "Introductory Microbiology I",
      "status": "Elective"
    },
    {
      "code": "CSC101",
      "name": "Introduction to Computer Science",
      "status": "Elective"
    }
  ],
  "Zoology_200": [
    {
      "code": "BIO211",
      "name": "Introductory Genetic and Cell Physiology",
      "status": "Compulsory"
    },
    {
      "code": "BIO212",
      "name": "Introductory Ecology",
      "status": "Compulsory"
    },
    {
      "code": "BIO214",
      "name": "Biological Techniques",
      "status": "Compulsory"
    },
    {
      "code": "ZOO211",
      "name": "Invertebrate Zoology",
      "status": "Compulsory"
    },
    {
      "code": "ZOO212",
      "name": "Chordate Zoology",
      "status": "Compulsory"
    },
    {
      "code": "GES103",
      "name": "Government, the Society and the Economy",
      "status": "Compulsory"
    },
    {
      "code": "GES201",
      "name": "Use of English II",
      "status": "Compulsory"
    },
    {
      "code": "CHE229",
      "name": "Basic Organic Chemistry (for Non-Majors)",
      "status": "Required"
    },
    {
      "code": "CHE259",
      "name": "Physical Chemistry for the Life Science and Osmosis",
      "status": "Required"
    },
    {
      "code": "BOT211",
      "name": "General Botany I",
      "status": "Elective"
    },
    {
      "code": "MIC221",
      "name": "Introduction Microbiology",
      "status": "Elective"
    },
    {
      "code": "ARC222",
      "name": "Introduction to Environmental Archaeology",
      "status": "Elective"
    },
    {
      "code": "ANT216",
      "name": "Hominid Evolution and Early Cultural Development",
      "status": "Elective"
    },
    {
      "code": "STA201",
      "name": "Statistics for Agriculture and Biological Sciences",
      "status": "Elective"
    }
  ],
  "Zoology_300": [
    {
      "code": "BIO311",
      "name": "Genetic Variability and Evolution",
      "status": "Required"
    },
    {
      "code": "GES301",
      "name": "Introduction to Entrepreneurial Skill",
      "status": "Compulsory"
    },
    {
      "code": "ZOO312",
      "name": "The Biology of Tropical Parasites",
      "status": "Required"
    },
    {
      "code": "ZOO313",
      "name": "Arthropod Diversity",
      "status": "Required"
    },
    {
      "code": "ZOO314",
      "name": "Vertebrate Zoology",
      "status": "Required"
    },
    {
      "code": "MIC307",
      "name": "Immunology",
      "status": "Elective"
    },
    {
      "code": "CHE329",
      "name": "Inorganic Chemistry for Life Sciences",
      "status": "Elective"
    },
    {
      "code": "GEY358",
      "name": "Marine Geology",
      "status": "Elective"
    },
    {
      "code": "MIC322",
      "name": "Bacteriology",
      "status": "Elective"
    }
  ],
  "Zoology_400": [
    {
      "code": "BIO417",
      "name": "Field Course II",
      "status": "Compulsory"
    },
    {
      "code": "ZOO418",
      "name": "Essay",
      "status": "Compulsory"
    },
    {
      "code": "ZOO419",
      "name": "Project",
      "status": "Compulsory"
    },
    {
      "code": "BIO411",
      "name": "Genetics in Molecular Biology",
      "status": "Compulsory"
    },
    {
      "code": "ZOO411",
      "name": "Entomology",
      "status": "Required"
    },
    {
      "code": "ZOO412",
      "name": "Principles of Parasitology",
      "status": "Required"
    },
    {
      "code": "ZOO413",
      "name": "Hydrobiology and Fisheries",
      "status": "Required"
    },
    {
      "code": "BIO412",
      "name": "Biogeography",
      "status": "Elective"
    },
    {
      "code": "BIO413",
      "name": "History of Biology",
      "status": "Elective"
    },
    {
      "code": "BIO414",
      "name": "Impact of Biology on Society",
      "status": "Elective"
    },
    {
      "code": "BIO415",
      "name": "Environmental Biology",
      "status": "Elective"
    },
    {
      "code": "BIO416",
      "name": "Toxicology",
      "status": "Elective"
    },
    {
      "code": "ZOO414",
      "name": "Special Topics in Physiology",
      "status": "Elective"
    },
    {
      "code": "ZOO415",
      "name": "Wildlife Ecology and Conservation",
      "status": "Elective"
    },
    {
      "code": "ZOO416",
      "name": "Animal Behaviour",
      "status": "Elective"
    },
    {
      "code": "ZOO417",
      "name": "Local Fauna",
      "status": "Elective"
    }
  ],
  "Microbiology_100": [
    {
      "code": "C-GST111",
      "name": "Communication In English",
      "status": "Compulsory"
    },
    {
      "code": "C-GST112",
      "name": "Nigerian Peoples and Culture",
      "status": "Compulsory"
    },
    {
      "code": "C-MTH101",
      "name": "Elementary Mathematics I",
      "status": "Compulsory"
    },
    {
      "code": "C-MTH102",
      "name": "Elementary Mathematics II",
      "status": "Compulsory"
    },
    {
      "code": "C-COS101",
      "name": "Introduction to Computing Science",
      "status": "Compulsory"
    },
    {
      "code": "C-PHY101",
      "name": "General Physics I",
      "status": "Compulsory"
    },
    {
      "code": "C-PHY107",
      "name": "General Physics Practical I",
      "status": "Compulsory"
    },
    {
      "code": "C-BIO102",
      "name": "General Biology II",
      "status": "Compulsory"
    },
    {
      "code": "C-BIO108",
      "name": "General Biology Practical II",
      "status": "Compulsory"
    },
    {
      "code": "C-CHM102",
      "name": "General Chemistry II",
      "status": "Compulsory"
    },
    {
      "code": "C-CHM108",
      "name": "General Chemistry Practical II",
      "status": "Compulsory"
    },
    {
      "code": "C-PHY102",
      "name": "General Physics II",
      "status": "Compulsory"
    },
    {
      "code": "C-PHY108",
      "name": "General Physics Practical II",
      "status": "Compulsory"
    },
    {
      "code": "C-UI-MCB121",
      "name": "Microbiology and Sustainable Development",
      "status": "Required"
    },
    {
      "code": "C-UI-MCB123",
      "name": "Laboratory Techniques in Microbial Sciences",
      "status": "Required"
    },
    {
      "code": "C-UI-GES107",
      "name": "Reproductive health: STIs and HIV",
      "status": "Required"
    },
    {
      "code": "C-UI-GES108",
      "name": "Introduction to French",
      "status": "Required"
    },
    {
      "code": "C-BOT102",
      "name": "Introductory Botany",
      "status": "Elective"
    },
    {
      "code": "C-ZOO102",
      "name": "Animal Diversity",
      "status": "Elective"
    }
  ],
  "Microbiology_200": [
    {
      "code": "C-GST212",
      "name": "Philosophy, Logic and Human Existence",
      "status": "Compulsory"
    },
    {
      "code": "C-ENT211",
      "name": "Entrepreneurship and Innovation",
      "status": "Compulsory"
    },
    {
      "code": "C-MCB221",
      "name": "General Microbiology",
      "status": "Compulsory"
    },
    {
      "code": "C-MCB231",
      "name": "Basic Techniques in Microbiology",
      "status": "Compulsory"
    },
    {
      "code": "C-UI-MCB242",
      "name": "Microbial Taxonomy",
      "status": "Compulsory"
    },
    {
      "code": "C-UI-MCB250",
      "name": "Field Trip",
      "status": "Compulsory"
    },
    {
      "code": "C-UI-MCB261",
      "name": "Microbial Biotechnology",
      "status": "Required"
    },
    {
      "code": "C-UI-MCB262",
      "name": "Biodeterioration",
      "status": "Required"
    },
    {
      "code": "C-UI-MCB265",
      "name": "Introductory Mycology",
      "status": "Required"
    },
    {
      "code": "C-BCH201",
      "name": "General Biochemistry I",
      "status": "Required"
    },
    {
      "code": "C-BCH202",
      "name": "General Biochemistry II",
      "status": "Required"
    },
    {
      "code": "C-UI-MCB220",
      "name": "Yeast Biology and Biotechnology",
      "status": "Elective"
    },
    {
      "code": "C-UI-MCB263",
      "name": "Aeromicrobiology",
      "status": "Elective"
    }
  ],
  "Microbiology_300": [
    {
      "code": "MCB301",
      "name": "Specialized Techniques in Microbiology",
      "status": "Compulsory"
    },
    {
      "code": "MCB307",
      "name": "Immunology",
      "status": "Compulsory"
    },
    {
      "code": "MCB322",
      "name": "Bacteriology",
      "status": "Compulsory"
    },
    {
      "code": "MCB391",
      "name": "Industrial Attachment",
      "status": "Compulsory"
    },
    {
      "code": "BOT321",
      "name": "Mycology",
      "status": "Compulsory"
    },
    {
      "code": "BIC340",
      "name": "Chemistry and Biochemistry of Macromolecules",
      "status": "Required"
    },
    {
      "code": "BIC341",
      "name": "Enzymes and Intermediary Metabolism",
      "status": "Required"
    },
    {
      "code": "GES103",
      "name": "Government, Society and The Economy",
      "status": "Required"
    },
    {
      "code": "GES301",
      "name": "Introduction to Entrepreneurial Skills",
      "status": "Required"
    },
    {
      "code": "MCB323",
      "name": "Environmental Biotechnology",
      "status": "Required"
    },
    {
      "code": "MCB324",
      "name": "Environmental Microbiology",
      "status": "Required"
    },
    {
      "code": "MCB325",
      "name": "Soil Microbiology",
      "status": "Required"
    },
    {
      "code": "MCB326",
      "name": "Introductory to Virology",
      "status": "Required"
    },
    {
      "code": "ZOO318",
      "name": "The Biology and Ecology of Protozoan Parasites",
      "status": "Required"
    },
    {
      "code": "MCB328",
      "name": "Biodeterioration",
      "status": "Elective"
    },
    {
      "code": "BIO311",
      "name": "Genetic Variability and Evolution",
      "status": "Elective"
    },
    {
      "code": "BOT351",
      "name": "Introduction to Plant Diseases",
      "status": "Elective"
    }
  ],
  "Microbiology_400": [
    {
      "code": "MCB401",
      "name": "Seminar in Microbiology",
      "status": "Compulsory"
    },
    {
      "code": "MCB491",
      "name": "Research Project",
      "status": "Compulsory"
    },
    {
      "code": "BOT421",
      "name": "Advanced Mycology",
      "status": "Required"
    },
    {
      "code": "MCB403",
      "name": "Pharmaceutical Microbiology",
      "status": "Required"
    },
    {
      "code": "MCB404",
      "name": "Advanced Food Microbiology",
      "status": "Required"
    },
    {
      "code": "MCB407",
      "name": "Pathogenic Microbiology",
      "status": "Required"
    },
    {
      "code": "MCB482",
      "name": "Virology & Tissue Culture",
      "status": "Required"
    },
    {
      "code": "MCB405",
      "name": "Principles of Epidemiology and Public Health",
      "status": "Elective"
    },
    {
      "code": "BOT417",
      "name": "Plants and Environmental Pollution Monitoring",
      "status": "Elective"
    },
    {
      "code": "BOT463",
      "name": "Introduction to Mushroom Growing Technology",
      "status": "Elective"
    }
  ],
  "Geology_100": [
    {
      "code": "GEY102",
      "name": "Introduction to Geology I",
      "status": "Compulsory"
    },
    {
      "code": "GEY103",
      "name": "Introduction to Geology II",
      "status": "Compulsory"
    },
    {
      "code": "GES101",
      "name": "Use of English I",
      "status": "Compulsory"
    },
    {
      "code": "GES107",
      "name": "Reproductive Health, STIs and HIV",
      "status": "Compulsory"
    },
    {
      "code": "GES108",
      "name": "Introduction to French",
      "status": "Compulsory"
    },
    {
      "code": "CHE126",
      "name": "Inorganic Chemistry I",
      "status": "Required"
    },
    {
      "code": "CHE156",
      "name": "Physical Chemistry I",
      "status": "Required"
    },
    {
      "code": "CHE176",
      "name": "Organic Chemistry I",
      "status": "Required"
    },
    {
      "code": "CHE191",
      "name": "Practical Chemistry for 100 Level",
      "status": "Required"
    },
    {
      "code": "MAT111",
      "name": "Algebra",
      "status": "Required"
    },
    {
      "code": "MAT121",
      "name": "Calculus and Trigonometry",
      "status": "Required"
    },
    {
      "code": "PHY102",
      "name": "Introductory Mechanics and Property of Matter",
      "status": "Required"
    },
    {
      "code": "PHY104",
      "name": "Introduction to Electricity and Magnetism",
      "status": "Required"
    },
    {
      "code": "PHY105",
      "name": "Introductory Waves, Optics and Modern Physics",
      "status": "Required"
    },
    {
      "code": "PHY118",
      "name": "Experimental Physics I",
      "status": "Required"
    },
    {
      "code": "STA114",
      "name": "General Statistics I",
      "status": "Required"
    }
  ],
  "Geology_200": [
    {
      "code": "GEY201",
      "name": "Physical Geology",
      "status": "Compulsory"
    },
    {
      "code": "GEY202",
      "name": "Crystallography and Systematic Mineralogy",
      "status": "Compulsory"
    },
    {
      "code": "GEY205",
      "name": "Introduction to Geological Mapping Techniques",
      "status": "Compulsory"
    },
    {
      "code": "GEY284",
      "name": "Introductory Palaeontology and Stratigraphy",
      "status": "Required"
    }
  ],
  "Geology_300": [
    {
      "code": "GEY301",
      "name": "Igneous Petrology",
      "status": "Compulsory"
    },
    {
      "code": "GEY302",
      "name": "Metamorphic Petrology",
      "status": "Compulsory"
    },
    {
      "code": "GEY303",
      "name": "Sedimentary Petrology",
      "status": "Compulsory"
    },
    {
      "code": "GEY311",
      "name": "Structural Geology",
      "status": "Compulsory"
    },
    {
      "code": "GEY313",
      "name": "Field Geology Mapping",
      "status": "Compulsory"
    },
    {
      "code": "GEY358",
      "name": "Marine Geology",
      "status": "Elective"
    }
  ],
  "Geology_400": [
    {
      "code": "GEY401",
      "name": "Economic Geology",
      "status": "Compulsory"
    },
    {
      "code": "GEY403",
      "name": "Petroleum Geology",
      "status": "Compulsory"
    },
    {
      "code": "GEY405",
      "name": "Hydrogeology",
      "status": "Compulsory"
    },
    {
      "code": "GEY411",
      "name": "Engineering Geology",
      "status": "Compulsory"
    },
    {
      "code": "GEY499",
      "name": "Undergraduate Research Project",
      "status": "Compulsory"
    }
  ],
  "Geography_100": [
    {
      "code": "GEO111",
      "name": "Elements of Physical Geography",
      "status": "Required"
    },
    {
      "code": "GEO131",
      "name": "Elements of Human Geography",
      "status": "Required"
    },
    {
      "code": "GEO141",
      "name": "Ibadan Region",
      "status": "Required"
    },
    {
      "code": "GEO181",
      "name": "Practical Geography",
      "status": "Required"
    },
    {
      "code": "GES101",
      "name": "Use of English I",
      "status": "Compulsory"
    },
    {
      "code": "GES107",
      "name": "Sexual and Reproductive Health",
      "status": "Required"
    },
    {
      "code": "GES108",
      "name": "Introduction to French",
      "status": "Required"
    }
  ],
  "Geography_200": [
    {
      "code": "GEO211",
      "name": "Geomorphology",
      "status": "Compulsory"
    },
    {
      "code": "GEO212",
      "name": "Climatology",
      "status": "Compulsory"
    },
    {
      "code": "GEO221",
      "name": "Spatial Organization of Human Activity",
      "status": "Compulsory"
    },
    {
      "code": "GEO281",
      "name": "Map Reading and Interpretation",
      "status": "Compulsory"
    }
  ],
  "Geography_300": [
    {
      "code": "GEO311",
      "name": "Biogeography",
      "status": "Compulsory"
    },
    {
      "code": "GEO312",
      "name": "Hydrology and Water Resources",
      "status": "Compulsory"
    },
    {
      "code": "GEO381",
      "name": "Quantitative Techniques in Geography",
      "status": "Compulsory"
    },
    {
      "code": "GEO382",
      "name": "Field Mapping Techniques",
      "status": "Compulsory"
    }
  ],
  "Geography_400": [
    {
      "code": "GEO411",
      "name": "Geographic Thought and Philosophy",
      "status": "Compulsory"
    },
    {
      "code": "GEO481",
      "name": "Geographic Information Systems (GIS)",
      "status": "Compulsory"
    },
    {
      "code": "GEO499",
      "name": "Undergraduate Research Dissertation",
      "status": "Compulsory"
    }
  ],
  "Archaeology_100": [
    {
      "code": "ARC101",
      "name": "Introduction to Archaeology",
      "status": "Compulsory"
    },
    {
      "code": "ARC102",
      "name": "Introduction to Human Origins",
      "status": "Compulsory"
    },
    {
      "code": "ARC103",
      "name": "A Survey of Old World Archaeology",
      "status": "Compulsory"
    },
    {
      "code": "ARC104",
      "name": "African Knowledge Systems",
      "status": "Compulsory"
    },
    {
      "code": "ARC105",
      "name": "Public Archaeology",
      "status": "Compulsory"
    },
    {
      "code": "ARC106",
      "name": "Introduction to Anthropology",
      "status": "Compulsory"
    },
    {
      "code": "UI-ARC123",
      "name": "Introduction to Human Environment",
      "status": "Required"
    },
    {
      "code": "GST111",
      "name": "Communication in English",
      "status": "Compulsory"
    },
    {
      "code": "GST112",
      "name": "Nigerian Peoples and Culture",
      "status": "Compulsory"
    },
    {
      "code": "COS101",
      "name": "Introduction to Computing Sciences",
      "status": "Compulsory"
    },
    {
      "code": "ANT115",
      "name": "Introduction to Cultural Anthropology",
      "status": "Required"
    },
    {
      "code": "ANT126",
      "name": "Introductory to Primates and Humans",
      "status": "Required"
    },
    {
      "code": "ANT127",
      "name": "Nigerian Cultures and Societies",
      "status": "Required"
    }
  ],
  "Archaeology_200": [
    {
      "code": "ARC201",
      "name": "Archaeological Method and Theory",
      "status": "Compulsory"
    },
    {
      "code": "ARC211",
      "name": "Prehistory of West Africa",
      "status": "Compulsory"
    },
    {
      "code": "ANT216",
      "name": "Hominid Evolution and Early Cultural Development",
      "status": "Elective"
    },
    {
      "code": "ARC222",
      "name": "Introduction to Environmental Archaeology",
      "status": "Elective"
    }
  ],
  "Archaeology_300": [
    {
      "code": "ARC301",
      "name": "Fieldwork Excavation Techniques",
      "status": "Compulsory"
    },
    {
      "code": "ARC311",
      "name": "Laboratory Analysis in Archaeology",
      "status": "Compulsory"
    },
    {
      "code": "ARC321",
      "name": "Cultural Resource Management",
      "status": "Compulsory"
    }
  ],
  "Archaeology_400": [
    {
      "code": "ARC401",
      "name": "Advanced Archaeological Theory",
      "status": "Compulsory"
    },
    {
      "code": "ARC411",
      "name": "Archaeology of Nigeria",
      "status": "Compulsory"
    },
    {
      "code": "ARC499",
      "name": "Undergraduate Field Project and Thesis",
      "status": "Compulsory"
    }
  ],
  "Anthropology_100": [
    {
      "code": "ANT115",
      "name": "Introduction to Cultural Anthropology",
      "status": "Required"
    },
    {
      "code": "ANT126",
      "name": "Introductory to Primates and Humans",
      "status": "Required"
    },
    {
      "code": "ANT127",
      "name": "Nigerian Cultures and Societies",
      "status": "Required"
    },
    {
      "code": "ARC123",
      "name": "Introduction to Human Environment",
      "status": "Required"
    }
  ],
  "Anthropology_200": [
    {
      "code": "ANT216",
      "name": "Hominid Evolution and Early Cultural Development",
      "status": "Compulsory"
    },
    {
      "code": "ANT225",
      "name": "Ethnography of Sub-Saharan Africa",
      "status": "Compulsory"
    }
  ],
  "Anthropology_300": [
    {
      "code": "ANT311",
      "name": "Research Methods in Anthropology",
      "status": "Compulsory"
    },
    {
      "code": "ANT315",
      "name": "Social Anthropological Theory",
      "status": "Compulsory"
    }
  ],
  "Anthropology_400": [
    {
      "code": "ANT411",
      "name": "Applied Anthropology",
      "status": "Compulsory"
    },
    {
      "code": "ANT499",
      "name": "Undergraduate Research Project",
      "status": "Compulsory"
    }
  ],
  "IndustrialChemistry_100": [
    {
      "code": "CHE126",
      "name": "Inorganic Chemistry I",
      "status": "Compulsory"
    },
    {
      "code": "CHE156",
      "name": "Physical Chemistry I",
      "status": "Compulsory"
    },
    {
      "code": "CHE176",
      "name": "Organic Chemistry I",
      "status": "Compulsory"
    },
    {
      "code": "CHE191",
      "name": "Practical Chemistry for 100 Level",
      "status": "Compulsory"
    }
  ],
  "IndustrialChemistry_200": [
    {
      "code": "ICH227",
      "name": "Chemical Raw Materials I",
      "status": "Compulsory"
    },
    {
      "code": "ICH247",
      "name": "Large Scale Chemistry",
      "status": "Compulsory"
    },
    {
      "code": "CHE218",
      "name": "Introductory Analytical Chemistry",
      "status": "Compulsory"
    }
  ],
  "IndustrialChemistry_300": [
    {
      "code": "ICH367",
      "name": "Petrochemicals and Utilization of Wastes with Practical",
      "status": "Compulsory"
    },
    {
      "code": "ICH397",
      "name": "Industrial Attachment",
      "status": "Compulsory"
    }
  ],
  "IndustrialChemistry_400": [
    {
      "code": "ICH467",
      "name": "Process Chemistry",
      "status": "Compulsory"
    },
    {
      "code": "ICH481",
      "name": "Special Topics in Industrial Chemistry",
      "status": "Compulsory"
    },
    {
      "code": "CHE496",
      "name": "Research Project",
      "status": "Compulsory"
    }
  ],
  "ComputerScience_100": [
    {
      "code": "C-COS101",
      "name": "Introduction to Computing Sciences",
      "status": "Compulsory"
    },
    {
      "code": "C-COS102",
      "name": "Problem Solving",
      "status": "Compulsory"
    },
    {
      "code": "C-UI-COS103",
      "name": "Practical Lab I",
      "status": "Compulsory"
    },
    {
      "code": "C-GST111",
      "name": "Communication in English",
      "status": "Compulsory"
    },
    {
      "code": "C-GST112",
      "name": "Nigerian Peoples and Culture",
      "status": "Compulsory"
    },
    {
      "code": "C-MTH101",
      "name": "Elementary Mathematics I (Algebra & Trigonometry)",
      "status": "Compulsory"
    },
    {
      "code": "C-MTH102",
      "name": "Elementary Mathematics II (Calculus)",
      "status": "Compulsory"
    },
    {
      "code": "C-STA111",
      "name": "Descriptive Statistics",
      "status": "Compulsory"
    },
    {
      "code": "C-PHY101",
      "name": "General Physics I (Mechanics)",
      "status": "Compulsory"
    },
    {
      "code": "C-PHY102",
      "name": "General Physics II (Electricity & Magnetism)",
      "status": "Compulsory"
    },
    {
      "code": "C-PHY107",
      "name": "General Practical Physics I",
      "status": "Compulsory"
    },
    {
      "code": "C-PHY108",
      "name": "General Practical Physics II",
      "status": "Compulsory"
    },
    {
      "code": "C-MTH103",
      "name": "Elementary Mathematics III (Vectors, Geometry & Dynamics)",
      "status": "Required"
    },
    {
      "code": "C-STA122",
      "name": "Statistical Computing I",
      "status": "Required"
    },
    {
      "code": "C-UI-GES107",
      "name": "Reproductive Health, STIs & HIV",
      "status": "Required"
    },
    {
      "code": "C-UI-GES108",
      "name": "Introduction to French",
      "status": "Required"
    }
  ],
  "ComputerScience_200": [
    {
      "code": "C-GST212",
      "name": "Philosophy, Logic and Human Existence",
      "status": "Compulsory"
    },
    {
      "code": "C-ENT211",
      "name": "Entrepreneurship and Innovation",
      "status": "Compulsory"
    },
    {
      "code": "C-COS201",
      "name": "Computer Programming I",
      "status": "Compulsory"
    },
    {
      "code": "C-COS202",
      "name": "Computer Programming II",
      "status": "Compulsory"
    },
    {
      "code": "C-MTH201",
      "name": "Mathematical Methods I",
      "status": "Compulsory"
    },
    {
      "code": "C-MTH202",
      "name": "Elementary Differential Equations",
      "status": "Compulsory"
    },
    {
      "code": "C-CSC203",
      "name": "Discrete Structures",
      "status": "Compulsory"
    },
    {
      "code": "C-INS202",
      "name": "Human Computer Interface",
      "status": "Compulsory"
    },
    {
      "code": "C-INS204",
      "name": "System Analysis and Design",
      "status": "Compulsory"
    },
    {
      "code": "C-SEN201",
      "name": "Introduction to Software Engineering",
      "status": "Compulsory"
    },
    {
      "code": "C-SEN299",
      "name": "SIWES I",
      "status": "Compulsory"
    },
    {
      "code": "C-STA202",
      "name": "Statistics for Physical Sciences and Engineering",
      "status": "Required"
    },
    {
      "code": "C-IFT302",
      "name": "Web Application Development",
      "status": "Required"
    },
    {
      "code": "C-UI-CSC236",
      "name": "Introduction to Algorithms",
      "status": "Required"
    },
    {
      "code": "C-UI-CSC272",
      "name": "Information Management Systems",
      "status": "Required"
    },
    {
      "code": "C-UI-COS203",
      "name": "Practical Lab II",
      "status": "Compulsory"
    }
  ],
  "ComputerScience_300": [
    {
      "code": "C-GST312",
      "name": "Peace and Conflict Resolution",
      "status": "Compulsory"
    },
    {
      "code": "C-ENT312",
      "name": "Venture Creation",
      "status": "Compulsory"
    },
    {
      "code": "C-CSC301",
      "name": "Data Structures",
      "status": "Compulsory"
    },
    {
      "code": "C-CSC308",
      "name": "Operating Systems",
      "status": "Compulsory"
    },
    {
      "code": "C-CSC309",
      "name": "Artificial Intelligence",
      "status": "Compulsory"
    },
    {
      "code": "C-DTS304",
      "name": "Data Management I",
      "status": "Compulsory"
    },
    {
      "code": "C-IFT212",
      "name": "Computer Architecture and Organisation",
      "status": "Compulsory"
    },
    {
      "code": "C-SEN301",
      "name": "Object-Oriented Analysis and Design",
      "status": "Compulsory"
    },
    {
      "code": "C-SEN306",
      "name": "Software Construction",
      "status": "Compulsory"
    },
    {
      "code": "C-SEN399",
      "name": "SIWES II",
      "status": "Compulsory"
    },
    {
      "code": "C-UI-CSC331",
      "name": "Programming Principles & Paradigms",
      "status": "Required"
    },
    {
      "code": "C-UI-CSC334",
      "name": "Systems Programming",
      "status": "Required"
    },
    {
      "code": "C-UI-CSC351",
      "name": "Formal Languages and Automata Theory",
      "status": "Required"
    },
    {
      "code": "C-UI-CSC572",
      "name": "Machine Learning",
      "status": "Required"
    },
    {
      "code": "C-UI-COS301",
      "name": "Practical Lab III",
      "status": "Required"
    },
    {
      "code": "C-MTH209",
      "name": "Introduction to Numerical Analysis",
      "status": "Elective"
    },
    {
      "code": "C-UI-CYB204",
      "name": "Cybersecurity in Business & Industry",
      "status": "Elective"
    }
  ],
  "ComputerScience_400": [
    {
      "code": "C-SEN304",
      "name": "Software Testing and Quality Assurance",
      "status": "Compulsory"
    },
    {
      "code": "C-SEN410",
      "name": "Software Architecture and Design",
      "status": "Compulsory"
    },
    {
      "code": "C-UI-SEN499",
      "name": "Industrial Training III",
      "status": "Compulsory"
    },
    {
      "code": "C-DTS404",
      "name": "Data Management II",
      "status": "Required"
    },
    {
      "code": "C-UI-SEN402",
      "name": "Software Engineering Economics",
      "status": "Required"
    },
    {
      "code": "C-UI-CSC431",
      "name": "Compiler Construction",
      "status": "Required"
    },
    {
      "code": "C-UI-CSC477",
      "name": "Computer Graphics",
      "status": "Elective"
    },
    {
      "code": "C-INS304",
      "name": "Web Development using Content Management System",
      "status": "Elective"
    },
    {
      "code": "C-INS311",
      "name": "E-Business Systems Development",
      "status": "Elective"
    }
  ],
  "English_100": [
    {
      "code": "ENG101",
      "name": "Introduction to English Grammar and Composition",
      "status": "Compulsory"
    },
    {
      "code": "LIT105",
      "name": "Introduction to Prose Fiction",
      "status": "Compulsory"
    },
    {
      "code": "LIT106",
      "name": "Introduction to Drama",
      "status": "Compulsory"
    },
    {
      "code": "UI-ENG/LIT151",
      "name": "Language, Literature and the ICT",
      "status": "Compulsory"
    },
    {
      "code": "UI-ENG/LIT153",
      "name": "Hermeneutics of Language, Literature and Religion",
      "status": "Compulsory"
    },
    {
      "code": "UI-ENG155",
      "name": "Introduction to the Study of Language",
      "status": "Compulsory"
    },
    {
      "code": "UI-ENG157",
      "name": "Introduction to Folklore and Science",
      "status": "Compulsory"
    },
    {
      "code": "UI-ENG158",
      "name": "Introduction to Literature and Literary Criticism",
      "status": "Compulsory"
    }
  ],
  "English_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official English portal",
      "status": "Required"
    }
  ],
  "English_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official English portal",
      "status": "Required"
    }
  ],
  "English_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official English portal",
      "status": "Required"
    }
  ],
  "ArabicLanguageAndLiterature_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Arabic portal",
      "status": "Required"
    }
  ],
  "ArabicLanguageAndLiterature_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Arabic portal",
      "status": "Required"
    }
  ],
  "ArabicLanguageAndLiterature_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Arabic portal",
      "status": "Required"
    }
  ],
  "ArabicLanguageAndLiterature_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Arabic portal",
      "status": "Required"
    }
  ],
  "ClassicalStudies_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Classics portal",
      "status": "Required"
    }
  ],
  "ClassicalStudies_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Classics portal",
      "status": "Required"
    }
  ],
  "ClassicalStudies_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Classics portal",
      "status": "Required"
    }
  ],
  "ClassicalStudies_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Classics portal",
      "status": "Required"
    }
  ],
  "CommunicationAndLanguageArts_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official CLA portal",
      "status": "Required"
    }
  ],
  "CommunicationAndLanguageArts_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official CLA portal",
      "status": "Required"
    }
  ],
  "CommunicationAndLanguageArts_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official CLA portal",
      "status": "Required"
    }
  ],
  "CommunicationAndLanguageArts_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official CLA portal",
      "status": "Required"
    }
  ],
  "EuropeanStudies_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official European Studies portal",
      "status": "Required"
    }
  ],
  "EuropeanStudies_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official European Studies portal",
      "status": "Required"
    }
  ],
  "EuropeanStudies_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official European Studies portal",
      "status": "Required"
    }
  ],
  "EuropeanStudies_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official European Studies portal",
      "status": "Required"
    }
  ],
  "History_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official History portal",
      "status": "Required"
    }
  ],
  "History_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official History portal",
      "status": "Required"
    }
  ],
  "History_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official History portal",
      "status": "Required"
    }
  ],
  "History_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official History portal",
      "status": "Required"
    }
  ],
  "IslamicStudies_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Islamic Studies portal",
      "status": "Required"
    }
  ],
  "IslamicStudies_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Islamic Studies portal",
      "status": "Required"
    }
  ],
  "IslamicStudies_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Islamic Studies portal",
      "status": "Required"
    }
  ],
  "IslamicStudies_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Islamic Studies portal",
      "status": "Required"
    }
  ],
  "Linguistics_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Linguistics portal",
      "status": "Required"
    }
  ],
  "Linguistics_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Linguistics portal",
      "status": "Required"
    }
  ],
  "Linguistics_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Linguistics portal",
      "status": "Required"
    }
  ],
  "Linguistics_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Linguistics portal",
      "status": "Required"
    }
  ],
  "Music_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Music portal",
      "status": "Required"
    }
  ],
  "Music_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Music portal",
      "status": "Required"
    }
  ],
  "Music_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Music portal",
      "status": "Required"
    }
  ],
  "Music_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Music portal",
      "status": "Required"
    }
  ],
  "Philosophy_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Philosophy portal",
      "status": "Required"
    }
  ],
  "Philosophy_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Philosophy portal",
      "status": "Required"
    }
  ],
  "Philosophy_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Philosophy portal",
      "status": "Required"
    }
  ],
  "Philosophy_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Philosophy portal",
      "status": "Required"
    }
  ],
  "ReligiousStudies_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Religious Studies portal",
      "status": "Required"
    }
  ],
  "ReligiousStudies_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Religious Studies portal",
      "status": "Required"
    }
  ],
  "ReligiousStudies_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Religious Studies portal",
      "status": "Required"
    }
  ],
  "ReligiousStudies_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Religious Studies portal",
      "status": "Required"
    }
  ],
  "TheatreArts_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Theatre Arts portal",
      "status": "Required"
    }
  ],
  "TheatreArts_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Theatre Arts portal",
      "status": "Required"
    }
  ],
  "TheatreArts_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Theatre Arts portal",
      "status": "Required"
    }
  ],
  "TheatreArts_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Theatre Arts portal",
      "status": "Required"
    }
  ],
  "PoliticalScience_100": [
    {
      "code": "POS111",
      "name": "The Study of Politics",
      "status": "Compulsory"
    },
    {
      "code": "POS113",
      "name": "The Organization of Government",
      "status": "Compulsory"
    }
  ],
  "PoliticalScience_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official POS portal",
      "status": "Required"
    }
  ],
  "PoliticalScience_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official POS portal",
      "status": "Required"
    }
  ],
  "PoliticalScience_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official POS portal",
      "status": "Required"
    }
  ],
  "Psychology_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Psychology portal",
      "status": "Required"
    }
  ],
  "Psychology_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Psychology portal",
      "status": "Required"
    }
  ],
  "Psychology_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Psychology portal",
      "status": "Required"
    }
  ],
  "Psychology_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Psychology portal",
      "status": "Required"
    }
  ],
  "Sociology_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Sociology portal",
      "status": "Required"
    }
  ],
  "Sociology_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Sociology portal",
      "status": "Required"
    }
  ],
  "Sociology_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Sociology portal",
      "status": "Required"
    }
  ],
  "Sociology_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Sociology portal",
      "status": "Required"
    }
  ],
  "AutomotiveEngineering_100": [
    {
      "code": "C-GST111",
      "name": "Communication in English",
      "status": "Compulsory"
    },
    {
      "code": "C-CHM101",
      "name": "General Chemistry I",
      "status": "Compulsory"
    },
    {
      "code": "C-COS101",
      "name": "Introduction to Computer Sciences",
      "status": "Elective"
    },
    {
      "code": "C-GET101",
      "name": "Engineer in Society",
      "status": "Compulsory"
    },
    {
      "code": "C-UI-GES107",
      "name": "Reproductive Health, STIs, Drugs and Mankind",
      "status": "Compulsory"
    },
    {
      "code": "C-STA111",
      "name": "Descriptive Statistics",
      "status": "Elective"
    },
    {
      "code": "C-GET102",
      "name": "Engineering Graphics and Solid Modelling I",
      "status": "Compulsory"
    },
    {
      "code": "C-TAE102",
      "name": "Introduction to Automotive Engineering",
      "status": "Compulsory"
    },
    {
      "code": "C-UI-TME121",
      "name": "Basic Workshop Practice",
      "status": "Required"
    },
    {
      "code": "C-UI-TAE104",
      "name": "Introduction to Automotive Engineering Practical I",
      "status": "Elective"
    },
    {
      "code": "C-UI-GES108",
      "name": "Introduction to French",
      "status": "Elective"
    }
  ],
  "AutomotiveEngineering_200": [
    {
      "code": "C-ENT211",
      "name": "Entrepreneurship and Innovation",
      "status": "Compulsory"
    },
    {
      "code": "C-GET201",
      "name": "Applied Electricity I",
      "status": "Compulsory"
    },
    {
      "code": "C-GET205",
      "name": "Fundamentals of Fluid Mechanics",
      "status": "Compulsory"
    },
    {
      "code": "C-GET209",
      "name": "Engineering Mathematics I",
      "status": "Compulsory"
    },
    {
      "code": "C-GET211",
      "name": "Computer and Software Engineering",
      "status": "Compulsory"
    },
    {
      "code": "C-GET203",
      "name": "Engineering Graphics and Solid Modelling II",
      "status": "Elective"
    },
    {
      "code": "C-GET207",
      "name": "Applied Mechanics",
      "status": "Elective"
    },
    {
      "code": "C-UI-TAE201",
      "name": "Instrumentation For Automotive Engineers",
      "status": "Elective"
    },
    {
      "code": "C-GST212",
      "name": "Philosophy, Logic and Human Existence",
      "status": "Compulsory"
    },
    {
      "code": "C-GET202",
      "name": "Engineering Materials",
      "status": "Compulsory"
    },
    {
      "code": "C-GET204",
      "name": "Students Workshop Practice II",
      "status": "Compulsory"
    },
    {
      "code": "C-GET206",
      "name": "Fundamentals of Thermodynamics",
      "status": "Compulsory"
    },
    {
      "code": "C-GET208",
      "name": "Strength of Materials",
      "status": "Compulsory"
    },
    {
      "code": "C-GET210",
      "name": "Engineering Mathematics II",
      "status": "Compulsory"
    },
    {
      "code": "C-GET299",
      "name": "SIWES I: SWEP",
      "status": "Compulsory"
    },
    {
      "code": "C-UI-TAE202",
      "name": "Automotive Engines",
      "status": "Elective"
    }
  ],
  "AutomotiveEngineering_300": [
    {
      "code": "C-GET301",
      "name": "Engineering Mathematics III",
      "status": "Compulsory"
    },
    {
      "code": "C-GET305",
      "name": "Engineering Statistics and Data Analytics",
      "status": "Compulsory"
    },
    {
      "code": "C-GET307",
      "name": "Introduction to Artificial Intelligence, Machine Learning and Convergent Technologies",
      "status": "Compulsory"
    },
    {
      "code": "C-UI-GET309",
      "name": "Engineering Economics",
      "status": "Elective"
    },
    {
      "code": "C-UI-TAE313",
      "name": "Automotive Engineering Technology",
      "status": "Elective"
    },
    {
      "code": "C-UI-TAE323",
      "name": "Automotive Engineering Practical II",
      "status": "Elective"
    }
  ],
  "AutomotiveEngineering_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Automotive portal",
      "status": "Required"
    }
  ],
  "AutomotiveEngineering_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Automotive portal",
      "status": "Required"
    }
  ],
  "AgriculturalAndEnvironmentalEngineering_100": [
    {
      "code": "ABE106",
      "name": "Engineering Mathematics II",
      "status": "Compulsory"
    },
    {
      "code": "ABE108",
      "name": "Construction and Maintenance of Processing and Storage Facilities",
      "status": "Compulsory"
    }
  ],
  "AgriculturalAndEnvironmentalEngineering_200": [
    {
      "code": "ABE210",
      "name": "Post-Harvest Technologies and Storage",
      "status": "Compulsory"
    }
  ],
  "AgriculturalAndEnvironmentalEngineering_300": [
    {
      "code": "PHT304",
      "name": "Primary Processing Methods and Equipment",
      "status": "Compulsory"
    }
  ],
  "AgriculturalAndEnvironmentalEngineering_400": [
    {
      "code": "PHT401",
      "name": "Crop Handling and Storage",
      "status": "Compulsory"
    },
    {
      "code": "PHT405",
      "name": "Quality Control and Loss Assessment",
      "status": "Compulsory"
    }
  ],
  "AgriculturalAndEnvironmentalEngineering_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official ABE portal",
      "status": "Required"
    }
  ],
  "ElectricalAndElectronicsEngineering_100": [
    {
      "code": "UI-EEE104",
      "name": "Electrical and Electronic Laboratory I",
      "status": "Compulsory"
    }
  ],
  "ElectricalAndElectronicsEngineering_200": [
    {
      "code": "TEL231",
      "name": "Applied Electricity",
      "status": "Compulsory"
    },
    {
      "code": "TEL221",
      "name": "Fundamental of Electrical Engineering",
      "status": "Compulsory"
    }
  ],
  "ElectricalAndElectronicsEngineering_300": [
    {
      "code": "TEL316",
      "name": "Computer Programming & Applications I",
      "status": "Compulsory"
    }
  ],
  "ElectricalAndElectronicsEngineering_400": [
    {
      "code": "TEL411",
      "name": "Digital System Design",
      "status": "Compulsory"
    },
    {
      "code": "TEL417",
      "name": "Sampled Data Control System",
      "status": "Compulsory"
    },
    {
      "code": "TEL418",
      "name": "Computer Programming & Applications II",
      "status": "Compulsory"
    },
    {
      "code": "TEL437",
      "name": "Digital Signal Processing",
      "status": "Compulsory"
    },
    {
      "code": "TEL438",
      "name": "Solid State Electronics",
      "status": "Compulsory"
    }
  ],
  "ElectricalAndElectronicsEngineering_500": [
    {
      "code": "TEL512",
      "name": "Communication Systems II",
      "status": "Compulsory"
    }
  ],
  "MechanicalEngineering_100": [
    {
      "code": "TME121",
      "name": "Basic Workshop Practice",
      "status": "Required"
    }
  ],
  "MechanicalEngineering_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Mechanical portal",
      "status": "Required"
    }
  ],
  "MechanicalEngineering_300": [
    {
      "code": "MEE309",
      "name": "Strength of Materials",
      "status": "Compulsory"
    }
  ],
  "MechanicalEngineering_400": [
    {
      "code": "TME413",
      "name": "Advanced Strength of Materials",
      "status": "Compulsory"
    }
  ],
  "MechanicalEngineering_500": [
    {
      "code": "TME515",
      "name": "Fracture of Structural Materials",
      "status": "Compulsory"
    },
    {
      "code": "TME523",
      "name": "Applied Dynamics",
      "status": "Compulsory"
    }
  ],
  "IndustrialAndProductionEngineering_100": [
    {
      "code": "C-IPE102",
      "name": "Introduction to Industrial and Production Engineering",
      "status": "Compulsory"
    },
    {
      "code": "C-GST111",
      "name": "Communication in English I",
      "status": "Compulsory"
    },
    {
      "code": "C-GST112",
      "name": "Nigerian Peoples and Culture",
      "status": "Compulsory"
    },
    {
      "code": "C-CHM101",
      "name": "General Chemistry I",
      "status": "Compulsory"
    },
    {
      "code": "C-CHM102",
      "name": "General Chemistry II",
      "status": "Compulsory"
    },
    {
      "code": "C-MTH101",
      "name": "Elementary Mathematics I (Algebra and Trigonometry)",
      "status": "Compulsory"
    },
    {
      "code": "C-MTH102",
      "name": "Elementary Mathematics II (Calculus)",
      "status": "Compulsory"
    },
    {
      "code": "C-PHY101",
      "name": "General Physics I",
      "status": "Compulsory"
    },
    {
      "code": "C-PHY103",
      "name": "General Physics III",
      "status": "Compulsory"
    },
    {
      "code": "C-PHY107",
      "name": "General Practical Physics I",
      "status": "Compulsory"
    },
    {
      "code": "C-PHY108",
      "name": "General Practical Physics II",
      "status": "Compulsory"
    },
    {
      "code": "C-GET101",
      "name": "Engineer in Society",
      "status": "Compulsory"
    },
    {
      "code": "C-GET102",
      "name": "Engineering Graphics and Solid Modelling I",
      "status": "Compulsory"
    },
    {
      "code": "C-UI-GES107",
      "name": "Reproductive Health, STIs, Drugs and Mankind",
      "status": "Required"
    },
    {
      "code": "C-UI-GES108",
      "name": "Introduction to French",
      "status": "Required"
    },
    {
      "code": "C-UI-TME121",
      "name": "Basic Workshop Practice",
      "status": "Required"
    },
    {
      "code": "C-CHM107",
      "name": "General Chemistry Practical I",
      "status": "Required"
    },
    {
      "code": "C-CHM108",
      "name": "General Chemistry Practical II",
      "status": "Required"
    },
    {
      "code": "C-PHY102",
      "name": "General Physics II",
      "status": "Required"
    },
    {
      "code": "C-PHY104",
      "name": "General Physics IV",
      "status": "Required"
    },
    {
      "code": "C-MTH103",
      "name": "Elementary Mathematics III (Vectors, Geometry and Dynamics)",
      "status": "Required"
    },
    {
      "code": "C-STA111",
      "name": "Descriptive Statistics",
      "status": "Required"
    },
    {
      "code": "C-STA112",
      "name": "Probability I",
      "status": "Required"
    }
  ],
  "IndustrialAndProductionEngineering_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Industrial portal",
      "status": "Required"
    }
  ],
  "IndustrialAndProductionEngineering_300": [
    {
      "code": "TIE312",
      "name": "Operations Research",
      "status": "Compulsory"
    }
  ],
  "IndustrialAndProductionEngineering_400": [
    {
      "code": "TIE411",
      "name": "Reliability Engineering",
      "status": "Compulsory"
    },
    {
      "code": "TIE414",
      "name": "Industrial Quality Control",
      "status": "Compulsory"
    },
    {
      "code": "TIE417",
      "name": "Project Planning & Control II",
      "status": "Compulsory"
    }
  ],
  "IndustrialAndProductionEngineering_500": [
    {
      "code": "TIE521",
      "name": "Computer-Aided Manufacturing",
      "status": "Compulsory"
    },
    {
      "code": "TIE525",
      "name": "Information Systems",
      "status": "Compulsory"
    },
    {
      "code": "TIE526",
      "name": "Special Topics in Industrial Engineering",
      "status": "Compulsory"
    },
    {
      "code": "TIE599",
      "name": "Final Year Project Supervision (Industrial & Production Engineering)",
      "status": "Compulsory"
    }
  ],
  "FoodTechnology_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Food Tech portal",
      "status": "Required"
    }
  ],
  "FoodTechnology_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Food Tech portal",
      "status": "Required"
    }
  ],
  "FoodTechnology_300": [
    {
      "code": "TFT321",
      "name": "Fundamental Food Processing",
      "status": "Compulsory"
    }
  ],
  "FoodTechnology_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Food Tech portal",
      "status": "Required"
    }
  ],
  "FoodTechnology_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Food Tech portal",
      "status": "Required"
    }
  ],
  "BiomedicalEngineering_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Biomedical portal",
      "status": "Required"
    }
  ],
  "BiomedicalEngineering_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Biomedical portal",
      "status": "Required"
    }
  ],
  "BiomedicalEngineering_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Biomedical portal",
      "status": "Required"
    }
  ],
  "BiomedicalEngineering_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Biomedical portal",
      "status": "Required"
    }
  ],
  "BiomedicalEngineering_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Biomedical portal",
      "status": "Required"
    }
  ],
  "CivilEngineering_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Civil portal",
      "status": "Required"
    }
  ],
  "CivilEngineering_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Civil portal",
      "status": "Required"
    }
  ],
  "CivilEngineering_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Civil portal",
      "status": "Required"
    }
  ],
  "CivilEngineering_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Civil portal",
      "status": "Required"
    }
  ],
  "CivilEngineering_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Civil portal",
      "status": "Required"
    }
  ],
  "PetroleumEngineering_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Petroleum portal",
      "status": "Required"
    }
  ],
  "PetroleumEngineering_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Petroleum portal",
      "status": "Required"
    }
  ],
  "PetroleumEngineering_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Petroleum portal",
      "status": "Required"
    }
  ],
  "PetroleumEngineering_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Petroleum portal",
      "status": "Required"
    }
  ],
  "PetroleumEngineering_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Petroleum portal",
      "status": "Required"
    }
  ],
  "WoodProductsEngineering_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Wood Products portal",
      "status": "Required"
    }
  ],
  "WoodProductsEngineering_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Wood Products portal",
      "status": "Required"
    }
  ],
  "WoodProductsEngineering_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Wood Products portal",
      "status": "Required"
    }
  ],
  "WoodProductsEngineering_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Wood Products portal",
      "status": "Required"
    }
  ],
  "WoodProductsEngineering_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Wood Products portal",
      "status": "Required"
    }
  ],
  "AgriculturalExtensionAndRuralDevelopment_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official AERD portal",
      "status": "Required"
    }
  ],
  "AgriculturalExtensionAndRuralDevelopment_200": [
    {
      "code": "HES210",
      "name": "Introduction to Home Economics",
      "status": "Required"
    }
  ],
  "AgriculturalExtensionAndRuralDevelopment_300": [
    {
      "code": "AES310",
      "name": "Agricultural Extension Education",
      "status": "Required"
    },
    {
      "code": "AES313",
      "name": "Educational Psychology",
      "status": "Required"
    }
  ],
  "AgriculturalExtensionAndRuralDevelopment_400": [
    {
      "code": "AES410",
      "name": "Community Agricultural Extension",
      "status": "Required"
    }
  ],
  "AgriculturalExtensionAndRuralDevelopment_500": [
    {
      "code": "AES511",
      "name": "Agric. Extension Administration and Supervision",
      "status": "Compulsory"
    },
    {
      "code": "AES513",
      "name": "Extension Communication Systems and Methods",
      "status": "Compulsory"
    },
    {
      "code": "AES514",
      "name": "Rural Youth Extension Programmes",
      "status": "Compulsory"
    }
  ],
  "AgriculturalEconomics_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Agricultural Economics portal",
      "status": "Required"
    }
  ],
  "AgriculturalEconomics_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Agricultural Economics portal",
      "status": "Required"
    }
  ],
  "AgriculturalEconomics_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Agricultural Economics portal",
      "status": "Required"
    }
  ],
  "AgriculturalEconomics_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Agricultural Economics portal",
      "status": "Required"
    }
  ],
  "AgriculturalEconomics_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Agricultural Economics portal",
      "status": "Required"
    }
  ],
  "CropAndHorticulturalSciences_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Crop Sciences portal",
      "status": "Required"
    }
  ],
  "CropAndHorticulturalSciences_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Crop Sciences portal",
      "status": "Required"
    }
  ],
  "CropAndHorticulturalSciences_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Crop Sciences portal",
      "status": "Required"
    }
  ],
  "CropAndHorticulturalSciences_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Crop Sciences portal",
      "status": "Required"
    }
  ],
  "CropAndHorticulturalSciences_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Crop Sciences portal",
      "status": "Required"
    }
  ],
  "SoilResourcesManagement_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Soil Resources portal",
      "status": "Required"
    }
  ],
  "SoilResourcesManagement_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Soil Resources portal",
      "status": "Required"
    }
  ],
  "SoilResourcesManagement_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Soil Resources portal",
      "status": "Required"
    }
  ],
  "SoilResourcesManagement_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Soil Resources portal",
      "status": "Required"
    }
  ],
  "SoilResourcesManagement_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Soil Resources portal",
      "status": "Required"
    }
  ],
  "AnimalScience_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Animal Science portal",
      "status": "Required"
    }
  ],
  "AnimalScience_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Animal Science portal",
      "status": "Required"
    }
  ],
  "AnimalScience_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Animal Science portal",
      "status": "Required"
    }
  ],
  "AnimalScience_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Animal Science portal",
      "status": "Required"
    }
  ],
  "AnimalScience_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Animal Science portal",
      "status": "Required"
    }
  ],
  "CropProtectionAndEnvironmentalBiology_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official CPEB portal",
      "status": "Required"
    }
  ],
  "CropProtectionAndEnvironmentalBiology_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official CPEB portal",
      "status": "Required"
    }
  ],
  "CropProtectionAndEnvironmentalBiology_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official CPEB portal",
      "status": "Required"
    }
  ],
  "CropProtectionAndEnvironmentalBiology_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official CPEB portal",
      "status": "Required"
    }
  ],
  "CropProtectionAndEnvironmentalBiology_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official CPEB portal",
      "status": "Required"
    }
  ],
  "Economics_100": [
    {
      "code": "ECO101",
      "name": "Principles of Economics I",
      "status": "Compulsory"
    },
    {
      "code": "ECO102",
      "name": "Principles of Economics II",
      "status": "Compulsory"
    },
    {
      "code": "ECO103",
      "name": "Introductory Mathematics I",
      "status": "Compulsory"
    },
    {
      "code": "ECO104",
      "name": "Introductory Mathematics II",
      "status": "Compulsory"
    }
  ],
  "Economics_200": [
    {
      "code": "ECO201",
      "name": "Principles of Economics I (Intermediate)",
      "status": "Compulsory"
    },
    {
      "code": "ECO202",
      "name": "Principles of Economics II (Intermediate)",
      "status": "Compulsory"
    },
    {
      "code": "ECO203",
      "name": "Introductory Mathematics for Economists III",
      "status": "Compulsory"
    },
    {
      "code": "ECO204",
      "name": "Introductory Mathematics for Economists IV",
      "status": "Compulsory"
    }
  ],
  "Economics_300": [
    {
      "code": "ECO301",
      "name": "Intermediate Microeconomics I",
      "status": "Compulsory"
    },
    {
      "code": "ECO302",
      "name": "Intermediate Microeconomics II",
      "status": "Compulsory"
    },
    {
      "code": "ECO303",
      "name": "Intermediate Macroeconomics I",
      "status": "Compulsory"
    },
    {
      "code": "ECO305",
      "name": "History of Economic Thought",
      "status": "Compulsory"
    },
    {
      "code": "ECO311",
      "name": "Mathematical Economics I",
      "status": "Compulsory"
    },
    {
      "code": "ECO341",
      "name": "Introductory Econometrics I",
      "status": "Compulsory"
    },
    {
      "code": "ECO343",
      "name": "Introductory Econometrics II",
      "status": "Compulsory"
    },
    {
      "code": "ECO312",
      "name": "Mathematical Economics II",
      "status": "Elective"
    },
    {
      "code": "ECO314",
      "name": "Economic Planning",
      "status": "Elective"
    },
    {
      "code": "ECO315",
      "name": "Operations Research",
      "status": "Elective"
    },
    {
      "code": "ECO321",
      "name": "Financial Economics",
      "status": "Elective"
    },
    {
      "code": "ECO351",
      "name": "Agricultural Economics",
      "status": "Elective"
    },
    {
      "code": "ECO361",
      "name": "Industrial Economics I",
      "status": "Elective"
    },
    {
      "code": "ECO362",
      "name": "Industrial Economics II",
      "status": "Elective"
    },
    {
      "code": "ECO371",
      "name": "Monetary Economics",
      "status": "Elective"
    }
  ],
  "Economics_400": [
    {
      "code": "ECO401",
      "name": "Advanced Microeconomics I",
      "status": "Compulsory"
    },
    {
      "code": "ECO402",
      "name": "Advanced Microeconomics II",
      "status": "Compulsory"
    },
    {
      "code": "ECO405",
      "name": "Advanced Macroeconomics II",
      "status": "Compulsory"
    },
    {
      "code": "ECO441",
      "name": "Advanced Econometrics I",
      "status": "Compulsory"
    },
    {
      "code": "ECO442",
      "name": "Advanced Econometrics II",
      "status": "Required"
    },
    {
      "code": "ECO411",
      "name": "Economic Development I",
      "status": "Elective"
    },
    {
      "code": "ECO414",
      "name": "Economic Development II",
      "status": "Elective"
    },
    {
      "code": "ECO451",
      "name": "Policy Analysis",
      "status": "Elective"
    },
    {
      "code": "ECO452",
      "name": "Applied Policy Seminar",
      "status": "Elective"
    },
    {
      "code": "ECO461",
      "name": "International Economics I",
      "status": "Elective"
    },
    {
      "code": "ECO471",
      "name": "International Economics II",
      "status": "Elective"
    },
    {
      "code": "ECO492",
      "name": "Research Project",
      "status": "Compulsory"
    }
  ],
  "Economics_500": [
    {
      "code": "ECO503",
      "name": "Selected Advanced Topics in Economics I",
      "status": "Compulsory"
    },
    {
      "code": "ECO581",
      "name": "Special Economic Problems",
      "status": "Compulsory"
    }
  ],
  "BankingAndFinance_100": [
    {
      "code": "AMS101",
      "name": "Principles of Management",
      "status": "Compulsory"
    },
    {
      "code": "FIN101",
      "name": "Introduction to Finance",
      "status": "Compulsory"
    },
    {
      "code": "AMS103",
      "name": "Introduction to Computers",
      "status": "Compulsory"
    },
    {
      "code": "BAF104",
      "name": "Mathematics of Finance",
      "status": "Compulsory"
    },
    {
      "code": "BAF103",
      "name": "Business Analysis",
      "status": "Required"
    },
    {
      "code": "ACC101",
      "name": "Introduction to Accounting 1",
      "status": "Required"
    },
    {
      "code": "ECO101",
      "name": "Principles of Economics I",
      "status": "Required"
    },
    {
      "code": "AMS102",
      "name": "Basic Mathematics for FEMS",
      "status": "Compulsory"
    },
    {
      "code": "GST111",
      "name": "Communication in English",
      "status": "Compulsory"
    }
  ],
  "BankingAndFinance_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official BAF portal",
      "status": "Required"
    }
  ],
  "BankingAndFinance_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official BAF portal",
      "status": "Required"
    }
  ],
  "BankingAndFinance_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official BAF portal",
      "status": "Required"
    }
  ],
  "Accounting_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Accounting portal",
      "status": "Required"
    }
  ],
  "Accounting_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Accounting portal",
      "status": "Required"
    }
  ],
  "Accounting_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Accounting portal",
      "status": "Required"
    }
  ],
  "Accounting_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Accounting portal",
      "status": "Required"
    }
  ],
  "MarketingAndConsumerStudies_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Marketing portal",
      "status": "Required"
    }
  ],
  "MarketingAndConsumerStudies_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Marketing portal",
      "status": "Required"
    }
  ],
  "MarketingAndConsumerStudies_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Marketing portal",
      "status": "Required"
    }
  ],
  "MarketingAndConsumerStudies_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Marketing portal",
      "status": "Required"
    }
  ],
  "AdultEducation_100": [
    {
      "code": "UI-CEF102",
      "name": "Introduction to History and Policy of Education",
      "status": "Compulsory"
    },
    {
      "code": "UI-GCE106",
      "name": "Psychological Foundations of Education",
      "status": "Compulsory"
    }
  ],
  "AdultEducation_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "AdultEducation_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "AdultEducation_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "BusinessEducation_100": [
    {
      "code": "UI-CEF102",
      "name": "Introduction to History and Policy of Education",
      "status": "Compulsory"
    },
    {
      "code": "UI-GCE106",
      "name": "Psychological Foundations of Education",
      "status": "Compulsory"
    }
  ],
  "BusinessEducation_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "BusinessEducation_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "BusinessEducation_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "EarlyChildhoodEducation_100": [
    {
      "code": "UI-CEF102",
      "name": "Introduction to History and Policy of Education",
      "status": "Compulsory"
    },
    {
      "code": "UI-GCE106",
      "name": "Psychological Foundations of Education",
      "status": "Compulsory"
    }
  ],
  "EarlyChildhoodEducation_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "EarlyChildhoodEducation_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "EarlyChildhoodEducation_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "EducationalTechnology_100": [
    {
      "code": "UI-CEF102",
      "name": "Introduction to History and Policy of Education",
      "status": "Compulsory"
    },
    {
      "code": "UI-GCE106",
      "name": "Psychological Foundations of Education",
      "status": "Compulsory"
    }
  ],
  "EducationalTechnology_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "EducationalTechnology_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "EducationalTechnology_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "EducationalManagement_100": [
    {
      "code": "UI-CEF102",
      "name": "Introduction to History and Policy of Education",
      "status": "Compulsory"
    },
    {
      "code": "UI-GCE106",
      "name": "Psychological Foundations of Education",
      "status": "Compulsory"
    }
  ],
  "EducationalManagement_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "EducationalManagement_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "EducationalManagement_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "GuidanceAndCounselling_100": [
    {
      "code": "UI-CEF102",
      "name": "Introduction to History and Policy of Education",
      "status": "Compulsory"
    },
    {
      "code": "UI-GCE106",
      "name": "Psychological Foundations of Education",
      "status": "Compulsory"
    }
  ],
  "GuidanceAndCounselling_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "GuidanceAndCounselling_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "GuidanceAndCounselling_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "HealthEducation_100": [
    {
      "code": "UI-CEF102",
      "name": "Introduction to History and Policy of Education",
      "status": "Compulsory"
    },
    {
      "code": "UI-GCE106",
      "name": "Psychological Foundations of Education",
      "status": "Compulsory"
    }
  ],
  "HealthEducation_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "HealthEducation_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "HealthEducation_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "HumanKinetics_100": [
    {
      "code": "UI-CEF102",
      "name": "Introduction to History and Policy of Education",
      "status": "Compulsory"
    },
    {
      "code": "UI-GCE106",
      "name": "Psychological Foundations of Education",
      "status": "Compulsory"
    }
  ],
  "HumanKinetics_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "HumanKinetics_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "HumanKinetics_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "LibraryArchivalAndInformationStudies_100": [
    {
      "code": "UI-CEF102",
      "name": "Introduction to History and Policy of Education",
      "status": "Compulsory"
    },
    {
      "code": "UI-GCE106",
      "name": "Psychological Foundations of Education",
      "status": "Compulsory"
    }
  ],
  "LibraryArchivalAndInformationStudies_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "LibraryArchivalAndInformationStudies_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "LibraryArchivalAndInformationStudies_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "SpecialEducation_100": [
    {
      "code": "UI-CEF102",
      "name": "Introduction to History and Policy of Education",
      "status": "Compulsory"
    },
    {
      "code": "UI-GCE106",
      "name": "Psychological Foundations of Education",
      "status": "Compulsory"
    }
  ],
  "SpecialEducation_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "SpecialEducation_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "SpecialEducation_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Education portal",
      "status": "Required"
    }
  ],
  "Architecture_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Environmental Design portal",
      "status": "Required"
    }
  ],
  "Architecture_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Environmental Design portal",
      "status": "Required"
    }
  ],
  "Architecture_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Environmental Design portal",
      "status": "Required"
    }
  ],
  "Architecture_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Environmental Design portal",
      "status": "Required"
    }
  ],
  "EstateManagement_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Environmental Design portal",
      "status": "Required"
    }
  ],
  "EstateManagement_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Environmental Design portal",
      "status": "Required"
    }
  ],
  "EstateManagement_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Environmental Design portal",
      "status": "Required"
    }
  ],
  "EstateManagement_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Environmental Design portal",
      "status": "Required"
    }
  ],
  "UrbanAndRegionalPlanning_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Environmental Design portal",
      "status": "Required"
    }
  ],
  "UrbanAndRegionalPlanning_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Environmental Design portal",
      "status": "Required"
    }
  ],
  "UrbanAndRegionalPlanning_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Environmental Design portal",
      "status": "Required"
    }
  ],
  "UrbanAndRegionalPlanning_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Environmental Design portal",
      "status": "Required"
    }
  ],
  "QuantitySurveying_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Environmental Design portal",
      "status": "Required"
    }
  ],
  "QuantitySurveying_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Environmental Design portal",
      "status": "Required"
    }
  ],
  "QuantitySurveying_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Environmental Design portal",
      "status": "Required"
    }
  ],
  "QuantitySurveying_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Environmental Design portal",
      "status": "Required"
    }
  ],
  "Law_100": [
    {
      "code": "LAW101",
      "name": "Legal Methods I",
      "status": "Compulsory"
    },
    {
      "code": "LAW102",
      "name": "Legal Methods II",
      "status": "Compulsory"
    }
  ],
  "Law_200": [
    {
      "code": "LAW201",
      "name": "Nigerian Legal System I",
      "status": "Compulsory"
    },
    {
      "code": "LAW202",
      "name": "Nigerian Legal System II",
      "status": "Compulsory"
    },
    {
      "code": "LAW211",
      "name": "Constitutional Law I",
      "status": "Compulsory"
    },
    {
      "code": "LAW212",
      "name": "Constitutional Law II",
      "status": "Compulsory"
    },
    {
      "code": "LAW241",
      "name": "Law of Contract I",
      "status": "Compulsory"
    },
    {
      "code": "LAW242",
      "name": "Law of Contract II",
      "status": "Compulsory"
    }
  ],
  "Law_300": [
    {
      "code": "LAW301",
      "name": "Criminal Law I",
      "status": "Compulsory"
    },
    {
      "code": "LAW302",
      "name": "Criminal Law II",
      "status": "Compulsory"
    },
    {
      "code": "LAW311",
      "name": "Law of Tort I",
      "status": "Compulsory"
    },
    {
      "code": "LAW312",
      "name": "Law of Tort II",
      "status": "Compulsory"
    },
    {
      "code": "LAW341",
      "name": "Law of Commercial Transactions I",
      "status": "Compulsory"
    },
    {
      "code": "LAW342",
      "name": "Law of Commercial Transactions II",
      "status": "Compulsory"
    }
  ],
  "Law_400": [
    {
      "code": "LAW401",
      "name": "Land Law I",
      "status": "Compulsory"
    },
    {
      "code": "LAW402",
      "name": "Land Law II",
      "status": "Compulsory"
    },
    {
      "code": "LAW411",
      "name": "Law of Equity and Trust I",
      "status": "Compulsory"
    },
    {
      "code": "LAW412",
      "name": "Law of Equity and Trust II",
      "status": "Compulsory"
    },
    {
      "code": "LAW441",
      "name": "Company Law I",
      "status": "Compulsory"
    },
    {
      "code": "LAW442",
      "name": "Company Law II",
      "status": "Compulsory"
    }
  ],
  "Law_500": [
    {
      "code": "LAW501",
      "name": "Law of Evidence I",
      "status": "Compulsory"
    },
    {
      "code": "LAW502",
      "name": "Law of Evidence II",
      "status": "Compulsory"
    },
    {
      "code": "LAW511",
      "name": "Jurisprudence I",
      "status": "Compulsory"
    },
    {
      "code": "LAW512",
      "name": "Jurisprudence II",
      "status": "Compulsory"
    },
    {
      "code": "LAW599",
      "name": "Undergraduate Law Essay",
      "status": "Compulsory"
    }
  ],
  "Pharmacy_100": [
    {
      "code": "CHE126",
      "name": "Inorganic Chemistry I",
      "status": "Required"
    },
    {
      "code": "MAT101",
      "name": "Mathematics for Pharmacy",
      "status": "Required"
    },
    {
      "code": "PHY102",
      "name": "Physics 102",
      "status": "Required"
    },
    {
      "code": "PHY103",
      "name": "Physics 103",
      "status": "Required"
    },
    {
      "code": "PHY105",
      "name": "Physics 105",
      "status": "Required"
    },
    {
      "code": "PHY118",
      "name": "Experimental Physics I",
      "status": "Required"
    },
    {
      "code": "ZOO112",
      "name": "The Mammalian Body",
      "status": "Required"
    },
    {
      "code": "ZOO114",
      "name": "Principles of Cell Biology and Genetics",
      "status": "Required"
    },
    {
      "code": "ZOO115",
      "name": "Introductory Ecology",
      "status": "Required"
    },
    {
      "code": "ZOO118",
      "name": "Experimental Zoology",
      "status": "Required"
    }
  ],
  "Pharmacy_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Pharmacy portal",
      "status": "Required"
    }
  ],
  "Pharmacy_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Pharmacy portal",
      "status": "Required"
    }
  ],
  "Pharmacy_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Pharmacy portal",
      "status": "Required"
    }
  ],
  "Pharmacy_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Pharmacy portal",
      "status": "Required"
    }
  ],
  "AquacultureAndFisheriesManagement_100": [
    {
      "code": "SEF110",
      "name": "Mathematics in Agriculture",
      "status": "Compulsory"
    }
  ],
  "AquacultureAndFisheriesManagement_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official AFM portal",
      "status": "Required"
    }
  ],
  "AquacultureAndFisheriesManagement_300": [
    {
      "code": "AFM321",
      "name": "Elementary Seamanship and Navigation",
      "status": "Required"
    },
    {
      "code": "AFM318",
      "name": "Introduction to Fisheries Biometrics",
      "status": "Required"
    },
    {
      "code": "AFM323",
      "name": "Fish Pond Construction and Management",
      "status": "Required"
    }
  ],
  "AquacultureAndFisheriesManagement_400": [
    {
      "code": "AFM424",
      "name": "Oceanography Techniques",
      "status": "Required"
    },
    {
      "code": "AFM426",
      "name": "Techniques in Fish Processing and Utilization",
      "status": "Required"
    },
    {
      "code": "AFM427",
      "name": "Pond Construction and Management",
      "status": "Required"
    },
    {
      "code": "AFM428",
      "name": "Aquaculture Engineering and Pond Management",
      "status": "Required"
    }
  ],
  "AquacultureAndFisheriesManagement_500": [
    {
      "code": "AFM513",
      "name": "Advanced Fish Nutrition and Feed Technology",
      "status": "Required"
    },
    {
      "code": "AFM516",
      "name": "Fish Processing Technology and Quality Assurance",
      "status": "Required"
    },
    {
      "code": "AFM520",
      "name": "Fish Farming Engineering",
      "status": "Required"
    }
  ],
  "ForestProductionAndProducts_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Renewable portal",
      "status": "Required"
    }
  ],
  "ForestProductionAndProducts_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Renewable portal",
      "status": "Required"
    }
  ],
  "ForestProductionAndProducts_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Renewable portal",
      "status": "Required"
    }
  ],
  "ForestProductionAndProducts_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Renewable portal",
      "status": "Required"
    }
  ],
  "ForestProductionAndProducts_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Renewable portal",
      "status": "Required"
    }
  ],
  "WildlifeAndEcotourismManagement_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Renewable portal",
      "status": "Required"
    }
  ],
  "WildlifeAndEcotourismManagement_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Renewable portal",
      "status": "Required"
    }
  ],
  "WildlifeAndEcotourismManagement_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Renewable portal",
      "status": "Required"
    }
  ],
  "WildlifeAndEcotourismManagement_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Renewable portal",
      "status": "Required"
    }
  ],
  "WildlifeAndEcotourismManagement_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Renewable portal",
      "status": "Required"
    }
  ],
  "SocialAndEnvironmentalForestry_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Renewable portal",
      "status": "Required"
    }
  ],
  "SocialAndEnvironmentalForestry_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Renewable portal",
      "status": "Required"
    }
  ],
  "SocialAndEnvironmentalForestry_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Renewable portal",
      "status": "Required"
    }
  ],
  "SocialAndEnvironmentalForestry_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Renewable portal",
      "status": "Required"
    }
  ],
  "SocialAndEnvironmentalForestry_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Renewable portal",
      "status": "Required"
    }
  ],
  "VeterinaryMedicine_100": [
    {
      "code": "FVM111",
      "name": "Introduction to Veterinary Medicine",
      "status": "Compulsory"
    }
  ],
  "VeterinaryMedicine_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Vet Medicine portal",
      "status": "Required"
    }
  ],
  "VeterinaryMedicine_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Vet Medicine portal",
      "status": "Required"
    }
  ],
  "VeterinaryMedicine_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Vet Medicine portal",
      "status": "Required"
    }
  ],
  "VeterinaryMedicine_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Vet Medicine portal",
      "status": "Required"
    }
  ],
  "Biochemistry_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Biochem portal",
      "status": "Required"
    }
  ],
  "Biochemistry_200": [
    {
      "code": "BCH201",
      "name": "General Biochemistry I",
      "status": "Required"
    },
    {
      "code": "BCH202",
      "name": "General Biochemistry II",
      "status": "Required"
    }
  ],
  "Biochemistry_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Biochem portal",
      "status": "Required"
    }
  ],
  "Biochemistry_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from official Biochem portal",
      "status": "Required"
    }
  ],
  "Dentistry_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "Dentistry_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "Dentistry_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "Dentistry_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "Dentistry_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "EnvironmentalHealthScience_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "EnvironmentalHealthScience_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "EnvironmentalHealthScience_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "EnvironmentalHealthScience_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "HumanNutritionAndDietetics_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "HumanNutritionAndDietetics_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "HumanNutritionAndDietetics_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "HumanNutritionAndDietetics_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "MedicalLaboratoryScience_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "MedicalLaboratoryScience_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "MedicalLaboratoryScience_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "MedicalLaboratoryScience_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "MedicalLaboratoryScience_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "MedicineAndSurgery_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "MedicineAndSurgery_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "MedicineAndSurgery_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "MedicineAndSurgery_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "MedicineAndSurgery_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "NursingScience_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "NursingScience_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "NursingScience_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "NursingScience_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "NursingScience_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "Physiology_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "Physiology_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "Physiology_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "Physiology_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "Physiotherapy_100": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "Physiotherapy_200": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "Physiotherapy_300": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "Physiotherapy_400": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ],
  "Physiotherapy_500": [
    {
      "code": "UNVERIFIED",
      "name": "Requires manual verification from College of Medicine portal",
      "status": "Required"
    }
  ]
};
