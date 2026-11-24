export type CenterStatus = 'active' | 'approved' | 'pending_approval' | 'rejected';

export interface Center {
  id: string;
  name: string;
  code: string;           // e.g. "ISKCON-PONDA"
  city: string;
  state: string;
  country: string;
  status: CenterStatus;
  requestedByAdminId?: string;
  requestedByAdminName?: string;
  requestedAt?: string;
  approvedBySadminId?: string;
  approvedAt?: string;
  rejectionReason?: string;
  userCount?: number;
  createdAt: string;
}

export interface CenterCreationRequest {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  country: string;
  requestedByAdminId: string;
  requestedByAdminName: string;
  requestedByAdminEmail: string;
  requestedAt: string;
  status: CenterStatus;
  rejectionReason?: string;
}
