import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, desc } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import {
  resumes,
  resumeWorkExperiences,
  resumeEducation,
  resumeProjects,
} from "@/lib/db/schema";

// GET /api/resumes - 获取用户的所有简历列表
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 获取用户简历列表
    const userResumes = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, Number(session.user.id)))
      .orderBy(desc(resumes.updatedAt));

    return NextResponse.json({ resumes: userResumes });
  } catch (error) {
    console.error("Error fetching resumes:", error);

    return NextResponse.json(
      { error: "Failed to fetch resumes" },
      { status: 500 },
    );
  }
}

// POST /api/resumes - 创建新简历
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, data } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Resume name is required" },
        { status: 400 },
      );
    }

    // 创建简历
    const [newResume] = await db
      .insert(resumes)
      .values({
        userId: Number(session.user.id),
        name,
        fullName: data?.fullName || "",
        preferredName: data?.preferredName || "",
        phone: data?.phone || "",
        email: data?.email || "",
        location: data?.location || "",
        linkedin: data?.linkedin || "",
        github: data?.github || "",
        website: data?.website || "",
        summary: data?.summary || "",
        keySkills: data?.keySkills || [],
        additionalInfo: data?.additionalInfo || "",
        themeColor: data?.themeColor || "#1e40af",
      })
      .returning();

    // 如果有工作经历，插入
    if (data?.workExperience && data.workExperience.length > 0) {
      const workExpValues = data.workExperience.map(
        (exp: any, index: number) => ({
          resumeId: newResume.id,
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

    // 如果有教育背景，插入
    if (data?.education && data.education.length > 0) {
      const educationValues = data.education.map((edu: any, index: number) => ({
        resumeId: newResume.id,
        school: edu.school || "",
        degree: edu.degree || "",
        major: edu.major || "",
        startDate: edu.startDate || "",
        endDate: edu.endDate || "",
        current: edu.current || false,
        gpa: edu.gpa || "",
        order: index,
      }));

      await db.insert(resumeEducation).values(educationValues);
    }

    // 如果有项目经历，插入
    if (data?.projects && data.projects.length > 0) {
      const projectValues = data.projects.map((proj: any, index: number) => ({
        resumeId: newResume.id,
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

    return NextResponse.json({ resume: newResume }, { status: 201 });
  } catch (error) {
    console.error("Error creating resume:", error);

    return NextResponse.json(
      { error: "Failed to create resume" },
      { status: 500 },
    );
  }
}

// PUT /api/resumes/batch-update - 批量更新简历基本信息
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { resumeIds, updates } = body;

    if (!resumeIds || !Array.isArray(resumeIds) || resumeIds.length === 0) {
      return NextResponse.json(
        { error: "Resume IDs are required" },
        { status: 400 },
      );
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "Updates are required" },
        { status: 400 },
      );
    }

    // 只允许更新特定字段
    const allowedFields = ["phone", "email", "location", "linkedin", "github", "website"];
    const updateData: any = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // 批量更新
    const results = [];

    for (const resumeId of resumeIds) {
      const [updated] = await db
        .update(resumes)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(resumes.id, resumeId),
            eq(resumes.userId, Number(session.user.id)),
          ),
        )
        .returning();

      if (updated) {
        results.push(updated);
      }
    }

    return NextResponse.json({ updated: results });
  } catch (error) {
    console.error("Error batch updating resumes:", error);

    return NextResponse.json(
      { error: "Failed to batch update resumes" },
      { status: 500 },
    );
  }
}
