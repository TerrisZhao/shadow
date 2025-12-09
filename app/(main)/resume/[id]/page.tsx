"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Input, Textarea } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import {
  Plus,
  X,
  Eye,
  Download,
  ArrowLeft,
  Save,
  CheckCircle,
  Palette,
  Edit3,
  GripVertical,
} from "lucide-react";
import { addToast } from "@heroui/toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  ResumeData,
  WorkExperience,
  Education,
  Project,
  SkillGroup,
} from "@/types/resume";
import { ResumePreview } from "@/components/resume-preview";

// Sortable Skill Item Component
function SortableSkillItem({
  skill,
  onRemove,
}: {
  skill: string;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: skill,
    animateLayoutChanges: () => true,
    transition: {
      duration: 300,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)",
    opacity: isDragging ? 0.3 : 1,
    width: "fit-content",
    flexShrink: 0,
  };

  return (
    <div
      ref={setNodeRef}
      className="inline-flex items-center"
      style={style}
    >
      <Chip
        endContent={
          <button className="ml-1" onClick={onRemove}>
            <X size={14} />
          </button>
        }
        startContent={
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="text-default-400" size={14} />
          </div>
        }
      >
        {skill}
      </Chip>
    </div>
  );
}

// Sortable Responsibility Item Component
function SortableResponsibilityItem({
  responsibility,
  index,
  expId,
  onUpdate,
  onRemove,
}: {
  responsibility: string;
  index: number;
  expId: string;
  onUpdate: (value: string) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${expId}-resp-${index}`,
    animateLayoutChanges: () => true,
    transition: {
      duration: 300,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)",
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2">
      <div className="flex items-start pt-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="text-default-400" size={18} />
        </div>
      </div>
      <Textarea
        minRows={2}
        placeholder="Describe your responsibility or achievement..."
        value={responsibility}
        onChange={(e) => onUpdate(e.target.value)}
      />
      <Button
        isIconOnly
        color="danger"
        size="sm"
        variant="light"
        onPress={onRemove}
      >
        <X size={18} />
      </Button>
    </div>
  );
}

// Sortable Group Component
function SortableGroup({
  group,
  onUpdateName,
  onRemove,
  onAddSkill,
  onRemoveSkill,
  onSkillDragStart,
  onSkillDragEnd,
}: {
  group: SkillGroup;
  onUpdateName: (name: string) => void;
  onRemove: () => void;
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (skillIndex: number) => void;
  onSkillDragStart: (event: DragStartEvent) => void;
  onSkillDragEnd: (event: DragEndEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: group.id,
    animateLayoutChanges: () => true,
    transition: {
      duration: 300,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const [localActiveSkillId, setLocalActiveSkillId] = useState<string | null>(null);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)",
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="bg-default-50 shadow-none border-2 border-dashed border-default-300">
        <CardBody className="space-y-3">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-2 flex-1">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="text-default-400" size={18} />
              </div>
              <Input
                className="flex-1"
                size="sm"
                value={group.groupName}
                onChange={(e) => onUpdateName(e.target.value)}
              />
            </div>
            <Button
              isIconOnly
              color="danger"
              size="sm"
              variant="light"
              onPress={onRemove}
            >
              <X size={18} />
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add skill and press Enter"
              size="sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const input = e.target as HTMLInputElement;

                  if (input.value.trim()) {
                    onAddSkill(input.value);
                    input.value = "";
                  }
                }
              }}
            />
          </div>
          <DndContext
            collisionDetection={closestCenter}
            sensors={useSensors(
              useSensor(PointerSensor),
              useSensor(KeyboardSensor, {
                coordinateGetter: sortableKeyboardCoordinates,
              }),
            )}
            onDragStart={(e) => {
              setLocalActiveSkillId(e.active.id as string);
              onSkillDragStart(e);
            }}
            onDragEnd={(e) => {
              setLocalActiveSkillId(null);
              onSkillDragEnd(e);
            }}
          >
            <SortableContext
              items={group.skills}
              strategy={rectSortingStrategy}
            >
              <div className="flex flex-wrap gap-2">
                {group.skills.map((skill, skillIndex) => (
                  <SortableSkillItem
                    key={skill}
                    skill={skill}
                    onRemove={() => onRemoveSkill(skillIndex)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {localActiveSkillId ? (
                <div className="flex items-center">
                  <Chip>
                    {localActiveSkillId}
                  </Chip>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </CardBody>
      </Card>
    </div>
  );
}

export default function ResumeEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [resumeData, setResumeData] = useState<ResumeData & { name?: string }>({
    name: "",
    fullName: "",
    preferredName: "",
    phone: "",
    email: "",
    location: "",
    linkedin: "",
    github: "",
    summary: "",
    keySkills: [],
    workExperience: [],
    education: [],
    projects: [],
    additionalInfo: "",
    themeColor: "#000000",
  });

  const [currentSkill, setCurrentSkill] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [useSkillGroups, setUseSkillGroups] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Preset theme colors
  const presetColors = [
    "#000000", // Black
    "#1e40af", // Blue
    "#059669", // Green
    "#dc2626", // Red
    "#7c3aed", // Purple
    "#ea580c", // Orange
    "#0891b2", // Cyan
    "#be185d", // Pink
  ];

  // Load resume data
  useEffect(() => {
    const fetchResume = async () => {
      try {
        const response = await fetch(`/api/resumes/${resolvedParams.id}`);
        const data = await response.json();

        if (response.ok) {
          const resume = data.resume;

          const skills = resume.keySkills || [];
          // Check if keySkills is in grouped format
          const isGrouped =
            skills.length > 0 &&
            typeof skills[0] === "object" &&
            "groupName" in skills[0];

          setUseSkillGroups(isGrouped);

          setResumeData({
            name: resume.name,
            fullName: resume.fullName || "",
            preferredName: resume.preferredName || "",
            phone: resume.phone || "",
            email: resume.email || "",
            location: resume.location || "",
            linkedin: resume.linkedin || "",
            github: resume.github || "",
            summary: resume.summary || "",
            keySkills: skills,
            workExperience: resume.workExperience || [],
            education: resume.education || [],
            projects: resume.projects || [],
            additionalInfo: resume.additionalInfo || "",
            themeColor: resume.themeColor || "#000000",
          });
          setLastSaved(new Date(resume.updatedAt));
        } else {
          addToast({
            title: data.error || "Failed to load resume",
            color: "danger",
          });
          router.push("/resume");
        }
      } catch (error) {
        console.error("Error loading resume:", error);
        addToast({
          title: "Failed to load resume",
          color: "danger",
        });
        router.push("/resume");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchResume();
  }, [resolvedParams.id, router]);

  // Auto-save function with debounce
  const autoSave = useCallback(
    async (data: typeof resumeData) => {
      setIsSaving(true);
      try {
        const response = await fetch(`/api/resumes/${resolvedParams.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: data.name,
            data: {
              fullName: data.fullName,
              preferredName: data.preferredName,
              phone: data.phone,
              email: data.email,
              location: data.location,
              linkedin: data.linkedin,
              github: data.github,
              summary: data.summary,
              keySkills: data.keySkills,
              workExperience: data.workExperience,
              education: data.education,
              projects: data.projects,
              additionalInfo: data.additionalInfo,
              themeColor: data.themeColor,
            },
          }),
        });

        if (response.ok) {
          setLastSaved(new Date());
        } else {
          console.error("Auto-save failed");
        }
      } catch (error) {
        console.error("Auto-save error:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [resolvedParams.id],
  );

  // Trigger auto-save with debounce
  useEffect(() => {
    if (!isLoading && resumeData.name) {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      const timeout = setTimeout(() => {
        void autoSave(resumeData);
      }, 1500); // Auto-save after 1.5 seconds of inactivity

      setSaveTimeout(timeout);

      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    }
  }, [resumeData, isLoading, autoSave]);

  // Toggle between simple list and grouped format
  const handleToggleSkillFormat = () => {
    if (useSkillGroups) {
      // Convert from grouped to simple list
      const flatSkills: string[] = [];

      (resumeData.keySkills as SkillGroup[]).forEach((group) => {
        flatSkills.push(...group.skills);
      });
      setResumeData({ ...resumeData, keySkills: flatSkills });
      setUseSkillGroups(false);
    } else {
      // Convert from simple list to grouped (create one default group)
      const defaultGroup: SkillGroup = {
        id: Date.now().toString(),
        groupName: "Skills",
        skills: [...(resumeData.keySkills as string[])],
      };

      setResumeData({ ...resumeData, keySkills: [defaultGroup] });
      setUseSkillGroups(true);
    }
  };

  // Simple list functions
  const handleAddSkill = () => {
    if (!useSkillGroups) {
      const newSkill = currentSkill.trim();

      if (newSkill) {
        if (
          !(resumeData.keySkills as string[]).some(
            (skill) => skill.trim().toLowerCase() === newSkill.toLowerCase(),
          )
        ) {
          setResumeData({
            ...resumeData,
            keySkills: [...(resumeData.keySkills as string[]), newSkill],
          });
        }
        setCurrentSkill("");
      }
    }
  };

  const handleRemoveSkill = (index: number) => {
    if (!useSkillGroups) {
      setResumeData({
        ...resumeData,
        keySkills: (resumeData.keySkills as string[]).filter(
          (_, i) => i !== index,
        ),
      });
    }
  };

  // Handle skill drag start
  const handleSkillDragStart = (event: DragStartEvent) => {
    setActiveSkillId(event.active.id as string);
  };

  // Handle skill drag and drop for simple list
  const handleSkillDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const skills = resumeData.keySkills as string[];
      const oldIndex = skills.indexOf(active.id as string);
      const newIndex = skills.indexOf(over.id as string);

      setResumeData({
        ...resumeData,
        keySkills: arrayMove(skills, oldIndex, newIndex),
      });
    }

    setActiveSkillId(null);
  };

  // Grouped functions
  const handleAddSkillGroup = () => {
    if (useSkillGroups) {
      const skillGroups = resumeData.keySkills as SkillGroup[];
      const newGroup: SkillGroup = {
        id: Date.now().toString(),
        groupName: `Group ${skillGroups.length + 1}`,
        skills: [],
      };

      setResumeData({
        ...resumeData,
        keySkills: [...skillGroups, newGroup],
      });
    }
  };

  const handleRemoveSkillGroup = (groupId: string) => {
    if (useSkillGroups) {
      setResumeData({
        ...resumeData,
        keySkills: (resumeData.keySkills as SkillGroup[]).filter(
          (g) => g.id !== groupId,
        ),
      });
    }
  };

  const handleUpdateGroupName = (groupId: string, newName: string) => {
    if (useSkillGroups) {
      setResumeData({
        ...resumeData,
        keySkills: (resumeData.keySkills as SkillGroup[]).map((g) =>
          g.id === groupId ? { ...g, groupName: newName } : g,
        ),
      });
    }
  };

  const handleAddSkillToGroup = (groupId: string, skill: string) => {
    if (!useSkillGroups) return false;

    const newSkill = skill.trim();

    if (!newSkill) return false;

    let added = false;

    setResumeData({
      ...resumeData,
      keySkills: (resumeData.keySkills as SkillGroup[]).map((g) => {
        if (g.id !== groupId) return g;

        const exists = g.skills.some(
          (existing) =>
            existing.trim().toLowerCase() === newSkill.toLowerCase(),
        );

        if (exists) return g;

        added = true;

        return { ...g, skills: [...g.skills, newSkill] };
      }),
    });

    return added;
  };

  const handleRemoveSkillFromGroup = (groupId: string, skillIndex: number) => {
    if (useSkillGroups) {
      setResumeData({
        ...resumeData,
        keySkills: (resumeData.keySkills as SkillGroup[]).map((g) =>
          g.id === groupId
            ? { ...g, skills: g.skills.filter((_, i) => i !== skillIndex) }
            : g,
        ),
      });
    }
  };

  // Handle skill drag and drop within a group
  const handleSkillInGroupDragStart = (event: DragStartEvent) => {
    setActiveSkillId(event.active.id as string);
  };

  const handleSkillInGroupDragEnd = (groupId: string, event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setResumeData({
        ...resumeData,
        keySkills: (resumeData.keySkills as SkillGroup[]).map((group) => {
          if (group.id !== groupId) return group;

          const oldIndex = group.skills.indexOf(active.id as string);
          const newIndex = group.skills.indexOf(over.id as string);

          return {
            ...group,
            skills: arrayMove(group.skills, oldIndex, newIndex),
          };
        }),
      });
    }
    setActiveSkillId(null);
  };

  // Handle group drag and drop
  const handleGroupDragStart = (event: DragStartEvent) => {
    setActiveGroupId(event.active.id as string);
  };

  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const groups = resumeData.keySkills as SkillGroup[];
      const oldIndex = groups.findIndex((g) => g.id === active.id);
      const newIndex = groups.findIndex((g) => g.id === over.id);

      setResumeData({
        ...resumeData,
        keySkills: arrayMove(groups, oldIndex, newIndex),
      });
    }
    setActiveGroupId(null);
  };

  // Add work experience
  const handleAddWorkExperience = () => {
    const newExp: WorkExperience = {
      id: Date.now().toString(),
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      current: false,
      responsibilities: [""],
    };

    setResumeData({
      ...resumeData,
      workExperience: [...resumeData.workExperience, newExp],
    });
  };

  // Update work experience
  const handleUpdateWorkExperience = (
    id: string,
    field: string,
    value: any,
  ) => {
    setResumeData({
      ...resumeData,
      workExperience: resumeData.workExperience.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp,
      ),
    });
  };

  // Remove work experience
  const handleRemoveWorkExperience = (id: string) => {
    setResumeData({
      ...resumeData,
      workExperience: resumeData.workExperience.filter((exp) => exp.id !== id),
    });
  };

  // Add responsibility to work experience
  const handleAddResponsibility = (expId: string) => {
    setResumeData({
      ...resumeData,
      workExperience: resumeData.workExperience.map((exp) =>
        exp.id === expId
          ? { ...exp, responsibilities: [...exp.responsibilities, ""] }
          : exp,
      ),
    });
  };

  // Update responsibility
  const handleUpdateResponsibility = (
    expId: string,
    index: number,
    value: string,
  ) => {
    setResumeData({
      ...resumeData,
      workExperience: resumeData.workExperience.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              responsibilities: exp.responsibilities.map((resp, i) =>
                i === index ? value : resp,
              ),
            }
          : exp,
      ),
    });
  };

  // Remove responsibility
  const handleRemoveResponsibility = (expId: string, index: number) => {
    setResumeData({
      ...resumeData,
      workExperience: resumeData.workExperience.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              responsibilities: exp.responsibilities.filter(
                (_, i) => i !== index,
              ),
            }
          : exp,
      ),
    });
  };

  // Handle responsibility drag and drop
  const handleResponsibilityDragEnd = (expId: string, event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setResumeData({
        ...resumeData,
        workExperience: resumeData.workExperience.map((exp) => {
          if (exp.id !== expId) return exp;

          const activeIndex = parseInt((active.id as string).split("-resp-")[1]);
          const overIndex = parseInt((over.id as string).split("-resp-")[1]);

          return {
            ...exp,
            responsibilities: arrayMove(exp.responsibilities, activeIndex, overIndex),
          };
        }),
      });
    }
  };

  // Add education
  const handleAddEducation = () => {
    const newEdu: Education = {
      id: Date.now().toString(),
      school: "",
      degree: "",
      major: "",
      startDate: "",
      endDate: "",
      current: false,
      gpa: "",
    };

    setResumeData({
      ...resumeData,
      education: [...resumeData.education, newEdu],
    });
  };

  // Update education
  const handleUpdateEducation = (id: string, field: string, value: any) => {
    setResumeData({
      ...resumeData,
      education: resumeData.education.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu,
      ),
    });
  };

  // Remove education
  const handleRemoveEducation = (id: string) => {
    setResumeData({
      ...resumeData,
      education: resumeData.education.filter((edu) => edu.id !== id),
    });
  };

  // Add project
  const handleAddProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: "",
      role: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
      technologies: [],
    };

    setResumeData({
      ...resumeData,
      projects: [...resumeData.projects, newProject],
    });
  };

  // Update project
  const handleUpdateProject = (id: string, field: string, value: any) => {
    setResumeData({
      ...resumeData,
      projects: resumeData.projects.map((proj) =>
        proj.id === id ? { ...proj, [field]: value } : proj,
      ),
    });
  };

  // Remove project
  const handleRemoveProject = (id: string) => {
    setResumeData({
      ...resumeData,
      projects: resumeData.projects.filter((proj) => proj.id !== id),
    });
  };

  // Add technology to project
  const handleAddTechnology = (projId: string, tech: string) => {
    if (tech.trim()) {
      setResumeData({
        ...resumeData,
        projects: resumeData.projects.map((proj) =>
          proj.id === projId
            ? { ...proj, technologies: [...proj.technologies, tech.trim()] }
            : proj,
        ),
      });
    }
  };

  // Remove technology from project
  const handleRemoveTechnology = (projId: string, index: number) => {
    setResumeData({
      ...resumeData,
      projects: resumeData.projects.map((proj) =>
        proj.id === projId
          ? {
              ...proj,
              technologies: proj.technologies.filter((_, i) => i !== index),
            }
          : proj,
      ),
    });
  };

  // Export to PDF using server-side Puppeteer
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Build API URL with resume ID and theme color
      const exportUrl = new URL("/api/export", window.location.origin);

      exportUrl.searchParams.set("id", resolvedParams.id);
      if (resumeData.themeColor) {
        exportUrl.searchParams.set("themeColor", resumeData.themeColor);
      }

      // Fetch PDF from API
      const response = await fetch(exportUrl.toString());

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = resumeData.fullName
        ? `${resumeData.fullName.replace(/\s+/g, "_")}_Resume.pdf`
        : "Resume.pdf";
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addToast({
        title: "Resume exported successfully!",
        color: "success",
      });
    } catch (error) {
      console.error("Export error:", error);
      addToast({
        title: "Failed to export resume",
        color: "danger",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={() => router.push("/resume")}
          >
            <ArrowLeft size={18} />
          </Button>
          <div className="min-h-10 flex items-center">
            {isEditingName ? (
              <Input
                aria-label="Resume Name"
                classNames={{ inputWrapper: "min-h-10", input: "text-base" }}
                size="sm"
                value={resumeData.name}
                onBlur={() => setIsEditingName(false)}
                onChange={(e) =>
                  setResumeData({ ...resumeData, name: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setIsEditingName(false);
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setIsEditingName(false);
                  }
                }}
              />
            ) : (
              <button
                className="text-left focus:outline-none min-h-10 flex items-center"
                type="button"
                onClick={() => setIsEditingName(true)}
              >
                <span className="text-3xl leading-6 font-semibold">
                  {resumeData.name || "Resume"}
                </span>
                <span className="ml-2 text-xs text-default-500 hidden sm:inline-flex items-center gap-1">
                  <Edit3 size={14} />
                </span>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 min-h-10 mr-4">
          {isSaving ? (
            <div className="text-sm text-default-500 flex items-center gap-1">
              <Save className="animate-pulse" size={14} />
              Saving...
            </div>
          ) : lastSaved ? (
            <div className="text-sm text-success flex items-center gap-1">
              <CheckCircle size={14} />
              Saved {lastSaved.toLocaleTimeString()}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-6 pb-5">
        {/* Personal Information */}
        <Card>
          <CardBody className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="John Doe"
                value={resumeData.fullName}
                onChange={(e) =>
                  setResumeData({ ...resumeData, fullName: e.target.value })
                }
              />
              <Input
                label="Preferred Name"
                placeholder="John (Optional)"
                value={resumeData.preferredName}
                onChange={(e) =>
                  setResumeData({
                    ...resumeData,
                    preferredName: e.target.value,
                  })
                }
              />
              <Input
                label="Phone"
                placeholder="+1 (555) 123-4567"
                value={resumeData.phone}
                onChange={(e) =>
                  setResumeData({ ...resumeData, phone: e.target.value })
                }
              />
              <Input
                label="Email"
                placeholder="john.doe@example.com"
                type="email"
                value={resumeData.email}
                onChange={(e) =>
                  setResumeData({ ...resumeData, email: e.target.value })
                }
              />
              <Input
                label="Location"
                placeholder="San Francisco, CA"
                value={resumeData.location}
                onChange={(e) =>
                  setResumeData({ ...resumeData, location: e.target.value })
                }
              />
              <Input
                label="LinkedIn"
                placeholder="linkedin.com/in/johndoe"
                value={resumeData.linkedin}
                onChange={(e) =>
                  setResumeData({ ...resumeData, linkedin: e.target.value })
                }
              />
              <Input
                label="GitHub"
                placeholder="github.com/johndoe"
                value={resumeData.github}
                onChange={(e) =>
                  setResumeData({ ...resumeData, github: e.target.value })
                }
              />
            </div>
          </CardBody>
        </Card>

        {/* Summary */}
        <Card>
          <CardBody className="space-y-4">
            <h3 className="text-lg font-semibold">Summary</h3>
            <Textarea
              label="Summary"
              minRows={4}
              placeholder="Write a brief Summary highlighting your key achievements and career goals..."
              value={resumeData.summary}
              onChange={(e) =>
                setResumeData({ ...resumeData, summary: e.target.value })
              }
            />
          </CardBody>
        </Card>

        {/* Key Skills */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Key Skills</h3>
              <Button
                size="sm"
                variant="flat"
                onPress={handleToggleSkillFormat}
              >
                {useSkillGroups ? "Switch to Simple List" : "Switch to Groups"}
              </Button>
            </div>

            {!useSkillGroups ? (
              // Simple list mode
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill and press Enter"
                    value={currentSkill}
                    onChange={(e) => setCurrentSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                  />
                  <Button
                    color="primary"
                    startContent={<Plus size={18} />}
                    onPress={handleAddSkill}
                  >
                    Add
                  </Button>
                </div>
                <DndContext
                  collisionDetection={closestCenter}
                  sensors={sensors}
                  onDragStart={handleSkillDragStart}
                  onDragEnd={handleSkillDragEnd}
                >
                  <SortableContext
                    items={resumeData.keySkills as string[]}
                    strategy={rectSortingStrategy}
                  >
                    <div className="flex flex-wrap gap-2">
                      {(resumeData.keySkills as string[]).map(
                        (skill, index) => (
                          <SortableSkillItem
                            key={skill}
                            skill={skill}
                            onRemove={() => handleRemoveSkill(index)}
                          />
                        ),
                      )}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeSkillId ? (
                      <div className="flex items-center">
                        <Chip>
                          {activeSkillId}
                        </Chip>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </>
            ) : (
              // Grouped mode
              <>
                <div className="flex justify-end">
                  <Button
                    color="primary"
                    startContent={<Plus size={18} />}
                    onPress={handleAddSkillGroup}
                  >
                    Add Group
                  </Button>
                </div>
                <DndContext
                  collisionDetection={closestCenter}
                  sensors={sensors}
                  onDragStart={handleGroupDragStart}
                  onDragEnd={handleGroupDragEnd}
                >
                  <SortableContext
                    items={(resumeData.keySkills as SkillGroup[]).map(
                      (g) => g.id,
                    )}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {(resumeData.keySkills as SkillGroup[]).map((group) => (
                        <SortableGroup
                          key={group.id}
                          group={group}
                          onAddSkill={(skill) =>
                            handleAddSkillToGroup(group.id, skill)
                          }
                          onRemove={() => handleRemoveSkillGroup(group.id)}
                          onRemoveSkill={(skillIndex) =>
                            handleRemoveSkillFromGroup(group.id, skillIndex)
                          }
                          onSkillDragStart={handleSkillInGroupDragStart}
                          onSkillDragEnd={(event) =>
                            handleSkillInGroupDragEnd(group.id, event)
                          }
                          onUpdateName={(name) =>
                            handleUpdateGroupName(group.id, name)
                          }
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeGroupId ? (
                      <Card className="bg-default-50 shadow-none border-2 border-dashed border-default-300 opacity-90">
                        <CardBody className="p-4">
                          <div className="font-medium">
                            {
                              (resumeData.keySkills as SkillGroup[]).find(
                                (g) => g.id === activeGroupId,
                              )?.groupName
                            }
                          </div>
                        </CardBody>
                      </Card>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </>
            )}
          </CardBody>
        </Card>

        {/* Work Experience */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Work Experience</h3>
              <Button
                color="primary"
                size="sm"
                startContent={<Plus size={18} />}
                onPress={handleAddWorkExperience}
              >
                Add Experience
              </Button>
            </div>
            {resumeData.workExperience.map((exp, expIndex) => (
              <Card
                key={exp.id}
                className="bg-default-50 shadow-none border-2 border-dashed border-default-300"
              >
                <CardBody className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Experience {expIndex + 1}</h4>
                    <Button
                      isIconOnly
                      color="danger"
                      size="sm"
                      variant="light"
                      onPress={() => handleRemoveWorkExperience(exp.id)}
                    >
                      <X size={18} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Company"
                      placeholder="Company Name"
                      value={exp.company}
                      onChange={(e) =>
                        handleUpdateWorkExperience(
                          exp.id,
                          "company",
                          e.target.value,
                        )
                      }
                    />
                    <Input
                      label="Position"
                      placeholder="Software Engineer"
                      value={exp.position}
                      onChange={(e) =>
                        handleUpdateWorkExperience(
                          exp.id,
                          "position",
                          e.target.value,
                        )
                      }
                    />
                    <Input
                      label="Start Date"
                      placeholder="Jan 2020"
                      value={exp.startDate}
                      onChange={(e) =>
                        handleUpdateWorkExperience(
                          exp.id,
                          "startDate",
                          e.target.value,
                        )
                      }
                    />
                    <Input
                      isDisabled={exp.current}
                      label="End Date"
                      placeholder="Dec 2022"
                      value={exp.endDate || ""}
                      onChange={(e) =>
                        handleUpdateWorkExperience(
                          exp.id,
                          "endDate",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      checked={exp.current}
                      type="checkbox"
                      onChange={(e) =>
                        handleUpdateWorkExperience(
                          exp.id,
                          "current",
                          e.target.checked,
                        )
                      }
                    />
                    <span className="text-sm">Current Position</span>
                  </label>
                  <Divider />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium">
                        Responsibilities & Achievements
                      </div>
                      <Button
                        size="sm"
                        startContent={<Plus size={14} />}
                        variant="flat"
                        onPress={() => handleAddResponsibility(exp.id)}
                      >
                        Add
                      </Button>
                    </div>
                    <DndContext
                      collisionDetection={closestCenter}
                      sensors={sensors}
                      onDragEnd={(event) => handleResponsibilityDragEnd(exp.id, event)}
                    >
                      <SortableContext
                        items={exp.responsibilities.map((_, i) => `${exp.id}-resp-${i}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        {exp.responsibilities.map((resp, respIndex) => (
                          <SortableResponsibilityItem
                            key={`${exp.id}-resp-${respIndex}`}
                            responsibility={resp}
                            index={respIndex}
                            expId={exp.id}
                            onUpdate={(value) =>
                              handleUpdateResponsibility(exp.id, respIndex, value)
                            }
                            onRemove={() =>
                              handleRemoveResponsibility(exp.id, respIndex)
                            }
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                </CardBody>
              </Card>
            ))}
          </CardBody>
        </Card>

        {/* Education */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Education</h3>
              <Button
                color="primary"
                size="sm"
                startContent={<Plus size={18} />}
                onPress={handleAddEducation}
              >
                Add Education
              </Button>
            </div>
            {resumeData.education.map((edu, eduIndex) => (
              <Card
                key={edu.id}
                className="bg-default-50 shadow-none border-2 border-dashed border-default-300"
              >
                <CardBody className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Education {eduIndex + 1}</h4>
                    <Button
                      isIconOnly
                      color="danger"
                      size="sm"
                      variant="light"
                      onPress={() => handleRemoveEducation(edu.id)}
                    >
                      <X size={18} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="School"
                      placeholder="University Name"
                      value={edu.school}
                      onChange={(e) =>
                        handleUpdateEducation(edu.id, "school", e.target.value)
                      }
                    />
                    <Input
                      label="Degree"
                      placeholder="Bachelor of Science"
                      value={edu.degree}
                      onChange={(e) =>
                        handleUpdateEducation(edu.id, "degree", e.target.value)
                      }
                    />
                    <Input
                      label="Major"
                      placeholder="Computer Science"
                      value={edu.major}
                      onChange={(e) =>
                        handleUpdateEducation(edu.id, "major", e.target.value)
                      }
                    />
                    <Input
                      label="GPA (Optional)"
                      placeholder="3.8/4.0"
                      value={edu.gpa || ""}
                      onChange={(e) =>
                        handleUpdateEducation(edu.id, "gpa", e.target.value)
                      }
                    />
                    <Input
                      label="Start Date"
                      placeholder="Sep 2016"
                      value={edu.startDate}
                      onChange={(e) =>
                        handleUpdateEducation(
                          edu.id,
                          "startDate",
                          e.target.value,
                        )
                      }
                    />
                    <Input
                      isDisabled={edu.current}
                      label="End Date"
                      placeholder="Jun 2020"
                      value={edu.endDate || ""}
                      onChange={(e) =>
                        handleUpdateEducation(edu.id, "endDate", e.target.value)
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      checked={edu.current}
                      type="checkbox"
                      onChange={(e) =>
                        handleUpdateEducation(
                          edu.id,
                          "current",
                          e.target.checked,
                        )
                      }
                    />
                    <span className="text-sm">Currently Enrolled</span>
                  </label>
                </CardBody>
              </Card>
            ))}
          </CardBody>
        </Card>

        {/* Projects */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Projects</h3>
              <Button
                color="primary"
                size="sm"
                startContent={<Plus size={18} />}
                onPress={handleAddProject}
              >
                Add Project
              </Button>
            </div>
            {resumeData.projects.map((proj, projIndex) => (
              <Card
                key={proj.id}
                className="bg-default-50 shadow-none border-2 border-dashed border-default-300"
              >
                <CardBody className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Project {projIndex + 1}</h4>
                    <Button
                      isIconOnly
                      color="danger"
                      size="sm"
                      variant="light"
                      onPress={() => handleRemoveProject(proj.id)}
                    >
                      <X size={18} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Project Name"
                      placeholder="E-commerce Platform"
                      value={proj.name}
                      onChange={(e) =>
                        handleUpdateProject(proj.id, "name", e.target.value)
                      }
                    />
                    <Input
                      label="Role"
                      placeholder="Lead Developer"
                      value={proj.role}
                      onChange={(e) =>
                        handleUpdateProject(proj.id, "role", e.target.value)
                      }
                    />
                    <Input
                      label="Start Date"
                      placeholder="Jan 2023"
                      value={proj.startDate}
                      onChange={(e) =>
                        handleUpdateProject(
                          proj.id,
                          "startDate",
                          e.target.value,
                        )
                      }
                    />
                    <Input
                      isDisabled={proj.current}
                      label="End Date"
                      placeholder="Jun 2023"
                      value={proj.endDate || ""}
                      onChange={(e) =>
                        handleUpdateProject(proj.id, "endDate", e.target.value)
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      checked={proj.current}
                      type="checkbox"
                      onChange={(e) =>
                        handleUpdateProject(
                          proj.id,
                          "current",
                          e.target.checked,
                        )
                      }
                    />
                    <span className="text-sm">Ongoing Project</span>
                  </label>
                  <Textarea
                    label="Description"
                    minRows={3}
                    placeholder="Describe the project and your contributions..."
                    value={proj.description}
                    onChange={(e) =>
                      handleUpdateProject(
                        proj.id,
                        "description",
                        e.target.value,
                      )
                    }
                  />
                  <Divider />
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Technologies</div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add technology and press Enter"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;

                            handleAddTechnology(proj.id, input.value);
                            input.value = "";
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {proj.technologies.map((tech, techIndex) => (
                        <Chip
                          key={techIndex}
                          endContent={
                            <button
                              className="ml-1"
                              onClick={() =>
                                handleRemoveTechnology(proj.id, techIndex)
                              }
                            >
                              <X size={14} />
                            </button>
                          }
                        >
                          {tech}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </CardBody>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardBody className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Information</h3>
            <Textarea
              label="Additional Info"
              minRows={4}
              placeholder="Add any additional information like certifications, languages, awards, etc."
              value={resumeData.additionalInfo}
              onChange={(e) =>
                setResumeData({ ...resumeData, additionalInfo: e.target.value })
              }
            />
          </CardBody>
        </Card>
      </div>

      <div className="flex justify-center mb-4">
        <div className="sticky top-4 z-30">
          <Button
            color="primary"
            startContent={<Eye size={18} />}
            onPress={onOpen}
          >
            Preview
          </Button>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={isOpen}
        scrollBehavior="inside"
        size="5xl"
        onClose={onClose}
      >
        <ModalContent>
          <ModalHeader>
            <span>Resume Preview</span>
          </ModalHeader>
          <ModalBody>
            <ResumePreview
              data={resumeData}
              themeColor={resumeData.themeColor}
            />
          </ModalBody>
          <ModalFooter className="flex justify-between">
            <Popover
              isOpen={isColorPickerOpen}
              placement="top-start"
              onOpenChange={setIsColorPickerOpen}
            >
              <PopoverTrigger>
                <button
                  className="w-10 h-10 rounded-full border-3 border-default-300 hover:border-default-400 transition-all shadow-md hover:shadow-lg cursor-pointer"
                  style={{ backgroundColor: resumeData.themeColor }}
                  title="Change theme color"
                />
              </PopoverTrigger>
              <PopoverContent className="p-3">
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-default-700">
                    Theme Color
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${
                          resumeData.themeColor === color
                            ? "border-default-700 ring-2 ring-offset-2 ring-default-300"
                            : "border-default-200 hover:border-default-400"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          setResumeData({ ...resumeData, themeColor: color });
                          setIsColorPickerOpen(false);
                        }}
                      />
                    ))}
                  </div>
                  <Divider />
                  <label className="relative block cursor-pointer">
                    <div
                      className={`w-full px-3 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                        !presetColors.includes(
                          resumeData.themeColor || "#000000",
                        )
                          ? "border-default-700 ring-2 ring-offset-2 ring-default-300 bg-default-100"
                          : "border-default-200 hover:border-default-400"
                      }`}
                    >
                      {!presetColors.includes(
                        resumeData.themeColor || "#000000",
                      ) ? (
                        <div
                          className="w-4 h-4 rounded-full border border-default-300"
                          style={{ backgroundColor: resumeData.themeColor }}
                        />
                      ) : (
                        <Palette size={16} />
                      )}
                      <span>Custom Color</span>
                    </div>
                    <input
                      ref={colorInputRef}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      type="color"
                      value={resumeData.themeColor}
                      onChange={(e) => {
                        setResumeData({
                          ...resumeData,
                          themeColor: e.target.value,
                        });
                      }}
                    />
                  </label>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex gap-2">
              <Button variant="flat" onPress={onClose}>
                Close
              </Button>
              <Button
                color="primary"
                isLoading={isExporting}
                startContent={!isExporting && <Download size={18} />}
                onPress={async () => {
                  await handleExportPDF();
                  onClose();
                }}
              >
                Export PDF
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
