import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export interface R2Config {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  bucketName?: string;
  publicBaseUrl?: string;
}

export interface R2UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  size?: number;
  error?: string;
}

export interface R2DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * 从环境变量获取R2配置
 */
export function getR2Config(): R2Config | { error: string } {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    return {
      error:
        "R2配置缺失：请设置 R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY 和 R2_ENDPOINT 环境变量",
    };
  }

  return {
    accessKeyId,
    secretAccessKey,
    endpoint,
    bucketName,
    publicBaseUrl,
  };
}

/**
 * 创建R2客户端
 */
export function createR2Client(
  config: R2Config,
):
  | { client: S3Client; bucketName: string; publicBaseUrl: string }
  | { error: string } {
  try {
    // 处理 Endpoint
    const endpointRaw = config.endpoint.replace(/\/$/, "");
    let endpointUrl: URL;

    try {
      endpointUrl = new URL(endpointRaw);
    } catch {
      return { error: "R2_ENDPOINT 配置无效" };
    }

    // 解析 endpoint 中的 bucket
    const pathTrimmed = endpointUrl.pathname.replace(/^\/+|\/+$/g, "");
    const bucketFromEndpoint = pathTrimmed ? pathTrimmed.split("/")[0] : "";
    const bucketName = config.bucketName || bucketFromEndpoint;

    if (!bucketName) {
      return {
        error:
          "Bucket名称缺失：请在 R2_ENDPOINT 中包含bucket名称或设置 R2_BUCKET_NAME",
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
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });

    // 构建公开访问 URL
    const publicBaseUrl = config.publicBaseUrl || `${baseOrigin}/${bucketName}`;

    return { client, bucketName, publicBaseUrl };
  } catch (error) {
    console.error("创建R2客户端失败:", error);

    return { error: "创建R2客户端失败" };
  }
}

/**
 * 上传文件到R2
 */
export async function uploadToR2(
  objectKey: string,
  buffer: Buffer,
  contentType: string,
  filename?: string,
): Promise<R2UploadResult> {
  try {
    const config = getR2Config();

    if ("error" in config) {
      return { success: false, error: config.error };
    }

    const clientResult = createR2Client(config);

    if ("error" in clientResult) {
      return { success: false, error: clientResult.error };
    }

    const { client, bucketName, publicBaseUrl } = clientResult;

    // 上传到 R2
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
        ContentDisposition: filename
          ? `attachment; filename="${filename}"`
          : undefined,
      }),
    );

    // 构建公开访问 URL
    const publicUrl = `${publicBaseUrl}/${objectKey}`;

    return {
      success: true,
      url: publicUrl,
      key: objectKey,
      size: buffer.length,
    };
  } catch (error) {
    console.error("上传到R2失败:", error);

    return { success: false, error: "上传文件失败" };
  }
}

/**
 * 从R2删除文件
 */
export async function deleteFromR2(objectKey: string): Promise<R2DeleteResult> {
  try {
    const config = getR2Config();

    if ("error" in config) {
      return { success: false, error: config.error };
    }

    const clientResult = createR2Client(config);

    if ("error" in clientResult) {
      return { success: false, error: clientResult.error };
    }

    const { client, bucketName } = clientResult;

    // 从 R2 删除
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      }),
    );

    return { success: true };
  } catch (error) {
    console.error("从R2删除文件失败:", error);

    return { success: false, error: "删除文件失败" };
  }
}

/**
 * 从URL中提取对象Key
 */
export function extractKeyFromUrl(
  url: string,
  publicBaseUrl?: string,
): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // 如果提供了 publicBaseUrl，尝试匹配并提取
    if (publicBaseUrl) {
      const baseUrlObj = new URL(publicBaseUrl);

      if (urlObj.host === baseUrlObj.host) {
        // 移除开头的 /
        return pathname.slice(1);
      }
    }

    // 否则直接移除开头的 /
    return pathname.slice(1);
  } catch (error) {
    console.error("从URL提取Key失败:", error);

    return null;
  }
}
