import { FileRef } from './user.model';

export interface DirectoryUser {
  _id: string;
  name: string;
  profilePicture: FileRef | null;
}
