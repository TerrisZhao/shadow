import React from "react";
import { Mail, Phone, MapPin, Linkedin, Github, Globe } from "lucide-react";

import { ResumeData } from "@/types/resume";
import { Language, getResumeTranslation } from "@/lib/resume-i18n";

interface ResumePreviewProps {
  data: ResumeData;
  themeColor?: string;
  language?: Language;
}

export const ResumePreview: React.FC<ResumePreviewProps> = ({
  data,
  themeColor = "#000000",
  language = "en",
}) => {
  const t = getResumeTranslation(language);
  const fontFamily = language === "zh"
    ? "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'SimHei', sans-serif"
    : "-apple-system, BlinkMacSystemFont, 'Noto Sans', 'Inter', 'Segoe UI', 'Roboto', 'Arial', sans-serif";

  return (
    <div
      className="bg-white text-black p-8 mx-auto"
      id="resume-preview"
      style={{
        fontFamily,
        backgroundColor: "#ffffff",
        color: "#000000",
        padding: "2rem",
        width: "210mm",
        maxWidth: "100%",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ color: themeColor }}>
          {data.fullName || "Your Name"}
          {data.preferredName && (
            <span className="text-xl font-normal ml-2 text-gray-700">
              ({data.preferredName})
            </span>
          )}
        </h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
          {data.email && (
            <div className="flex items-center gap-1">
              <Mail size={14} style={{ color: themeColor }} />
              <span>{data.email}</span>
            </div>
          )}
          {data.phone && (
            <div className="flex items-center gap-1">
              <Phone size={14} style={{ color: themeColor }} />
              <span>{data.phone}</span>
            </div>
          )}
          {data.location && (
            <div className="flex items-center gap-1">
              <MapPin size={14} style={{ color: themeColor }} />
              <span>{data.location}</span>
            </div>
          )}
          {data.linkedin && (
            <div className="flex items-center gap-1">
              <Linkedin size={14} style={{ color: themeColor }} />
              <span>{data.linkedin}</span>
            </div>
          )}
          {data.github && (
            <div className="flex items-center gap-1">
              <Github size={14} style={{ color: themeColor }} />
              <span>{data.github}</span>
            </div>
          )}
          {data.website && (
            <div className="flex items-center gap-1">
              <Globe size={14} style={{ color: themeColor }} />
              <span>{data.website}</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <div className="mb-6">
          <h2
            className="text-xl font-bold mb-2 pb-1 border-b-2"
            style={{ color: themeColor, borderColor: themeColor }}
          >
            {t.summary}
          </h2>
          <p className="text-sm leading-relaxed text-gray-800">
            {data.summary}
          </p>
        </div>
      )}

      {/* Key Skills */}
      {data.keySkills.length > 0 && (
        <div className="mb-6">
          <h2
            className="text-xl font-bold mb-2 pb-1 border-b-2"
            style={{ color: themeColor, borderColor: themeColor }}
          >
            {t.keySkills}
          </h2>
          {typeof data.keySkills[0] === "string" ? (
            // Simple list format
            <div className="flex flex-wrap gap-2">
              {(data.keySkills as string[]).map((skill, index) => (
                <span key={index} className="text-sm">
                  {skill}
                  {index < data.keySkills.length - 1 && " •"}
                </span>
              ))}
            </div>
          ) : (
            // Grouped format
            <div className="space-y-2">
              {(data.keySkills as any[]).map((group, groupIndex) => (
                <div key={groupIndex} className="text-sm">
                  <span className="font-semibold" style={{ color: themeColor }}>
                    {group.groupName}:
                  </span>{" "}
                  {group.skills.join(" • ")}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Work Experience */}
      {data.workExperience.length > 0 && (
        <div className="mb-6">
          <h2
            className="text-xl font-bold mb-2 pb-1 border-b-2"
            style={{ color: themeColor, borderColor: themeColor }}
          >
            {t.workExperience}
          </h2>
          <div className="space-y-4">
            {data.workExperience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3
                      className="font-bold text-base"
                      style={{ color: themeColor }}
                    >
                      {exp.position || "Position"}
                    </h3>
                    <p className="text-sm font-semibold text-gray-700">
                      {exp.company || "Company"}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600">
                    {exp.startDate} -{" "}
                    {exp.current ? t.present : exp.endDate || "End Date"}
                  </div>
                </div>
                {exp.description && (
                  <p className="text-sm text-gray-700 mb-2 italic">
                    {exp.description}
                  </p>
                )}
                {exp.responsibilities.filter((r) => r.trim()).length > 0 && (
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    {exp.responsibilities
                      .filter((resp) => resp.trim())
                      .map((resp, index) => (
                        <li key={index} className="text-sm text-gray-800">
                          {resp}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <div className="mb-6">
          <h2
            className="text-xl font-bold mb-2 pb-1 border-b-2"
            style={{ color: themeColor, borderColor: themeColor }}
          >
            {t.education}
          </h2>
          <div className="space-y-3">
            {data.education.map((edu) => (
              <div key={edu.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3
                      className="font-bold text-base"
                      style={{ color: themeColor }}
                    >
                      {edu.school || "School"}
                    </h3>
                    <p className="text-sm text-gray-700">
                      {edu.degree || "Degree"}
                      {edu.major && ` ${t.in} ${edu.major}`}
                      {edu.gpa && ` - ${t.gpa}: ${edu.gpa}`}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600">
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
      {data.projects.length > 0 && (
        <div className="mb-6">
          <h2
            className="text-xl font-bold mb-2 pb-1 border-b-2"
            style={{ color: themeColor, borderColor: themeColor }}
          >
            {t.projects}
          </h2>
          <div className="space-y-4">
            {data.projects.map((proj) => (
              <div key={proj.id}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3
                      className="font-bold text-base"
                      style={{ color: themeColor }}
                    >
                      {proj.name || "Project Name"}
                    </h3>
                    <p className="text-sm text-gray-700">
                      {proj.role || "Role"}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600">
                    {proj.startDate} -{" "}
                    {proj.current ? t.present : proj.endDate || "End Date"}
                  </div>
                </div>
                {proj.description && (
                  <p className="text-sm text-gray-800 mb-1">
                    {proj.description}
                  </p>
                )}
                {proj.technologies.length > 0 && (
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">{t.technologies}:</span>{" "}
                    {proj.technologies.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Information */}
      {data.additionalInfo && (
        <div className="mb-6">
          <h2
            className="text-xl font-bold mb-2 pb-1 border-b-2"
            style={{ color: themeColor, borderColor: themeColor }}
          >
            {t.additionalInfo}
          </h2>
          <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-line">
            {data.additionalInfo}
          </p>
        </div>
      )}
    </div>
  );
};
