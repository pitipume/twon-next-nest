export interface ApiResponse<T> {
  code: string;
  status: 'success' | 'failure';
  message?: string;
  data?: T;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
