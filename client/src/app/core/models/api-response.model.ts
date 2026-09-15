export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface PagedResult {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
