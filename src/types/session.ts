export interface UserSession {
  sessionId: string;
  uid: string;
  emailLower: string;
  deviceId: string;
  deviceLabel: string;
  loginAt: number;       // epoch ms
  expiresAt: number;     // epoch ms (loginAt + 30 minutes)
  lastActiveAt: number;  // epoch ms
}
