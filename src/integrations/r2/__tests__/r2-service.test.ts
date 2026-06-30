import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  uploadFile,
  getFileMetadata,
  deleteFile,
  generatePublicUrl,
  generatePreviewUrl,
  generateDownloadUrl,
} from '../r2-service';

vi.mock('../r2-client', () => {
  const store = new Map<string, Buffer>();

  const mockSend = vi.fn(async (command: Record<string, unknown>) => {
    const CommandName = command.constructor?.name ?? '';

    if (CommandName === 'PutObjectCommand') {
      const input = command.input as { Key: string; Body: Buffer };
      store.set(input.Key, input.Body);
      return { ETag: '"etag-123"', VersionId: 'v1' };
    }

    if (CommandName === 'HeadObjectCommand') {
      const input = command.input as { Key: string };
      if (!store.has(input.Key)) {
        const err = new Error('NotFound') as Error & { Code: string };
        err.Code = 'NotFound';
        throw err;
      }
      const body = store.get(input.Key)!;
      return {
        ContentLength: body.length,
        ContentType: 'text/plain',
        ETag: '"etag-123"',
        LastModified: new Date('2025-01-01'),
      };
    }

    if (CommandName === 'DeleteObjectCommand') {
      const input = command.input as { Key: string };
      if (!store.has(input.Key)) {
        const err = new Error('Key not found') as Error & { Code: string };
        err.Code = 'NoSuchKey';
        throw err;
      }
      store.delete(input.Key);
      return {};
    }

    return {};
  });

  return {
    getR2Client: () => ({ send: mockSend }),
    getR2BucketName: () => 'test-bucket',
    getR2PublicBaseUrl: () => 'https://pub.example.com/bucket',
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async (_client: unknown, command: Record<string, unknown>, opts: { expiresIn: number }) => {
    const CommandName = command.constructor?.name ?? '';
    if (CommandName === 'PutObjectCommand') {
      const input = command.input as { Key: string };
      return `https://presigned.example.com/upload/${input.Key}?expires=${opts.expiresIn}`;
    }
    if (CommandName === 'GetObjectCommand') {
      const input = command.input as { Key: string };
      return `https://presigned.example.com/download/${input.Key}?expires=${opts.expiresIn}`;
    }
    return 'https://presigned.example.com/unknown';
  }),
}));

describe('R2 Service', () => {
  const testKey = 'test/unit-test-file.txt';
  const testContent = Buffer.from('Hello from unit test!');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload a file and return key and url', async () => {
      const result = await uploadFile({
        key: testKey,
        body: testContent,
        contentType: 'text/plain',
      });
      expect(result.key).toBe(testKey);
      expect(result.url).toContain(testKey);
      expect(result.etag).toBe('"etag-123"');
    });
  });

  describe('getFileMetadata', () => {
    it('should return metadata for existing file', async () => {
      await uploadFile({ key: testKey, body: testContent, contentType: 'text/plain' });
      const metadata = await getFileMetadata(testKey);
      expect(metadata.key).toBe(testKey);
      expect(metadata.contentType).toContain('text/plain');
      expect(metadata.size).toBe(testContent.length);
    });

    it('should throw for non-existent file', async () => {
      await expect(getFileMetadata('nonexistent/file.txt')).rejects.toThrow();
    });
  });

  describe('generatePublicUrl', () => {
    it('should generate a valid URL', () => {
      const url = generatePublicUrl(testKey);
      expect(url).toContain(testKey);
      expect(url).toMatch(/^https?:\/\//);
    });
  });

  describe('generatePreviewUrl', () => {
    it('should generate a valid preview URL', () => {
      const url = generatePreviewUrl(testKey);
      expect(url).toContain(testKey);
    });
  });

  describe('generateDownloadUrl', () => {
    it('should generate a presigned download URL', async () => {
      const url = await generateDownloadUrl(testKey);
      expect(url).toContain(testKey);
      expect(url).toMatch(/^https?:\/\//);
    });
  });

  describe('deleteFile', () => {
    it('should delete an existing file without error', async () => {
      await uploadFile({ key: testKey, body: testContent, contentType: 'text/plain' });
      await expect(deleteFile(testKey)).resolves.not.toThrow();
    });

    it('should throw for non-existent file', async () => {
      await expect(deleteFile('nonexistent/file.txt')).rejects.toThrow();
    });
  });
});
