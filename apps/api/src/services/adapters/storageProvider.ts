export type ObjectUploadInput = {
  key: string;
  contentType: string;
  contentBase64: string;
};

export type ObjectUploadResult = {
  key: string;
  url: string;
  storage: "s3" | "mock";
};

export interface StorageProviderPort {
  upload(input: ObjectUploadInput): Promise<ObjectUploadResult>;
}

function baseUrl(): string {
  return (process.env.APP_BASE_URL || "http://localhost:8788").replace(/\/$/, "");
}

export class MockStorageProvider implements StorageProviderPort {
  async upload(input: ObjectUploadInput): Promise<ObjectUploadResult> {
    return {
      key: input.key,
      url: `${baseUrl()}/api/assets/mock/${encodeURIComponent(input.key)}`,
      storage: "mock"
    };
  }
}

export function resolveStorageProvider(): StorageProviderPort {
  const mode = String(process.env.FILE_STORAGE_PROVIDER || "mock")
    .trim()
    .toLowerCase();
  const hasS3 = Boolean(process.env.S3_BUCKET && process.env.S3_ENDPOINT);

  if (mode === "s3") {
    if (!hasS3) {
      throw new Error(
        "FILE_STORAGE_PROVIDER=s3 requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY"
      );
    }
    // S3 SDK 연동 전: 엔드포인트·버킷 검증 후 mock URL 패턴 (로컬 스모크와 분리)
    return new MockStorageProvider();
  }

  if (mode !== "mock" && hasS3) {
    return new MockStorageProvider();
  }

  return new MockStorageProvider();
}

