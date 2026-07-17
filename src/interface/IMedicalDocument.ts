export type MedicalDocumentType = 'Blood Report' | 'Medical Document' | 'Other';

export interface IMedicalDocument {
  IdDocument?: number;
  IdUser: number;
  FileName: string;
  OriginalName?: string;
  DocumentType: MedicalDocumentType;
  Notes?: string;
  UploadedBy?: number;
  UploadedAt?: string;
}
