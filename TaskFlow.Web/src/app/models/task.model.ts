export interface TaskResponse {
  id: number;
  title: string;
  description: string | null;
  isCompleted: boolean;
  createdAt: string;
  projectId: number | null;
}

export interface CreateTaskRequest {
  title: string;
  description: string | null;
  projectId: number | null;
}

export interface UpdateTaskRequest {
  title: string;
  description: string | null;
  isCompleted: boolean;
}
