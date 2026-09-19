import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const storageRoot = (): string => {
  const configured = process.env.DOCUMENT_STORAGE_DIR?.trim();
  return configured ? path.resolve(configured) : path.resolve(process.cwd(), 'storage', 'documents');
};

const safeExtension = (fileName: string): string => {
  const extension = path.extname(fileName).toLowerCase();
  return /^[.a-z0-9]{1,12}$/.test(extension) ? extension : '';
};

export const saveDocument = async (fileName: string, contents: Buffer): Promise<string> => {
  const root = storageRoot();
  await mkdir(root, { recursive: true });

  const storageKey = randomUUID() + safeExtension(fileName);
  await writeFile(path.join(root, storageKey), contents, { flag: 'wx' });
  return storageKey;
};

export const readDocument = async (storageKey: string): Promise<Buffer> => {
  if (path.basename(storageKey) !== storageKey) {
    throw new Error('Invalid document storage key.');
  }

  return readFile(path.join(storageRoot(), storageKey));
};

export const deleteDocument = async (storageKey: string): Promise<void> => {
  if (path.basename(storageKey) !== storageKey) {
    throw new Error('Invalid document storage key.');
  }

  await unlink(path.join(storageRoot(), storageKey)).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  });
};
