import type { ModuleName, ActionName } from "./constant";

export type Role = 'superadmin' | 'admin' | 'teacher' | 'parent' | 'student' | 'driver';

// ─── Admin user shape placed on req.user by `authenticated` middleware ─────
export interface AppUser {
  id: string;
  name: string;
  role: Role;
  /** Merged role + personal permissions, loaded fresh from DB by requirePermission */
  permissions?: Permission[];
}

export interface TokenPayload {
  id: string;
  name: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user: AppUser;
      admin?: AppUser;
    }
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: number;
    message: string;
    details?: any;
  };
}

export interface PermissionAction {
  id?: string;
  action: ActionName;
}

export interface Permission {
  module: ModuleName;
  actions: PermissionAction[];
}