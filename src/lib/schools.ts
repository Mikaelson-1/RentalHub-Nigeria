export interface SchoolOption {
  value: string;
  label: string;
}

export const SCHOOL_OPTIONS: SchoolOption[] = [
  { value: "BOUESTI - Ikere-Ekiti", label: "BOUESTI - Ikere-Ekiti" },
  { value: "University of Lagos (UNILAG)", label: "University of Lagos (UNILAG)" },
  { value: "Obafemi Awolowo University (OAU)", label: "Obafemi Awolowo University (OAU)" },
  { value: "University of Ibadan (UI)", label: "University of Ibadan (UI)" },
  { value: "University of Benin (UNIBEN)", label: "University of Benin (UNIBEN)" },
  { value: "Federal University of Technology Akure (FUTA)", label: "Federal University of Technology Akure (FUTA)" },
  { value: "University of Ilorin (UNILORIN)", label: "University of Ilorin (UNILORIN)" },
  { value: "Ahmadu Bello University (ABU)", label: "Ahmadu Bello University (ABU)" },
  { value: "University of Nigeria Nsukka (UNN)", label: "University of Nigeria Nsukka (UNN)" },
  { value: "Covenant University", label: "Covenant University" },
];

export const SCHOOL_LOCATION_KEYWORDS: Record<string, string[]> = {
  "BOUESTI - Ikere-Ekiti": ["Ikere", "Uro", "Odo Oja", "Afao", "Olumilua", "Ajebandele", "Ikoyi Estate", "Amoye", "Oke 'Kere"],
  "University of Lagos (UNILAG)": ["Akoka", "Yaba", "Bariga", "Surulere"],
  "Obafemi Awolowo University (OAU)": ["Ile-Ife", "Modakeke"],
  "University of Ibadan (UI)": ["Ibadan", "Bodija", "Agbowo", "Sango"],
  "University of Benin (UNIBEN)": ["Benin", "Ugbowo", "Ekosodin"],
  "Federal University of Technology Akure (FUTA)": ["Akure", "Oba-Ile", "Aule"],
  "University of Ilorin (UNILORIN)": ["Ilorin", "Tanke", "Oke-Odo"],
  "Ahmadu Bello University (ABU)": ["Zaria", "Samaru", "Kongo"],
  "University of Nigeria Nsukka (UNN)": ["Nsukka", "Odenigwe"],
  "Covenant University": ["Ota", "Canaanland", "Iyana-Iyesi"],
};
