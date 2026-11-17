import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

function s3Client() {
  const accountId = process.env.R2_ACCOUNT_ID!;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

const BUCKET = () => process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = () => (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

/**
 * Faz upload de um PDF de matrícula para o R2.
 * Chave: matriculas/{hdnImovel}.pdf
 * Idempotente: se já existir, retorna a URL sem re-upload.
 */
export async function uploadMatricula(
  hdnImovel: string,
  pdfBuffer: Buffer
): Promise<string> {
  const key = `matriculas/${hdnImovel}.pdf`;
  const s3 = s3Client();

  // Verifica se já existe
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET(), Key: key }));
    return `${PUBLIC_URL()}/${key}`;
  } catch {
    // Não existe — continua para o upload
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    })
  );

  return `${PUBLIC_URL()}/${key}`;
}
