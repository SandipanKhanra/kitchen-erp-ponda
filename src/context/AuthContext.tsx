import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile, UserRole } from '../types/user';
import { Center, CenterCreationRequest } from '../types/center';
import { INITIAL_USERS, INITIAL_CENTERS, INITIAL_CENTER_REQUESTS } from '../services/mockData';
import { authService, SignUpParams } from '../services/authService';
import { sessionService } from '../services/sessionService';
import { isFirebaseConfigured } from '../config/firebase';

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
  isDemoMode: boolean;
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
  setDemoMode: (enabled: boolean) => void;
  completeCenterSelection: (centerId: string, centerName: string) => Promise<void>;
  // Demo Switcher
  switchDemoUser: (target: 'sadmin' | 'admin1' | 'admin2' | 'user') => void;
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
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [centers, setCenters] = useState<Center[]>(INITIAL_CENTERS);
  const [centerRequests, setCenterRequests] = useState<CenterCreationRequest[]>(INITIAL_CENTER_REQUESTS);

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(isFirebaseConfigured);
  const [isDemoMode, setIsDemoModeState] = useState<boolean>(() => {
    if (!isFirebaseConfigured) return true;
    return localStorage.getItem('kitchen_demo_mode') === 'true';
  });

  // Default demo user: Krishna Chaitanya Dasa (Admin 1 of Ponda)
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS[1]);
  const [currentCenter, setCurrentCenter] = useState<Center>(INITIAL_CENTERS[0]);
  const [sessionMinutesLeft, setSessionMinutesLeft] = useState<number | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);

  const clearSessionExpiredNotice = () => setSessionExpiredNotice(null);

  const setDemoMode = (enabled: boolean) => {
    setIsDemoModeState(enabled);
    localStorage.setItem('kitchen_demo_mode', enabled ? 'true' : 'false');
    if (enabled && !firebaseUser) {
      setSessionExpiredNotice(null);
      setCurrentUser(users[1]); // Default to Admin 1
      sessionService.createDemoSession(users[1].uid, users[1].email);
    } else if (!enabled && !firebaseUser) {
      sessionService.endCurrentSession();
      setSessionMinutesLeft(null);
    }
  };

  // Sync centers and listen to Firebase Auth on mount
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    // Load centers from Firestore
    authService.getCenters().then((fetchedCenters) => {
      if (fetchedCenters && fetchedCenters.length > 0) {
        setCenters(fetchedCenters);
      }
    });

    // Load unified users from Firestore (deduplicated by email)
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

    // Listen to Firebase Auth state
    const unsubscribe = authService.onAuthStateChange((fbUser, profile) => {
      setIsAuthLoading(false);
      if (fbUser && profile) {
        setFirebaseUser(fbUser);
        setCurrentUser(profile);
        setIsDemoModeState(false);
        localStorage.setItem('kitchen_demo_mode', 'false');

        // Unify / deduplicate in allUsers by normalized email
        setUsers((prev) => {
          const emailKey = (profile.emailLower || profile.email || profile.uid).trim().toLowerCase();
          const filtered = prev.filter(
            (u) => u.uid !== profile.uid && (u.emailLower || u.email || u.uid).trim().toLowerCase() !== emailKey
          );
          return [profile, ...filtered];
        });
      } else {
        setFirebaseUser(null);
        // If not in demo mode and no user, we leave currentUser as placeholder but firebaseUser as null
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync current center when user changes
  useEffect(() => {
    if (currentUser.role === 'sadmin') {
      // SAdmin can access all centers, keep current selection or default to first
      if (!currentCenter && centers.length > 0) {
        setCurrentCenter(centers[0]);
      }
    } else {
      const userCenter = centers.find((c) => c.id === currentUser.centerId) || centers[0];
      if (userCenter) {
        setCurrentCenter(userCenter);
      }
    }
  }, [currentUser, centers]);

  const isSAdmin = currentUser.role === 'sadmin';
  const isAdmin = currentUser.role === 'admin';
  const isUser = currentUser.role === 'user';

  // Real Firebase Auth Actions
  const login = async (email: string, password: string) => {
    setIsAuthLoading(true);
    setSessionExpiredNotice(null);
    try {
      const profile = await authService.signIn(email, password);
      setCurrentUser(profile);
      setIsDemoModeState(false);
      localStorage.setItem('kitchen_demo_mode', 'false');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const loginWithGoogle = async (centerId?: string, centerName?: string, mode: 'login' | 'signup' = 'login') => {
    setIsAuthLoading(true);
    setSessionExpiredNotice(null);
    try {
      const profile = await authService.signInWithGoogle(centerId, centerName, mode);
      setCurrentUser(profile);
      setIsDemoModeState(false);
      localStorage.setItem('kitchen_demo_mode', 'false');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signUp = async (params: SignUpParams) => {
    setIsAuthLoading(true);
    setSessionExpiredNotice(null);
    try {
      const profile = await authService.signUp(params);
      setCurrentUser(profile);
      setIsDemoModeState(false);
      localStorage.setItem('kitchen_demo_mode', 'false');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = async () => {
    setIsAuthLoading(true);
    try {
      await authService.signOut();
      setFirebaseUser(null);
      setIsDemoModeState(false);
      setSessionMinutesLeft(null);
      localStorage.removeItem('kitchen_demo_mode');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // 30-Minute Session Timeout Enforcement
  useEffect(() => {
    const isAuthenticated = Boolean(firebaseUser || isDemoMode);
    if (!isAuthenticated) {
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
    const interval = setInterval(checkSession, 10000); // check every 10s
    return () => clearInterval(interval);
  }, [firebaseUser, isDemoMode]);

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

  // Center Status Toggle & Deletion (SAdmin controls)
  const toggleCenterStatus = async (centerId: string) => {
    if (!isSAdmin) {
      alert('Only Super Admin can activate or deactivate centers.');
      return;
    }
    const center = centers.find((c) => c.id === centerId);
    if (!center) return;
    const newStatus = center.status === 'active' ? 'inactive' : 'active';

    setCenters((prev) =>
      prev.map((c) => (c.id === centerId ? { ...c, status: newStatus } : c))
    );
    await authService.updateCenterStatus(centerId, newStatus);
  };

  const deleteCenter = async (centerId: string) => {
    if (!isSAdmin) {
      alert('Only Super Admin can delete centers.');
      return;
    }
    setCenters((prev) => prev.filter((c) => c.id !== centerId));
    if (currentCenter.id === centerId) {
      const remaining = centers.filter((c) => c.id !== centerId);
      if (remaining.length > 0) {
        setCurrentCenter(remaining[0]);
      }
    }
    await authService.deleteCenter(centerId);
  };

  // Feature d & 1: Admin can only assign new admin from the existing users of their center
  const assignUserRole = async (uid: string, newRole: 'admin' | 'user') => {
    const targetUser = users.find((u) => u.uid === uid);
    if (!targetUser) return;

    if (targetUser.role === 'sadmin') {
      alert('Unauthorized: Super Admin role is protected and cannot be changed.');
      return;
    }

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
        isDemoMode,
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
        setDemoMode,
        completeCenterSelection,
        switchDemoUser,
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
