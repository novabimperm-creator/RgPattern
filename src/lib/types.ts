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
  system: string;
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

export type Role = "user" | "superadmin";

export type PublicUser = {
  id: string;
  username: string;
  role: Role;
};

export type ViewerPermissions = {
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
};

export function permissionsFor(user: PublicUser | null): ViewerPermissions {
  return {
    canEdit: user != null,
    canDelete: user?.role === "superadmin",
    canManageUsers: user?.role === "superadmin",
  };
}
