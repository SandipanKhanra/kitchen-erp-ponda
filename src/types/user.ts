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
  fcmTokens?: string[];
  authProviders?: string[];
  needsCenterSelection?: boolean;
  emailVerified?: boolean;
  registrationStatus?: 'pending_verification' | 'active';
  verificationExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
}
