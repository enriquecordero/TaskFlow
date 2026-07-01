export interface ProjectResponse {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description: string | null;
}

export interface UpdateProjectRequest {
  name: string;
  description: string | null;
}
