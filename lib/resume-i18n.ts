export type Language = "en" | "zh";

export const resumeTranslations = {
  en: {
    summary: "Summary",
    keySkills: "KEY SKILLS",
    workExperience: "WORK EXPERIENCE",
    education: "EDUCATION",
    projects: "PROJECTS",
    additionalInfo: "ADDITIONAL INFORMATION",
    present: "Present",
    technologies: "Technologies",
    gpa: "GPA",
    in: "in",
  },
  zh: {
    summary: "个人简介",
    keySkills: "核心技能",
    workExperience: "工作经历",
    education: "教育背景",
    projects: "项目经历",
    additionalInfo: "附加信息",
    present: "至今",
    technologies: "技术栈",
    gpa: "GPA",
    in: "专业",
  },
};

export function getResumeTranslation(language: Language) {
  return resumeTranslations[language] || resumeTranslations.en;
}
