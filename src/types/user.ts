export type UserRole = 'sadmin' | 'admin' | 'user';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  emailLower?: string;
  role: UserRole;
  centerId: string;
  centerName: string;
  avatarUrl?: string;
  authProviders?: string[];
  needsCenterSelection?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
}
