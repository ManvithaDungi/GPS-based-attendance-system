export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  studentCode?: string | null;
}

export interface TokensDTO {
  accessToken: string;
  refreshToken?: string;
}

export interface DashboardStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  pendingToday: number;
  totalLocations: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination?: Pagination;
}
