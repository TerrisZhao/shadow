import type { InferSelectModel } from "drizzle-orm";

import { eq } from "drizzle-orm";
import { Mail, Phone, MapPin, Linkedin, Github, Globe } from "lucide-react";

import { ResumeData } from "@/types/resume";
import { db } from "@/lib/db/drizzle";
import {
  resumes,
  resumeWorkExperiences,
  resumeEducation,
  resumeProjects,
} from "@/lib/db/schema";
import { Language, getResumeTranslation } from "@/lib/resume-i18n";

type WorkExperience = InferSelectModel<typeof resumeWorkExperiences>;
type Education = InferSelectModel<typeof resumeEducation>;
type Project = InferSelectModel<typeof resumeProjects>;

interface ResumePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ themeColor?: string; language?: string }>;
}

async function getResumeData(
  id: string,
): Promise<(ResumeData & { name?: string }) | null> {
  try {
    const resumeId = Number(id);

    if (isNaN(resumeId)) {
      console.error("Invalid resume ID:", id);

      return null;
    }

    // Query database directly (no authentication needed for print page)
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, resumeId));

    if (!resume) {
      console.error("Resume not found:", resumeId);

      return null;
    }

    // Get work experience
    const workExperience = await db
      .select()
      .from(resumeWorkExperiences)
      .where(eq(resumeWorkExperiences.resumeId, resumeId))
      .orderBy(resumeWorkExperiences.order);

    // Get education
    const education = await db
      .select()
      .from(resumeEducation)
      .where(eq(resumeEducation.resumeId, resumeId))
      .orderBy(resumeEducation.order);

    // Get projects
    const projects = await db
      .select()
      .from(resumeProjects)
      .where(eq(resumeProjects.resumeId, resumeId))
      .orderBy(resumeProjects.order);

    // Transform database data to ResumeData format
    return {
      name: resume.name,
      fullName: resume.fullName || "",
      preferredName: resume.preferredName || "",
      phone: resume.phone || "",
      email: resume.email || "",
      location: resume.location || "",
      linkedin: resume.linkedin || "",
      github: resume.github || "",
      website: resume.website || "",
      summary: resume.summary || "",
      keySkills: resume.keySkills || [],
      workExperience: workExperience.map((exp: WorkExperience) => ({
        id: exp.id.toString(),
        company: exp.company,
        position: exp.position,
        startDate: exp.startDate,
        endDate: exp.endDate || undefined,
        current: exp.current,
        responsibilities: exp.responsibilities,
      })),
      education: education.map((edu: Education) => ({
        id: edu.id.toString(),
        school: edu.school,
        degree: edu.degree,
        major: edu.major,
        startDate: edu.startDate,
        endDate: edu.endDate || undefined,
        current: edu.current,
        gpa: edu.gpa || undefined,
      })),
      projects: projects.map((proj: Project) => ({
        id: proj.id.toString(),
        name: proj.name,
        role: proj.role,
        startDate: proj.startDate,
        endDate: proj.endDate || undefined,
        current: proj.current,
        description: proj.description,
        technologies: proj.technologies,
      })),
      additionalInfo: resume.additionalInfo || "",
      themeColor: resume.themeColor || "#000000",
    };
  } catch (error) {
    console.error("Error fetching resume from database:", error);

    return null;
  }
}

export default async function PrintResumePage({
  params,
  searchParams,
}: ResumePageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const resumeData = await getResumeData(resolvedParams.id);

  if (!resumeData) {
    return (
      <html lang="en">
        <head>
          <title>Resume Not Found</title>
        </head>
        <body>
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <h1>Resume not found</h1>
          </div>
        </body>
      </html>
    );
  }

  const themeColor =
    resolvedSearchParams.themeColor || resumeData.themeColor || "#000000";
  const language =
    (resolvedSearchParams.language as Language) || "en";
  const t = getResumeTranslation(language);

  return (
    <html lang={language === "zh" ? "zh-CN" : "en"}>
      <head>
        <title>{`${resumeData.fullName || "Resume"} - Resume`}</title>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          html {
            background: white !important;
          }

          body {
            font-family: ${language === "zh"
              ? "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'SimHei', sans-serif"
              : "-apple-system, BlinkMacSystemFont, 'Noto Sans', 'Inter', 'Segoe UI', 'Roboto', sans-serif"};
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background: white !important;
            color: #000 !important;
            line-height: 1.5;
          }

          /* Wait for fonts to load */
          body {
            opacity: 0;
            animation: fadeIn 0.1s ease-in 0.3s forwards;
          }

          @keyframes fadeIn {
            to { opacity: 1; }
          }

          .resume-container {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 0 auto;
            background: white;
            border: none;
            box-shadow: none;
          }

          /* Print styles */
          @media print {
            html {
              background: white !important;
            }

            body {
              margin: 0;
              padding: 0;
              opacity: 1 !important;
              background: white !important;
              color: #000 !important;
            }

            .resume-container {
              width: 100%;
              min-height: auto;
              padding: 0;
              margin: 0;
              border: none;
              box-shadow: none;
            }

            @page {
              size: A4;
              margin: 16mm;
              background: white;
            }
          }

          /* Header */
          .header {
            margin-bottom: 24px;
          }

          .name {
            font-size: 24px;
            font-weight: 700;
            color: ${themeColor};
            margin-bottom: 8px;
            line-height: 1.2;
          }

          .preferred-name {
            font-size: 16px;
            font-weight: 400;
            color: #4b5563;
            margin-left: 8px;
          }

          .contact-info {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 16px;
            font-size: 12px;
            color: #374151;
          }

          .contact-item {
            display: flex;
            align-items: center;
            gap: 2px;
          }

          .contact-icon {
            color: ${themeColor};
            flex-shrink: 0;
          }

          /* Section */
          .section {
            margin-bottom: 20px;
          }

          .section-title {
            font-size: 14px;
            font-weight: 700;
            color: ${themeColor};
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 2px solid ${themeColor};
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .section-content {
            font-size: 11px;
            color: #1f2937;
            line-height: 1.6;
          }

          /* Skills */
          .skills-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px 8px;
          }

          .skill-item::after {
            content: ' •';
            margin-left: 4px;
            color: #9ca3af;
          }

          .skill-item:last-child::after {
            content: '';
          }

          /* Experience / Education / Projects */
          .entry {
            margin-bottom: 16px;
          }

          .entry:last-child {
            margin-bottom: 0;
          }

          .entry-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 4px;
            gap: 16px;
          }

          .entry-title {
            font-size: 12px;
            font-weight: 700;
            color: ${themeColor};
            line-height: 1.3;
          }

          .entry-subtitle {
            font-size: 11px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 4px;
          }

          .entry-date {
            font-size: 11px;
            color: #6b7280;
            white-space: nowrap;
            flex-shrink: 0;
          }

          .entry-description {
            font-size: 11px;
            color: #4b5563;
            margin-bottom: 4px;
          }

          /* Responsibilities / Bullet points */
          .responsibilities {
            list-style-type: disc;
            list-style-position: outside;
            padding-left: 20px;
            margin-top: 6px;
          }

          .responsibilities li {
            font-size: 11px;
            color: #1f2937;
            margin-bottom: 4px;
            line-height: 1.5;
          }

          /* Technologies */
          .technologies {
            font-size: 11px;
            color: #4b5563;
            margin-top: 6px;
          }

          .technologies strong {
            font-weight: 600;
            color: #1f2937;
          }

          /* Whitespace */
          .whitespace-pre-line {
            white-space: pre-line;
          }
        `,
          }}
        />
      </head>
      <body>
        <div className="resume-container">
          {/* Header */}
          <div className="header">
            <h1 className="name">
              {resumeData.fullName || "Your Name"}
              {resumeData.preferredName && (
                <span className="preferred-name">
                  ({resumeData.preferredName})
                </span>
              )}
            </h1>
            <div className="contact-info">
              {resumeData.email && (
                <div className="contact-item">
                  <Mail className="contact-icon" size={14} />
                  <span>{resumeData.email}</span>
                </div>
              )}
              {resumeData.phone && (
                <div className="contact-item">
                  <Phone className="contact-icon" size={14} />
                  <span>{resumeData.phone}</span>
                </div>
              )}
              {resumeData.location && (
                <div className="contact-item">
                  <MapPin className="contact-icon" size={14} />
                  <span>{resumeData.location}</span>
                </div>
              )}
              {resumeData.linkedin && (
                <div className="contact-item">
                  <Linkedin className="contact-icon" size={14} />
                  <span>{resumeData.linkedin}</span>
                </div>
              )}
              {resumeData.github && (
                <div className="contact-item">
                  <Github className="contact-icon" size={14} />
                  <span>{resumeData.github}</span>
                </div>
              )}
              {resumeData.website && (
                <div className="contact-item">
                  <Globe className="contact-icon" size={14} />
                  <span>{resumeData.website}</span>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {resumeData.summary && (
            <div className="section">
              <h2 className="section-title">{t.summary}</h2>
              <div className="section-content">{resumeData.summary}</div>
            </div>
          )}

          {/* Key Skills */}
          {resumeData.keySkills.length > 0 && (
            <div className="section">
              <h2 className="section-title">{t.keySkills}</h2>
              <div className="section-content">
                {typeof resumeData.keySkills[0] === "string" ? (
                  // Simple list format
                  <div className="skills-list">
                    {(resumeData.keySkills as string[]).map((skill, index) => (
                      <span key={index} className="skill-item">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  // Grouped format
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {(resumeData.keySkills as any[]).map(
                      (group, groupIndex) => (
                        <div key={groupIndex} style={{ fontSize: "11px" }}>
                          <span style={{ fontWeight: 600, color: themeColor }}>
                            {group.groupName}:
                          </span>{" "}
                          {group.skills.join(" • ")}
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Work Experience */}
          {resumeData.workExperience.length > 0 && (
            <div className="section">
              <h2 className="section-title">{t.workExperience}</h2>
              <div className="section-content">
                {resumeData.workExperience.map((exp) => (
                  <div key={exp.id} className="entry">
                    <div className="entry-header">
                      <div>
                        <div className="entry-title">
                          {exp.position || "Position"}
                        </div>
                        <div className="entry-subtitle">
                          {exp.company || "Company"}
                        </div>
                      </div>
                      <div className="entry-date">
                        {exp.startDate} -{" "}
                        {exp.current ? t.present : exp.endDate || "End Date"}
                      </div>
                    </div>
                    {exp.responsibilities.filter((r) => r.trim()).length >
                      0 && (
                      <ul className="responsibilities">
                        {exp.responsibilities
                          .filter((resp) => resp.trim())
                          .map((resp, index) => (
                            <li key={index}>{resp}</li>
                          ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {resumeData.education.length > 0 && (
            <div className="section">
              <h2 className="section-title">{t.education}</h2>
              <div className="section-content">
                {resumeData.education.map((edu) => (
                  <div key={edu.id} className="entry">
                    <div className="entry-header">
                      <div>
                        <div className="entry-title">
                          {edu.school || "School"}
                        </div>
                        <div className="entry-subtitle">
                          {edu.degree || "Degree"}
                          {edu.major && ` ${t.in} ${edu.major}`}
                          {edu.gpa && ` - ${t.gpa}: ${edu.gpa}`}
                        </div>
                      </div>
                      <div className="entry-date">
                        {edu.startDate} -{" "}
                        {edu.current ? t.present : edu.endDate || "End Date"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {resumeData.projects.length > 0 && (
            <div className="section">
              <h2 className="section-title">{t.projects}</h2>
              <div className="section-content">
                {resumeData.projects.map((proj) => (
                  <div key={proj.id} className="entry">
                    <div className="entry-header">
                      <div>
                        <div className="entry-title">
                          {proj.name || "Project Name"}
                        </div>
                        <div className="entry-subtitle">
                          {proj.role || "Role"}
                        </div>
                      </div>
                      <div className="entry-date">
                        {proj.startDate} -{" "}
                        {proj.current ? t.present : proj.endDate || "End Date"}
                      </div>
                    </div>
                    {proj.description && (
                      <div className="entry-description">
                        {proj.description}
                      </div>
                    )}
                    {proj.technologies.length > 0 && (
                      <div className="technologies">
                        <strong>{t.technologies}:</strong>{" "}
                        {proj.technologies.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Information */}
          {resumeData.additionalInfo && (
            <div className="section">
              <h2 className="section-title">{t.additionalInfo}</h2>
              <div className="section-content whitespace-pre-line">
                {resumeData.additionalInfo}
              </div>
            </div>
          )}
        </div>

        {/* Font loading detection script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function() {
            console.log('Print page script loaded');

            function setReady() {
              console.log('Setting data-ready attribute');
              document.body.setAttribute('data-ready', 'true');
            }

            // Try multiple strategies to ensure data-ready is set

            // Strategy 1: Wait for fonts (preferred)
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(function() {
                console.log('Fonts loaded via fonts.ready');
                setReady();
              }).catch(function(err) {
                console.error('Fonts.ready error:', err);
                setReady(); // Set anyway
              });
            } else {
              console.log('document.fonts not available');
            }

            // Strategy 2: Set on window load (backup)
            window.addEventListener('load', function() {
              console.log('Window load event fired');
              setTimeout(setReady, 300);
            });

            // Strategy 3: Set immediately if fonts already loaded
            if (document.readyState === 'complete') {
              console.log('Document already complete');
              setTimeout(setReady, 500);
            }

            // Strategy 4: Fallback timeout (emergency)
            setTimeout(function() {
              if (document.body.getAttribute('data-ready') !== 'true') {
                console.log('Fallback timeout, forcing ready');
                setReady();
              }
            }, 2000);
          })();
        `,
          }}
        />
      </body>
    </html>
  );
}
