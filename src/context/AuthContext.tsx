import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../types/user';
import { Center, CenterCreationRequest } from '../types/center';
import { authService, SignUpParams } from '../services/authService';
import { sessionService } from '../services/sessionService';
import { isFirebaseConfigured } from '../config/firebase';
import { useToast } from './ToastContext';

const EMPTY_USER: UserProfile = {
  uid: '',
  name: '',
  email: '',
  role: 'user',
  centerId: '',
  centerName: '',
  createdAt: '',
  updatedAt: '',
};

const EMPTY_CENTER: Center = {
  id: '',
  name: '',
  code: '',
  city: '',
  state: '',
  country: '',
  status: 'active',
  createdAt: '',
};

interface AuthContextType {
  currentUser: UserProfile;
  firebaseUser: FirebaseUser | null;
  currentCenter: Center;
  availableCenters: Center[];
  allCenters: Center[];
  centerUsers: UserProfile[];
  allUsers: UserProfile[];
  centerRequests: CenterCreationRequest[];
  isSAdmin: boolean;
  isAdmin: boolean;
  isUser: boolean;
  isAuthLoading: boolean;
  isFirebaseConfigured: boolean;
  sessionMinutesLeft: number | null;
  sessionExpiredNotice: string | null;
  clearSessionExpiredNotice: () => void;
  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (centerId?: string, centerName?: string, mode?: 'login' | 'signup') => Promise<void>;
  signUp: (params: SignUpParams) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  completeCenterSelection: (centerId: string, centerName: string) => Promise<void>;
  switchCenter: (centerId: string) => void;
  // Center Creation Request Workflow (Feature c)
  raiseCenterRequest: (data: { name: string; code: string; city: string; state: string; country: string }) => Promise<void>;
  approveCenterRequest: (requestId: string) => Promise<void>;
  rejectCenterRequest: (requestId: string, reason?: string) => Promise<void>;
  // Center Management (Feature e & SAdmin controls)
  toggleCenterStatus: (centerId: string) => Promise<void>;
  deleteCenter: (centerId: string) => Promise<void>;
  // User Management Workflow (Feature d & 1)
  assignUserRole: (uid: string, newRole: 'admin' | 'user') => Promise<void>;
  removeUserFromCenter: (uid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [centerRequests, setCenterRequests] = useState<CenterCreationRequest[]>([]);

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(isFirebaseConfigured);

  const [currentUser, setCurrentUser] = useState<UserProfile>(EMPTY_USER);
  const [currentCenter, setCurrentCenter] = useState<Center>(EMPTY_CENTER);
  const [sessionMinutesLeft, setSessionMinutesLeft] = useState<number | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);

  const clearSessionExpiredNotice = () => setSessionExpiredNotice(null);

  // Sync centers, users, requests and listen to Firebase Auth on mount
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    authService.getCenters().then((fetchedCenters) => {
      if (fetchedCenters && fetchedCenters.length > 0) {
        setCenters(fetchedCenters);
      }
    });

    authService.getAllUsers().then((fetchedUsers) => {
      if (fetchedUsers && fetchedUsers.length > 0) {
        setUsers((prev) => {
          const map = new Map<string, UserProfile>();
          for (const u of [...prev, ...fetchedUsers]) {
            const key = (u.emailLower || u.email || u.uid).trim().toLowerCase();
            map.set(key, u);
          }
          return Array.from(map.values());
        });
      }
    });

    authService.getCenterRequests().then((fetchedRequests) => {
      if (fetchedRequests && fetchedRequests.length > 0) {
        setCenterRequests(fetchedRequests);
      }
    });

    const unsubscribe = authService.onAuthStateChange((fbUser, profile) => {
      setIsAuthLoading(false);
      if (fbUser && profile) {
        setFirebaseUser(fbUser);
        setCurrentUser(profile);

        setUsers((prev) => {
          const emailKey = (profile.emailLower || profile.email || profile.uid).trim().toLowerCase();
          const filtered = prev.filter(
            (u) => u.uid !== profile.uid && (u.emailLower || u.email || u.uid).trim().toLowerCase() !== emailKey
          );
          return [profile, ...filtered];
        });
      } else {
        setFirebaseUser(null);
        setCurrentUser(EMPTY_USER);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync current center when user or centers change
  useEffect(() => {
    if (centers.length === 0) return;
    if (currentUser.role === 'sadmin') {
      if (!currentCenter.id) {
        setCurrentCenter(centers[0]);
      }
    } else if (currentUser.centerId) {
      const userCenter = centers.find((c) => c.id === currentUser.centerId) || centers[0];
      if (userCenter) {
        setCurrentCenter(userCenter);
      }
    } else if (!currentCenter.id) {
      setCurrentCenter(centers[0]);
    }
  }, [currentUser, centers]);

  const isSAdmin = currentUser.role === 'sadmin';
  const isAdmin = currentUser.role === 'admin';
  const isUser = currentUser.role === 'user';

  // Real Firebase Auth Actions (do NOT toggle global isAuthLoading so forms don't unmount & lose error state)
  const login = async (email: string, password: string) => {
    setSessionExpiredNotice(null);
    const { firebaseUser: fbUser, profile } = await authService.signIn(email, password);
    setFirebaseUser(fbUser);
    setCurrentUser(profile);
  };

  const loginWithGoogle = async (centerId?: string, centerName?: string, mode: 'login' | 'signup' = 'login') => {
    setSessionExpiredNotice(null);
    const { firebaseUser: fbUser, profile } = await authService.signInWithGoogle(centerId, centerName, mode);
    setFirebaseUser(fbUser);
    setCurrentUser(profile);
  };

  const signUp = async (params: SignUpParams) => {
    setSessionExpiredNotice(null);
    await authService.signUp(params);
  };

  const logout = async () => {
    setIsAuthLoading(true);
    try {
      await authService.signOut();
      setFirebaseUser(null);
      setCurrentUser(EMPTY_USER);
      setSessionMinutesLeft(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // 30-Minute Session Timeout Enforcement
  useEffect(() => {
    if (!firebaseUser) {
      setSessionMinutesLeft(null);
      return;
    }

    const checkSession = () => {
      const session = sessionService.getLocalSession();
      if (!session) return;

      const remainingMs = session.expiresAt - Date.now();
      if (remainingMs <= 0) {
        setSessionExpiredNotice('Your 30-minute session has expired. Please sign in again.');
        logout();
      } else {
        setSessionMinutesLeft(Math.max(1, Math.ceil(remainingMs / 60000)));
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 10000);
    return () => clearInterval(interval);
  }, [firebaseUser]);

  const resetPassword = async (email: string) => {
    await authService.resetPassword(email);
  };

  const completeCenterSelection = async (centerId: string, centerName: string) => {
    const updated = await authService.updateUserCenter(currentUser.uid, centerId, centerName);
    const nextUser: UserProfile = updated || {
      ...currentUser,
      centerId,
      centerName,
      needsCenterSelection: false,
      updatedAt: new Date().toISOString(),
    };
    setCurrentUser(nextUser);
    setUsers((prev) => {
      const emailKey = (nextUser.emailLower || nextUser.email || nextUser.uid).trim().toLowerCase();
      const filtered = prev.filter(
        (u) => u.uid !== nextUser.uid && (u.emailLower || u.email || u.uid).trim().toLowerCase() !== emailKey
      );
      return [nextUser, ...filtered];
    });
    const chosenCenter = centers.find((c) => c.id === centerId);
    if (chosenCenter) {
      setCurrentCenter(chosenCenter);
    }
  };

  const switchCenter = (centerId: string) => {
    if (!isSAdmin) {
      showToast('Only Super Admin can switch across centers!', 'error');
      return;
    }
    const c = centers.find((item) => item.id === centerId);
    if (c) setCurrentCenter(c);
  };

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
    await authService.saveCenterRequest(newReq);
  };

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
    await authService.createCenter(newCenter);

    const updatedReq: CenterCreationRequest = { ...req, status: 'approved' };
    setCenterRequests((prev) =>
      prev.map((r) => (r.id === requestId ? updatedReq : r))
    );
    await authService.saveCenterRequest(updatedReq);
  };

  const rejectCenterRequest = async (requestId: string, reason = 'Did not meet requirements') => {
    if (!isSAdmin) return;
    const req = centerRequests.find((r) => r.id === requestId);
    if (!req) return;
    const updatedReq: CenterCreationRequest = { ...req, status: 'rejected', rejectionReason: reason };
    setCenterRequests((prev) =>
      prev.map((r) => (r.id === requestId ? updatedReq : r))
    );
    await authService.saveCenterRequest(updatedReq);
  };

  const toggleCenterStatus = async (centerId: string) => {
    if (!isSAdmin) {
      showToast('Only Super Admin can activate or deactivate centers.', 'error');
      return;
    }
    const center = centers.find((c) => c.id === centerId);
    if (!center) return;
    const newStatus = center.status === 'active' ? 'inactive' : 'active';

    setCenters((prev) =>
      prev.map((c) => (c.id === centerId ? { ...c, status: newStatus } : c))
    );
    await authService.updateCenterStatus(centerId, newStatus);
    showToast(`Center "${center.name}" is now ${newStatus}.`, 'success');
  };

  const deleteCenter = async (centerId: string) => {
    if (!isSAdmin) {
      showToast('Only Super Admin can delete centers.', 'error');
      return;
    }
    const target = centers.find((c) => c.id === centerId);
    setCenters((prev) => prev.filter((c) => c.id !== centerId));
    if (currentCenter.id === centerId) {
      const remaining = centers.filter((c) => c.id !== centerId);
      if (remaining.length > 0) {
        setCurrentCenter(remaining[0]);
      } else {
        setCurrentCenter(EMPTY_CENTER);
      }
    }
    await authService.deleteCenter(centerId);
    showToast(`Center "${target?.name || centerId}" deleted.`, 'info');
  };

  const assignUserRole = async (uid: string, newRole: 'admin' | 'user') => {
    const targetUser = users.find((u) => u.uid === uid);
    if (!targetUser) return;

    if (targetUser.role === 'sadmin') {
      showToast('Unauthorized: Super Admin role is protected and cannot be changed.', 'error');
      return;
    }

    if (!isSAdmin && targetUser.centerId !== currentCenter.id) {
      showToast('Unauthorized: You can only manage users within your own center.', 'error');
      return;
    }

    setUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, role: newRole, updatedAt: new Date().toISOString() } : u))
    );
    await authService.updateUserRoleInDb(uid, newRole);
    showToast(
      `Updated ${targetUser.name}'s role to ${newRole === 'admin' ? 'Admin' : 'Devotee'}.`,
      'success'
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
        firebaseUser,
        currentCenter,
        availableCenters: centers.filter((c) => c.status === 'active'),
        allCenters: centers,
        centerUsers,
        allUsers: users,
        centerRequests,
        isSAdmin,
        isAdmin,
        isUser,
        isAuthLoading,
        isFirebaseConfigured,
        sessionMinutesLeft,
        sessionExpiredNotice,
        clearSessionExpiredNotice,
        login,
        loginWithGoogle,
        signUp,
        logout,
        resetPassword,
        completeCenterSelection,
        switchCenter,
        raiseCenterRequest,
        approveCenterRequest,
        rejectCenterRequest,
        toggleCenterStatus,
        deleteCenter,
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
