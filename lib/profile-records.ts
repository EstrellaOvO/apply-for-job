export type EducationRecord = {
  id: string;
  school_name: string;
  college_name: string;
  major_name: string;
  degree: string;
  start_date: string;
  end_date: string;
  ranking: string;
  full_time: boolean;
  laboratory_level: string;
  laboratory_name: string;
  advisor: string;
  research_direction: string;
};

export type LanguageRecord = {
  id: string;
  language_type: string;
  proficiency: string;
  exam_name: string;
  score: string;
};

export type InternshipRecord = {
  id: string;
  company_name: string;
  department_name: string;
  position: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
};

export type ProjectRecord = {
  id: string;
  project_name: string;
  role: 'Agent开发';
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
};

export type ProfileDetails = {
  education: EducationRecord[];
  languages: LanguageRecord[];
  internships: InternshipRecord[];
  projects: ProjectRecord[];
};

export const emptyEducation = (): EducationRecord => ({
  id: crypto.randomUUID(), school_name: '', college_name: '', major_name: '', degree: '',
  start_date: '', end_date: '', ranking: '', full_time: true, laboratory_level: '',
  laboratory_name: '', advisor: '', research_direction: '',
});

export const emptyLanguage = (): LanguageRecord => ({
  id: crypto.randomUUID(), language_type: '', proficiency: '', exam_name: '', score: '',
});

export const emptyInternship = (): InternshipRecord => ({
  id: crypto.randomUUID(), company_name: '', department_name: '', position: '',
  start_date: '', end_date: '', is_current: false, description: '',
});

export const emptyProject = (): ProjectRecord => ({
  id: crypto.randomUUID(), project_name: '', role: 'Agent开发', start_date: '',
  end_date: '', is_current: false, description: '',
});
