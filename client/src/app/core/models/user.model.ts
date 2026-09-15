export interface FileRef {
  _id?: string;
  key: string;
  url: string;
  originalName: string;
  uploadedAt?: string;
}

export type UserRole = 'user' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  profilePicture: FileRef | null;
  resumes: FileRef[];
  createdAt: string;
  updatedAt: string;
}
