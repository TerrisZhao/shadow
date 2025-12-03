import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface TTSResult {
  success: boolean;
  url?: string;
  text?: string;
  voice?: string;
  size?: number;
  error?: string;
}

/**
 * 生成文字转语音并上传到 R2
 * @param text 要转换的文字
 * @param voice 语音类型，默认为 'af_alloy'
 * @returns TTS 生成结果
 */
export async function generateTTS(
  text: string,
  voice: string = "af_alloy",
): Promise<TTSResult> {
  try {
    if (!text) {
      return {
        success: false,
        error: "Text is required",
      };
    }

    // 调用文字转语音接口
    const ttsResponse = await fetch("http://localhost:8880/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0.1 Safari/605.1.15",
      },
      body: JSON.stringify({
        input: text,
        voice: voice,
        response_format: "mp3",
        download_format: "mp3",
        stream: true,
        speed: 1,
        return_download_link: true,
      }),
    });

    if (!ttsResponse.ok) {
      return {
        success: false,
        error: `TTS API error: ${ttsResponse.status}`,
      };
    }

    // 获取音频数据
    const audioBuffer = await ttsResponse.arrayBuffer();

    // 上传到 Cloudflare R2
    const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID as string;
    const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY as string;
    const r2BucketNameEnv = process.env.R2_BUCKET_NAME as string | undefined;
    const r2EndpointEnv = process.env.R2_ENDPOINT as string | undefined;
    const r2PublicBaseUrlEnv = process.env.R2_PUBLIC_BASE_URL as
      | string
      | undefined;

    if (!r2AccessKeyId || !r2SecretAccessKey || !r2EndpointEnv) {
      return {
        success: false,
        error:
          "Cloudflare R2 is not configured. Please set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_ENDPOINT.",
      };
    }

    // 处理 Endpoint
    const endpointRaw = r2EndpointEnv.replace(/\/$/, "");
    let endpointUrl: URL | null = null;

    try {
      endpointUrl = new URL(endpointRaw);
    } catch {
      return {
        success: false,
        error: "Invalid R2_ENDPOINT",
      };
    }

    // 解析 endpoint 中的 bucket
    const pathTrimmed = endpointUrl.pathname.replace(/^\/+|\/+$/g, "");
    const bucketFromEndpoint = pathTrimmed ? pathTrimmed.split("/")[0] : "";
    const bucketName = r2BucketNameEnv || bucketFromEndpoint;

    if (!bucketName) {
      return {
        success: false,
        error:
          "Bucket name is missing. Set R2_BUCKET_NAME or include it in R2_ENDPOINT.",
      };
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

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const objectKey = `tts/audio/${timestamp}_${randomString}.mp3`;

    const buffer = Buffer.from(audioBuffer);

    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: buffer,
        ContentType: "audio/mpeg",
        ContentDisposition: `attachment; filename="tts_${timestamp}.mp3"`,
      }),
    );

    // 构建公开访问 URL
    const publicBaseUrl = r2PublicBaseUrlEnv || `${baseOrigin}/${bucketName}`;
    const publicUrl = `${publicBaseUrl}/${objectKey}`;

    return {
      success: true,
      url: publicUrl,
      text: text,
      voice: voice,
      size: buffer.length,
    };
  } catch (error) {
    console.error("TTS error:", error);

    return {
      success: false,
      error: "TTS generation failed",
    };
  }
}
