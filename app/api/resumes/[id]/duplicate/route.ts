import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import {
  resumes,
  resumeWorkExperiences,
  resumeEducation,
  resumeProjects,
} from "@/lib/db/schema";

// POST /api/resumes/[id]/duplicate - 复制简历
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const resumeId = Number(id);

    // 获取原始简历
    const [originalResume] = await db
      .select()
      .from(resumes)
      .where(
        and(
          eq(resumes.id, resumeId),
          eq(resumes.userId, Number(session.user.id)),
        ),
      );

    if (!originalResume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // 创建新简历（复制）
    const [newResume] = await db
      .insert(resumes)
      .values({
        userId: originalResume.userId,
        name: `${originalResume.name} (Copy)`,
        fullName: originalResume.fullName,
        preferredName: originalResume.preferredName,
        phone: originalResume.phone,
        email: originalResume.email,
        location: originalResume.location,
        linkedin: originalResume.linkedin,
        github: originalResume.github,
        website: originalResume.website,
        summary: originalResume.summary,
        keySkills: originalResume.keySkills,
        additionalInfo: originalResume.additionalInfo,
        themeColor: originalResume.themeColor,
      })
      .returning();

    // 复制工作经历
    const originalWorkExps = await db
      .select()
      .from(resumeWorkExperiences)
      .where(eq(resumeWorkExperiences.resumeId, resumeId))
      .orderBy(resumeWorkExperiences.order);

    if (originalWorkExps.length > 0) {
      const workExpValues = originalWorkExps.map((exp: any) => ({
        resumeId: newResume.id,
        company: exp.company,
        position: exp.position,
        startDate: exp.startDate,
        endDate: exp.endDate,
        current: exp.current,
        responsibilities: exp.responsibilities,
        order: exp.order,
      }));

      await db.insert(resumeWorkExperiences).values(workExpValues);
    }

    // 复制教育背景
    const originalEducation = await db
      .select()
      .from(resumeEducation)
      .where(eq(resumeEducation.resumeId, resumeId))
      .orderBy(resumeEducation.order);

    if (originalEducation.length > 0) {
      const educationValues = originalEducation.map((edu: any) => ({
        resumeId: newResume.id,
        school: edu.school,
        degree: edu.degree,
        major: edu.major,
        startDate: edu.startDate,
        endDate: edu.endDate,
        current: edu.current,
        gpa: edu.gpa,
        order: edu.order,
      }));

      await db.insert(resumeEducation).values(educationValues);
    }

    // 复制项目经历
    const originalProjects = await db
      .select()
      .from(resumeProjects)
      .where(eq(resumeProjects.resumeId, resumeId))
      .orderBy(resumeProjects.order);

    if (originalProjects.length > 0) {
      const projectValues = originalProjects.map((proj: any) => ({
        resumeId: newResume.id,
        name: proj.name,
        role: proj.role,
        startDate: proj.startDate,
        endDate: proj.endDate,
        current: proj.current,
        description: proj.description,
        technologies: proj.technologies,
        order: proj.order,
      }));

      await db.insert(resumeProjects).values(projectValues);
    }

    return NextResponse.json({ resume: newResume }, { status: 201 });
  } catch (error) {
    console.error("Error duplicating resume:", error);

    return NextResponse.json(
      { error: "Failed to duplicate resume" },
      { status: 500 },
    );
  }
}
