// types.ts
export interface SessionUser {
  id: string;
  name: string;
  email?: string;
  username: string;
  roleId: string;
  roleName: string;
  isSuperAdmin: boolean;
  forcePasswordChange: boolean;
  plantId?: string;
}
