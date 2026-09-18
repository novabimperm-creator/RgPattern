export type CaseFile = {
  id: string;
  caseId: string;
  originalName: string;
  mimeType: string;
  size: number;
  isImage: boolean;
  createdAt: string;
};

export type MedicalCase = {
  id: string;
  diagnosis: string;
  description: string;
  comments: string;
  createdAt: string;
  updatedAt: string;
  files: CaseFile[];
};

export type Database = {
  cases: MedicalCase[];
};
