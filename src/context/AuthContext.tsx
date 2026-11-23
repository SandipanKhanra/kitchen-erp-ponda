import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/user';
import { Center, CenterCreationRequest } from '../types/center';
import { INITIAL_USERS, INITIAL_CENTERS, INITIAL_CENTER_REQUESTS } from '../services/mockData';

interface AuthContextType {
  currentUser: UserProfile;
  currentCenter: Center;
  availableCenters: Center[];
  centerUsers: UserProfile[];
  allUsers: UserProfile[];
  centerRequests: CenterCreationRequest[];
  isSAdmin: boolean;
  isAdmin: boolean;
  isUser: boolean;
  switchDemoUser: (target: 'sadmin' | 'admin1' | 'admin2' | 'user') => void;
  switchCenter: (centerId: string) => void;
  // Center Creation Request Workflow (Feature c)
  raiseCenterRequest: (data: { name: string; code: string; city: string; state: string; country: string }) => Promise<void>;
  approveCenterRequest: (requestId: string) => Promise<void>;
  rejectCenterRequest: (requestId: string, reason?: string) => Promise<void>;
  // User Management Workflow (Feature d & 1)
  assignUserRole: (uid: string, newRole: 'admin' | 'user') => Promise<void>;
  removeUserFromCenter: (uid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [centers, setCenters] = useState<Center[]>(INITIAL_CENTERS);
  const [centerRequests, setCenterRequests] = useState<CenterCreationRequest[]>(INITIAL_CENTER_REQUESTS);

  // Default demo user: Krishna Chaitanya Dasa (Admin 1 of Ponda)
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS[1]);
  const [currentCenter, setCurrentCenter] = useState<Center>(INITIAL_CENTERS[0]);

  // Sync current center when user changes
  useEffect(() => {
    if (currentUser.role === 'sadmin') {
      // Sadmin has access to currentCenter or all
    } else {
      const userCenter = centers.find((c) => c.id === currentUser.centerId) || centers[0];
      setCurrentCenter(userCenter);
    }
  }, [currentUser, centers]);

  const isSAdmin = currentUser.role === 'sadmin';
  const isAdmin = currentUser.role === 'admin';
  const isUser = currentUser.role === 'user';

  // Demo Switcher for fast live testing of RBAC and Maker-Checker
  const switchDemoUser = (target: 'sadmin' | 'admin1' | 'admin2' | 'user') => {
    switch (target) {
      case 'sadmin':
        setCurrentUser(users[0]); // SAdmin
        break;
      case 'admin1':
        setCurrentUser(users[1]); // Admin 1
        setCurrentCenter(centers[0]);
        break;
      case 'admin2':
        setCurrentUser(users[2]); // Admin 2
        setCurrentCenter(centers[0]);
        break;
      case 'user':
        setCurrentUser(users[3]); // Normal User
        setCurrentCenter(centers[0]);
        break;
    }
  };

  const switchCenter = (centerId: string) => {
    if (!isSAdmin) {
      alert('Only Super Admin can switch across centers!');
      return;
    }
    const c = centers.find((item) => item.id === centerId);
    if (c) setCurrentCenter(c);
  };

  // Feature c: Admin raises request to add a new center
  const raiseCenterRequest = async (data: {
    name: string;
    code: string;
    city: string;
    state: string;
    country: string;
  }) => {
    const newReq: CenterCreationRequest = {
      id: `req_${Date.now()}`,
      name: data.name,
      code: data.code.toUpperCase(),
      city: data.city,
      state: data.state,
      country: data.country,
      requestedByAdminId: currentUser.uid,
      requestedByAdminName: currentUser.name,
      requestedByAdminEmail: currentUser.email,
      requestedAt: new Date().toISOString(),
      status: 'pending_approval',
    };

    setCenterRequests((prev) => [newReq, ...prev]);
  };

  // Feature c: SAdmin approves center request
  const approveCenterRequest = async (requestId: string) => {
    if (!isSAdmin) return;
    const req = centerRequests.find((r) => r.id === requestId);
    if (!req) return;

    const newCenter: Center = {
      id: `center_${req.code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: req.name,
      code: req.code,
      city: req.city,
      state: req.state,
      country: req.country,
      status: 'active',
      requestedByAdminId: req.requestedByAdminId,
      requestedByAdminName: req.requestedByAdminName,
      approvedBySadminId: currentUser.uid,
      approvedAt: new Date().toISOString(),
      userCount: 1,
      createdAt: new Date().toISOString(),
    };

    setCenters((prev) => [...prev, newCenter]);
    setCenterRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r))
    );
  };

  const rejectCenterRequest = async (requestId: string, reason = 'Did not meet requirements') => {
    if (!isSAdmin) return;
    setCenterRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected', rejectionReason: reason } : r))
    );
  };

  // Feature d & 1: Admin can only assign new admin from the existing users of their center
  const assignUserRole = async (uid: string, newRole: 'admin' | 'user') => {
    const targetUser = users.find((u) => u.uid === uid);
    if (!targetUser) return;

    if (!isSAdmin && targetUser.centerId !== currentCenter.id) {
      alert('Unauthorized: You can only manage users within your own center.');
      return;
    }

    setUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, role: newRole, updatedAt: new Date().toISOString() } : u))
    );
  };

  const removeUserFromCenter = async (uid: string) => {
    setUsers((prev) => prev.filter((u) => u.uid !== uid));
  };

  const centerUsers = users.filter((u) => u.centerId === currentCenter.id);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentCenter,
        availableCenters: centers.filter((c) => c.status === 'active'),
        centerUsers,
        allUsers: users,
        centerRequests,
        isSAdmin,
        isAdmin,
        isUser,
        switchDemoUser,
        switchCenter,
        raiseCenterRequest,
        approveCenterRequest,
        rejectCenterRequest,
        assignUserRole,
        removeUserFromCenter,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
