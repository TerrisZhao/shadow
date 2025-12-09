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

// GET /api/resumes/[id] - 获取特定简历详情
export async function GET(
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

    // 获取简历基本信息
    const [resume] = await db
      .select()
      .from(resumes)
      .where(
        and(
          eq(resumes.id, resumeId),
          eq(resumes.userId, Number(session.user.id)),
        ),
      );

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // 获取工作经历
    const workExperience = await db
      .select()
      .from(resumeWorkExperiences)
      .where(eq(resumeWorkExperiences.resumeId, resumeId))
      .orderBy(resumeWorkExperiences.order);

    // 获取教育背景
    const education = await db
      .select()
      .from(resumeEducation)
      .where(eq(resumeEducation.resumeId, resumeId))
      .orderBy(resumeEducation.order);

    // 获取项目经历
    const projects = await db
      .select()
      .from(resumeProjects)
      .where(eq(resumeProjects.resumeId, resumeId))
      .orderBy(resumeProjects.order);

    // 组装完整简历数据
    const fullResume = {
      id: resume.id,
      name: resume.name,
      fullName: resume.fullName,
      preferredName: resume.preferredName,
      phone: resume.phone,
      email: resume.email,
      location: resume.location,
      linkedin: resume.linkedin,
      github: resume.github,
      summary: resume.summary,
      keySkills: resume.keySkills || [],
      additionalInfo: resume.additionalInfo,
      themeColor: resume.themeColor,
      workExperience: workExperience.map((exp: any) => ({
        id: exp.id.toString(),
        company: exp.company,
        position: exp.position,
        startDate: exp.startDate,
        endDate: exp.endDate,
        current: exp.current,
        responsibilities: exp.responsibilities || [],
      })),
      education: education.map((edu: any) => ({
        id: edu.id.toString(),
        school: edu.school,
        degree: edu.degree,
        major: edu.major,
        startDate: edu.startDate,
        endDate: edu.endDate,
        current: edu.current,
        gpa: edu.gpa,
      })),
      projects: projects.map((proj: any) => ({
        id: proj.id.toString(),
        name: proj.name,
        role: proj.role,
        startDate: proj.startDate,
        endDate: proj.endDate,
        current: proj.current,
        description: proj.description,
        technologies: proj.technologies || [],
      })),
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    };

    return NextResponse.json({ resume: fullResume });
  } catch (error) {
    console.error("Error fetching resume:", error);

    return NextResponse.json(
      { error: "Failed to fetch resume" },
      { status: 500 },
    );
  }
}

// PUT /api/resumes/[id] - 更新简历
export async function PUT(
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
    const body = await request.json();
    const { name, data } = body;

    // 验证简历是否属于当前用户
    const [existingResume] = await db
      .select()
      .from(resumes)
      .where(
        and(
          eq(resumes.id, resumeId),
          eq(resumes.userId, Number(session.user.id)),
        ),
      );

    if (!existingResume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // 更新简历基本信息
    const [updatedResume] = await db
      .update(resumes)
      .set({
        name: name || existingResume.name,
        fullName: data?.fullName,
        preferredName: data?.preferredName,
        phone: data?.phone,
        email: data?.email,
        location: data?.location,
        linkedin: data?.linkedin,
        github: data?.github,
        summary: data?.summary,
        keySkills: data?.keySkills || [],
        additionalInfo: data?.additionalInfo,
        themeColor: data?.themeColor || "#1e40af",
        updatedAt: new Date(),
      })
      .where(eq(resumes.id, resumeId))
      .returning();

    // 更新工作经历 - 删除旧的，插入新的
    if (data?.workExperience) {
      await db
        .delete(resumeWorkExperiences)
        .where(eq(resumeWorkExperiences.resumeId, resumeId));

      if (data.workExperience.length > 0) {
        const workExpValues = data.workExperience.map(
          (exp: any, index: number) => ({
            resumeId,
            company: exp.company || "",
            position: exp.position || "",
            startDate: exp.startDate || "",
            endDate: exp.endDate || "",
            current: exp.current || false,
            responsibilities: exp.responsibilities || [],
            order: index,
          }),
        );

        await db.insert(resumeWorkExperiences).values(workExpValues);
      }
    }

    // 更新教育背景
    if (data?.education) {
      await db
        .delete(resumeEducation)
        .where(eq(resumeEducation.resumeId, resumeId));

      if (data.education.length > 0) {
        const educationValues = data.education.map(
          (edu: any, index: number) => ({
            resumeId,
            school: edu.school || "",
            degree: edu.degree || "",
            major: edu.major || "",
            startDate: edu.startDate || "",
            endDate: edu.endDate || "",
            current: edu.current || false,
            gpa: edu.gpa || "",
            order: index,
          }),
        );

        await db.insert(resumeEducation).values(educationValues);
      }
    }

    // 更新项目经历
    if (data?.projects) {
      await db
        .delete(resumeProjects)
        .where(eq(resumeProjects.resumeId, resumeId));

      if (data.projects.length > 0) {
        const projectValues = data.projects.map((proj: any, index: number) => ({
          resumeId,
          name: proj.name || "",
          role: proj.role || "",
          startDate: proj.startDate || "",
          endDate: proj.endDate || "",
          current: proj.current || false,
          description: proj.description || "",
          technologies: proj.technologies || [],
          order: index,
        }));

        await db.insert(resumeProjects).values(projectValues);
      }
    }

    return NextResponse.json({ resume: updatedResume });
  } catch (error) {
    console.error("Error updating resume:", error);

    return NextResponse.json(
      { error: "Failed to update resume" },
      { status: 500 },
    );
  }
}

// DELETE /api/resumes/[id] - 删除简历
export async function DELETE(
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

    // 验证简历是否属于当前用户
    const [existingResume] = await db
      .select()
      .from(resumes)
      .where(
        and(
          eq(resumes.id, resumeId),
          eq(resumes.userId, Number(session.user.id)),
        ),
      );

    if (!existingResume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // 删除关联数据
    await db
      .delete(resumeWorkExperiences)
      .where(eq(resumeWorkExperiences.resumeId, resumeId));
    await db
      .delete(resumeEducation)
      .where(eq(resumeEducation.resumeId, resumeId));
    await db
      .delete(resumeProjects)
      .where(eq(resumeProjects.resumeId, resumeId));

    // 删除简历
    await db.delete(resumes).where(eq(resumes.id, resumeId));

    return NextResponse.json({ message: "Resume deleted successfully" });
  } catch (error) {
    console.error("Error deleting resume:", error);

    return NextResponse.json(
      { error: "Failed to delete resume" },
      { status: 500 },
    );
  }
}
