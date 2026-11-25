import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../config/firebase';
import { UserProfile, UserRole } from '../types/user';
import { Center } from '../types/center';
import { INITIAL_CENTERS } from './mockData';
import { sessionService } from './sessionService';

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
  centerId: string;
  centerName: string;
  passcode?: string;
}

export class AuthService {
  private isAuthenticating = false;

  /**
   * Look up an existing user profile in Firestore by normalized email
   * so Google Sign-In and Email/Password registrations with the same email
   * are always treated as the same unified user.
   */
  async findUserByEmail(email: string): Promise<UserProfile | null> {
    if (!isFirebaseConfigured || !db || !email) return null;
    const normalized = email.trim().toLowerCase();
    try {
      const q1 = query(collection(db, 'users'), where('emailLower', '==', normalized));
      const snap1 = await getDocs(q1);
      if (!snap1.empty) {
        return snap1.docs[0].data() as UserProfile;
      }

      const q2 = query(collection(db, 'users'), where('email', '==', email.trim()));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        return snap2.docs[0].data() as UserProfile;
      }

      const q3 = query(collection(db, 'users'), where('email', '==', normalized));
      const snap3 = await getDocs(q3);
      if (!snap3.empty) {
        return snap3.docs[0].data() as UserProfile;
      }
    } catch (err) {
      console.warn('[AuthService] findUserByEmail notice:', err);
    }
    return null;
  }

  /**
   * Fetch all unique users from Firestore, deduplicated by emailLower
   */
  async getAllUsers(): Promise<UserProfile[]> {
    if (!isFirebaseConfigured || !db) return [];
    try {
      const snap = await getDocs(collection(db, 'users'));
      const byEmail = new Map<string, UserProfile>();
      snap.docs.forEach((d) => {
        const u = d.data() as UserProfile;
        const key = (u.emailLower || u.email || u.uid).trim().toLowerCase();
        const existing = byEmail.get(key);
        if (!existing || (u.updatedAt && existing.updatedAt && u.updatedAt > existing.updatedAt)) {
          byEmail.set(key, u);
        }
      });
      return Array.from(byEmail.values());
    } catch (err) {
      console.warn('[AuthService] getAllUsers notice:', err);
      return [];
    }
  }

  /**
   * Update user's selected center and mark onboarding center selection as complete
   */
  async updateUserCenter(uid: string, centerId: string, centerName: string): Promise<UserProfile | null> {
    if (!isFirebaseConfigured || !db) return null;
    const now = new Date().toISOString();
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(
        userRef,
        {
          centerId,
          centerName,
          needsCenterSelection: false,
          updatedAt: now,
        },
        { merge: true }
      );
      const snap = await getDoc(userRef);
      return snap.exists() ? (snap.data() as UserProfile) : null;
    } catch (err) {
      console.warn('[AuthService] updateUserCenter failed:', err);
      return null;
    }
  }

  /**
   * Register a new user in Firebase Auth and persist profile to Firestore.
   * Unifies with any existing profile sharing the same email.
   */
  async signUp({
    email,
    password,
    name,
    centerId,
    centerName,
    passcode,
  }: SignUpParams): Promise<UserProfile> {
    if (!isFirebaseConfigured || !auth || !db) {
      throw new Error('Firebase credentials are not configured.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Determine initial role based on admin authorization passcode or default 'user'
    let role: UserRole = 'user';
    const trimmedPasscode = passcode?.trim().toUpperCase();
    if (
      trimmedPasscode === 'SADMIN' ||
      trimmedPasscode === 'PONDA-SADMIN' ||
      trimmedPasscode === 'ISKCON-SADMIN' ||
      normalizedEmail.includes('sadmin')
    ) {
      role = 'sadmin';
    } else if (
      trimmedPasscode === 'ADMIN' ||
      trimmedPasscode === 'PONDA-ADMIN' ||
      trimmedPasscode === 'ISKCON-ADMIN'
    ) {
      role = 'admin';
    }

    // 1. Create Firebase Auth user (or handle if email already registered)
    let user: FirebaseUser;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      user = cred.user;
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        // Check if user can sign in with this password (existing email/password user)
        try {
          const signInCred = await signInWithEmailAndPassword(auth, email.trim(), password);
          user = signInCred.user;
          const existingSnap = await getDoc(doc(db, 'users', user.uid));
          if (existingSnap.exists()) {
            return existingSnap.data() as UserProfile;
          }
        } catch {
          throw new Error(
            'An account with this email already exists (e.g. via Google Sign-In). Please sign in using "Continue with Google" to access your existing account.'
          );
        }
      } else {
        throw err;
      }
    }

    // 2. Update display name in Firebase Auth
    try {
      await updateProfile(user, { displayName: name.trim() });
    } catch (e) {
      console.warn('Could not update Firebase displayName:', e);
    }

    // 3. Check if an account with the same email already exists in Firestore (e.g. from Google Sign-In)
    const existingByEmail = await this.findUserByEmail(normalizedEmail);
    const now = new Date().toISOString();

    if (existingByEmail) {
      const unifiedProfile: UserProfile = {
        ...existingByEmail,
        uid: user.uid,
        name: existingByEmail.name || name.trim(),
        email: user.email || email.trim(),
        emailLower: normalizedEmail,
        role: role !== 'user' ? role : existingByEmail.role,
        centerId: existingByEmail.centerId || (role === 'sadmin' ? 'all' : centerId),
        centerName: existingByEmail.centerName || (role === 'sadmin' ? 'Global Administration' : centerName),
        authProviders: Array.from(new Set([...(existingByEmail.authProviders || []), 'password'])),
        needsCenterSelection: false,
        updatedAt: now,
      };
      await setDoc(doc(db, 'users', user.uid), unifiedProfile, { merge: true });
      return unifiedProfile;
    }

    // 4. Create new User Profile document in Firestore
    const userProfile: UserProfile = {
      uid: user.uid,
      name: name.trim(),
      email: user.email || email.trim(),
      emailLower: normalizedEmail,
      role,
      centerId: role === 'sadmin' ? 'all' : centerId,
      centerName: role === 'sadmin' ? 'Global Administration' : centerName,
      authProviders: ['password'],
      needsCenterSelection: false,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);
    await sessionService.createSession(userProfile.uid, userProfile.email);
    return userProfile;
  }

  /**
   * Sign in existing user with Firebase Auth and retrieve profile from Firestore
   */
  async signIn(email: string, password: string): Promise<UserProfile> {
    if (!isFirebaseConfigured || !auth || !db) {
      throw new Error('Firebase credentials are not configured.');
    }

    this.isAuthenticating = true;
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = cred.user;

      // Retrieve profile from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      let profile: UserProfile;
      if (userSnap.exists()) {
        profile = userSnap.data() as UserProfile;
      } else {
        const now = new Date().toISOString();
        profile = {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Devotee',
          email: user.email || email.trim(),
          emailLower: (user.email || email.trim()).toLowerCase(),
          role: 'user',
          centerId: 'center_ponda',
          centerName: 'ISKCON Ponda Center',
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(userDocRef, profile);
      }

      // Enforce 2-device limit & 30-min session
      try {
        await sessionService.createSession(profile.uid, profile.email);
      } catch (sessionErr) {
        await firebaseSignOut(auth);
        throw sessionErr;
      }

      return profile;
    } finally {
      this.isAuthenticating = false;
    }
  }

  /**
   * Sign in with Google Popup.
   * - If an account with the same email already exists (e.g. from Email/Password),
   *   unifies into the same user profile without creating a duplicate.
   * - If brand new Google user, marks `needsCenterSelection: true` so they can choose their center.
   */
  async signInWithGoogle(
    selectedCenterId?: string,
    selectedCenterName?: string,
    mode: 'login' | 'signup' = 'login'
  ): Promise<UserProfile> {
    if (!isFirebaseConfigured || !auth || !db) {
      throw new Error('Firebase credentials are not configured.');
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    this.isAuthenticating = true;
    try {
      const cred = await signInWithPopup(auth, provider);
      const user = cred.user;
      const normalizedEmail = (user.email || '').trim().toLowerCase();
      const now = new Date().toISOString();

      let profile: UserProfile | null = null;
      let alreadyExists = false;
      const userDocRef = doc(db, 'users', user.uid);

      try {
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          alreadyExists = true;
          const existing = userSnap.data() as UserProfile;
          const providers = Array.from(new Set([...(existing.authProviders || []), 'google.com']));
          if (!existing.emailLower || !existing.authProviders?.includes('google.com')) {
            const updated: UserProfile = {
              ...existing,
              emailLower: normalizedEmail,
              avatarUrl: user.photoURL || existing.avatarUrl,
              authProviders: providers,
              updatedAt: now,
            };
            await setDoc(userDocRef, updated, { merge: true }).catch(() => {});
            profile = updated;
          } else {
            profile = existing;
          }
        }
      } catch (e) {
        console.warn('Could not read existing user doc in Google sign in, checking email:', e);
      }

      if (!profile) {
        // Check if a profile with this exact email already exists (e.g., created via Email/Password)
        const existingByEmail = await this.findUserByEmail(normalizedEmail);
        if (existingByEmail) {
          alreadyExists = true;
          profile = {
            ...existingByEmail,
            uid: user.uid,
            email: user.email || existingByEmail.email,
            emailLower: normalizedEmail,
            avatarUrl: user.photoURL || existingByEmail.avatarUrl,
            authProviders: Array.from(new Set([...(existingByEmail.authProviders || ['password']), 'google.com'])),
            needsCenterSelection: existingByEmail.needsCenterSelection ?? false,
            updatedAt: now,
          };
          try {
            await setDoc(userDocRef, profile, { merge: true });
          } catch (e) {
            console.warn('Could not persist unified Google user profile to Firestore:', e);
          }
        }
      }

      // If user clicked "Register with Google" on Sign Up tab, but this Gmail is already registered:
      if (alreadyExists && profile && mode === 'signup') {
        await firebaseSignOut(auth);
        throw new Error(
          `This Gmail (${user.email || normalizedEmail}) is already registered${profile.centerName ? ` under ${profile.centerName}` : ''}. Please switch to "Devotee Sign In" and use "Continue with Google" instead.`
        );
      }

      if (!profile) {
        // Brand new Google user -> prompt center selection if not sadmin and no center explicitly chosen
        const isSAdminEmail = Boolean(
          normalizedEmail && (normalizedEmail.includes('sadmin') || normalizedEmail === 'sadmin@iskcon.org')
        );
        const role: UserRole = isSAdminEmail ? 'sadmin' : 'user';
        const requiresCenterPick = role !== 'sadmin' && !selectedCenterId;

        profile = {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Devotee',
          email: user.email || '',
          emailLower: normalizedEmail,
          role,
          centerId: role === 'sadmin' ? 'all' : (selectedCenterId || 'center_ponda'),
          centerName: role === 'sadmin' ? 'Global Administration' : (selectedCenterName || 'ISKCON Ponda Center'),
          avatarUrl: user.photoURL || undefined,
          authProviders: ['google.com'],
          needsCenterSelection: requiresCenterPick,
          createdAt: now,
          updatedAt: now,
        };

        try {
          await setDoc(userDocRef, profile, { merge: true });
        } catch (e) {
          console.warn('Could not persist Google user profile to Firestore:', e);
        }
      }

      // Enforce 2-device limit & 30-min session
      try {
        await sessionService.createSession(profile.uid, profile.email);
      } catch (sessionErr) {
        await firebaseSignOut(auth);
        throw sessionErr;
      }

      return profile;
    } finally {
      this.isAuthenticating = false;
    }
  }

  /**
   * Sign out current Firebase Auth user and clear session
   */
  async signOut(): Promise<void> {
    await sessionService.endCurrentSession();
    if (auth) {
      await firebaseSignOut(auth);
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<void> {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase credentials are not configured.');
    }
    await sendPasswordResetEmail(auth, email.trim());
  }

  /**
   * Fetch active centers from Firestore, seeding initial centers if empty
   */
  async getCenters(): Promise<Center[]> {
    if (!isFirebaseConfigured || !db) {
      return INITIAL_CENTERS;
    }

    try {
      const snap = await getDocs(collection(db, 'centers'));
      if (snap.empty) {
        // Seed initial centers to Firestore for instant usability
        await this.seedInitialCenters();
        return INITIAL_CENTERS;
      }
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Center));
    } catch (err) {
      console.warn('Could not fetch centers from Firestore, falling back to initial data:', err);
      return INITIAL_CENTERS;
    }
  }

  /**
   * Update center status (e.g. active <-> inactive) in Firestore
   */
  async updateCenterStatus(centerId: string, status: Center['status']): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    try {
      await updateDoc(doc(db, 'centers', centerId), {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Failed to update center status in Firestore:', err);
    }
  }

  /**
   * Delete center from Firestore
   */
  async deleteCenter(centerId: string): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    try {
      await deleteDoc(doc(db, 'centers', centerId));
    } catch (err) {
      console.warn('Failed to delete center in Firestore:', err);
    }
  }

  /**
   * Seed initial centers into Firestore
   */
  private async seedInitialCenters(): Promise<void> {
    if (!db) return;
    try {
      for (const center of INITIAL_CENTERS) {
        await setDoc(doc(db, 'centers', center.id), center);
      }
    } catch (e) {
      console.warn('Failed to seed centers to Firestore:', e);
    }
  }

  /**
   * Subscribe to Firebase Auth state changes
   */
  onAuthStateChange(callback: (user: FirebaseUser | null, profile: UserProfile | null) => void) {
    if (!isFirebaseConfigured || !auth) {
      callback(null, null);
      return () => {};
    }

    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        callback(null, null);
        return;
      }

      if (!db) {
        callback(firebaseUser, null);
        return;
      }

      // Skip intermediate auth state check while signIn/signUp/Google popup is creating the session
      if (!this.isAuthenticating) {
        const localSession = sessionService.getLocalSession();
        if (localSession && sessionService.isSessionExpired(localSession)) {
          await sessionService.endCurrentSession();
          if (auth) await firebaseSignOut(auth);
          callback(null, null);
          return;
        }
        if (!localSession) {
          try {
            await sessionService.createSession(firebaseUser.uid, firebaseUser.email || '');
          } catch {
            if (auth) await firebaseSignOut(auth);
            callback(null, null);
            return;
          }
        }
      }

      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) {
          callback(firebaseUser, snap.data() as UserProfile);
        } else {
          // Before generating a new profile, check if a profile with the same email already exists
          const normalizedEmail = (firebaseUser.email || '').trim().toLowerCase();
          const existingByEmail = await this.findUserByEmail(normalizedEmail);
          if (existingByEmail) {
            const unifiedProfile: UserProfile = {
              ...existingByEmail,
              uid: firebaseUser.uid,
              emailLower: normalizedEmail,
              avatarUrl: firebaseUser.photoURL || existingByEmail.avatarUrl,
              updatedAt: new Date().toISOString(),
            };
            setDoc(doc(db, 'users', firebaseUser.uid), unifiedProfile, { merge: true }).catch(() => {});
            callback(firebaseUser, unifiedProfile);
            return;
          }

          const isGoogleUser = firebaseUser.providerData?.some((p) => p.providerId === 'google.com');
          const isSAdminEmail = Boolean(
            normalizedEmail && (normalizedEmail.includes('sadmin') || normalizedEmail === 'sadmin@iskcon.org')
          );
          const role: UserRole = isSAdminEmail ? 'sadmin' : 'user';

          const fallbackProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Devotee',
            email: firebaseUser.email || '',
            emailLower: normalizedEmail,
            role,
            centerId: role === 'sadmin' ? 'all' : 'center_ponda',
            centerName: role === 'sadmin' ? 'Global Administration' : 'ISKCON Ponda Center',
            avatarUrl: firebaseUser.photoURL || undefined,
            authProviders: isGoogleUser ? ['google.com'] : ['password'],
            needsCenterSelection: Boolean(isGoogleUser && role !== 'sadmin'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setDoc(doc(db, 'users', firebaseUser.uid), fallbackProfile, { merge: true }).catch((err) => {
            console.warn('Initial profile doc auto-creation notice:', err);
          });
          callback(firebaseUser, fallbackProfile);
        }
      } catch (e) {
        console.warn('Error fetching user profile from Firestore, using fallback profile:', e);
        const fallbackProfile: UserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Devotee',
          email: firebaseUser.email || '',
          role: 'user',
          centerId: 'center_ponda',
          centerName: 'Ponda Center',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        callback(firebaseUser, fallbackProfile);
      }
    });
  }
}

export const authService = new AuthService();
