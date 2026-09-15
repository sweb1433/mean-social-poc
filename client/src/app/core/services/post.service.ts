import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResult } from '../models/api-response.model';
import { Post } from '../models/post.model';

@Injectable({ providedIn: 'root' })
export class PostService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/posts`;

  getTimeline(page: number, limit: number) {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<ApiResponse<{ posts: Post[] } & PagedResult>>(this.base, { params });
  }

  createPost(text: string, attachment: File | null) {
    const formData = new FormData();
    if (text) formData.append('text', text);
    if (attachment) formData.append('attachment', attachment);
    return this.http.post<ApiResponse<{ post: Post }>>(this.base, formData);
  }

  deletePost(id: string) {
    return this.http.delete<ApiResponse<null>>(`${this.base}/${id}`);
  }
}
