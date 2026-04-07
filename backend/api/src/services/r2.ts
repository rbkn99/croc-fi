import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID ?? "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? "";
const bucket = process.env.R2_BUCKET_NAME ?? "prooflayer-uploads";
const publicUrl = process.env.R2_PUBLIC_URL ?? "";

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("R2 credentials not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)");
    }
    const endpoint = `https://${accountId.trim()}.r2.cloudflarestorage.com`;
    console.log(`[R2] endpoint=${endpoint} bucket=${bucket}`);
    client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      },
      forcePathStyle: true,
      requestHandler: {
        requestTimeout: 30_000,
      },
    });
  }
  return client;
}

export function isR2Configured(): boolean {
  return !!(accountId && accessKeyId && secretAccessKey);
}

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const s3 = getClient();

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  if (publicUrl) {
    return `${publicUrl}/${key}`;
  }
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
}
