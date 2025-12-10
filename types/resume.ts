// Resume data types
export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string; // Optional for current position
  current?: boolean;
  description?: string; // Overall description of the company or role
  responsibilities: string[];
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  gpa?: string;
}

export interface Project {
  id: string;
  name: string;
  role: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description: string;
  technologies: string[];
}

export interface SkillGroup {
  id: string;
  groupName: string;
  skills: string[];
}

export interface ResumeData {
  // Personal Info
  fullName: string;
  preferredName?: string;
  phone: string;
  email: string;
  location: string;
  linkedin?: string;
  github?: string;
  website?: string;

  // Summary
  summary: string;

  // Key Skills
  keySkills: string[] | SkillGroup[];

  // Work Experience
  workExperience: WorkExperience[];

  // Education
  education: Education[];

  // Projects
  projects: Project[];

  // Additional Information
  additionalInfo?: string;

  // Theme Color
  themeColor?: string;
}
