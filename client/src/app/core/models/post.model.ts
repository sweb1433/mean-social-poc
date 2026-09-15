export interface PostAttachment {
  key: string;
  url: string;
  mimeType: string;
  originalName: string;
  type: 'image' | 'document' | null;
}

export interface PostAuthor {
  _id: string;
  name: string;
  profilePicture: { url: string } | null;
}

export interface Post {
  _id: string;
  author: PostAuthor;
  text: string;
  attachment?: PostAttachment;
  createdAt: string;
  updatedAt: string;
}
