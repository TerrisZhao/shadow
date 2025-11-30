import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { eq, and } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { recordings } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const sentenceId = formData.get("sentenceId") as string;
    const duration = formData.get("duration") as string;

    if (!audioFile || !sentenceId) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    // 配置 R2
    const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID as string;
    const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY as string;
    const r2BucketNameEnv = process.env.R2_BUCKET_NAME as string | undefined;
    const r2EndpointEnv = process.env.R2_ENDPOINT as string | undefined;
    const r2PublicBaseUrlEnv = process.env.R2_PUBLIC_BASE_URL as
      | string
      | undefined;

    if (!r2AccessKeyId || !r2SecretAccessKey || !r2EndpointEnv) {
      return NextResponse.json({ error: "R2配置缺失" }, { status: 500 });
    }

    // 处理 Endpoint
    const endpointRaw = r2EndpointEnv.replace(/\/$/, "");
    let endpointUrl: URL;

    try {
      endpointUrl = new URL(endpointRaw);
    } catch (_) {
      return NextResponse.json(
        { error: "R2_ENDPOINT配置无效" },
        { status: 500 },
      );
    }

    // 解析 endpoint 中的 bucket
    const pathTrimmed = endpointUrl.pathname.replace(/^\/+|\/+$/g, "");
    const bucketFromEndpoint = pathTrimmed ? pathTrimmed.split("/")[0] : "";
    const bucketName = r2BucketNameEnv || bucketFromEndpoint;

    if (!bucketName) {
      return NextResponse.json({ error: "Bucket名称缺失" }, { status: 500 });
    }

    // S3 客户端 endpoint
    const baseOrigin = `${endpointUrl.protocol}//${endpointUrl.host}`;
    let remainingPath = pathTrimmed;

    if (remainingPath.startsWith(bucketName)) {
      remainingPath = remainingPath.slice(bucketName.length);
      remainingPath = remainingPath.replace(/^\/+/, "");
    }
    const s3ClientEndpoint = remainingPath
      ? `${baseOrigin}/${remainingPath}`
      : baseOrigin;

    const client = new S3Client({
      region: "auto",
      endpoint: s3ClientEndpoint,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
      forcePathStyle: true,
    });

    // 生成唯一的文件名
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = audioFile.type.includes("webm") ? "webm" : "mp3";
    const objectKey = `recordings/${sentenceId}/${userId}_${timestamp}_${randomString}.${fileExtension}`;

    // 读取文件内容
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传到 R2
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: buffer,
        ContentType: audioFile.type,
        ContentDisposition: `attachment; filename="recording_${timestamp}.${fileExtension}"`,
      }),
    );

    // 构建公开访问 URL
    const publicBaseUrl = r2PublicBaseUrlEnv || `${baseOrigin}/${bucketName}`;
    const publicUrl = `${publicBaseUrl}/${objectKey}`;

    // 保存录音记录到数据库
    const [recording] = await db
      .insert(recordings)
      .values({
        sentenceId: parseInt(sentenceId),
        userId: userId,
        audioUrl: publicUrl,
        duration: duration || "0",
        fileSize: buffer.length.toString(),
        mimeType: audioFile.type,
      })
      .returning();

    return NextResponse.json({
      success: true,
      recording: {
        id: recording.id,
        audioUrl: recording.audioUrl,
        duration: recording.duration,
        fileSize: recording.fileSize,
        createdAt: recording.createdAt,
      },
    });
  } catch (error) {
    console.error("录音上传失败:", error);

    return NextResponse.json({ error: "录音上传失败" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const sentenceId = searchParams.get("sentenceId");

    if (!sentenceId) {
      return NextResponse.json(
        { error: "缺少sentenceId参数" },
        { status: 400 },
      );
    }

    // 查询该句子的录音记录（只返回当前用户的录音）
    const userRecordings = await db
      .select()
      .from(recordings)
      .where(
        and(
          eq(recordings.sentenceId, parseInt(sentenceId)),
          eq(recordings.userId, userId),
        ),
      )
      .orderBy(recordings.createdAt);

    return NextResponse.json({
      success: true,
      recordings: userRecordings,
    });
  } catch (error) {
    console.error("获取录音列表失败:", error);

    return NextResponse.json({ error: "获取录音列表失败" }, { status: 500 });
  }
}
