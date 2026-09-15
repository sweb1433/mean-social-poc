import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResult } from '../models/api-response.model';
import { User, UserRole } from '../models/user.model';

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: UserRole;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/users`;

  // --- self-service ---

  updateMe(payload: { name: string }) {
    return this.http.patch<ApiResponse<{ user: User }>>(`${this.base}/me`, payload);
  }

  uploadProfilePicture(file: File) {
    const formData = new FormData();
    formData.append('profilePicture', file);
    return this.http.post<ApiResponse<{ user: User }>>(`${this.base}/me/profile-picture`, formData);
  }

  deleteProfilePicture() {
    return this.http.delete<ApiResponse<{ user: User }>>(`${this.base}/me/profile-picture`);
  }

  uploadResume(file: File) {
    const formData = new FormData();
    formData.append('resume', file);
    return this.http.post<ApiResponse<{ user: User }>>(`${this.base}/me/resumes`, formData);
  }

  deleteResume(resumeId: string) {
    return this.http.delete<ApiResponse<{ user: User }>>(`${this.base}/me/resumes/${resumeId}`);
  }

  // --- admin only ---

  listUsers(params: ListUsersParams) {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.limit) httpParams = httpParams.set('limit', params.limit);
    if (params.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<ApiResponse<{ users: User[] } & PagedResult>>(this.base, {
      params: httpParams,
    });
  }

  getUser(id: string) {
    return this.http.get<ApiResponse<{ user: User }>>(`${this.base}/${id}`);
  }

  createUser(payload: CreateUserPayload) {
    return this.http.post<ApiResponse<{ user: User }>>(this.base, payload);
  }

  updateUser(id: string, payload: UpdateUserPayload) {
    return this.http.patch<ApiResponse<{ user: User }>>(`${this.base}/${id}`, payload);
  }

  deleteUser(id: string) {
    return this.http.delete<ApiResponse<null>>(`${this.base}/${id}`);
  }
}
