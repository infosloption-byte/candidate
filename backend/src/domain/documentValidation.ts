export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;

export const allowedDocumentMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type AllowedDocumentMimeType = (typeof allowedDocumentMimeTypes)[number];

export interface DocumentUploadInput {
  fileName?: string;
  mimeType?: string;
  contentBase64?: string;
}

export const validateDocumentUpload = (input: DocumentUploadInput): string[] => {
  const errors: string[] = [];
  const fileName = input.fileName?.trim() ?? '';
  const mimeType = input.mimeType?.trim().toLowerCase() ?? '';
  const contentBase64 = input.contentBase64?.trim() ?? '';

  if (!fileName) {
    errors.push('Document file name is required.');
  } else if (fileName.length > 180) {
    errors.push('Document file name must be 180 characters or fewer.');
  }

  if (!allowedDocumentMimeTypes.includes(mimeType as AllowedDocumentMimeType)) {
    errors.push('Document type must be PDF, JPEG, or PNG.');
  }

  if (!contentBase64) {
    errors.push('Document content is required.');
  } else if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(contentBase64)) {
    errors.push('Document content must be valid base64.');
  }

  return errors;
};
