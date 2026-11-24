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
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../config/firebase';
import { UserProfile, UserRole } from '../types/user';
import { Center } from '../types/center';
import { INITIAL_CENTERS } from './mockData';

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
  centerId: string;
  centerName: string;
  passcode?: string;
}

export class AuthService {
  /**
   * Register a new user in Firebase Auth and persist profile to Firestore
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

    // Determine initial role based on admin authorization passcode or default 'user'
    let role: UserRole = 'user';
    const trimmedPasscode = passcode?.trim().toUpperCase();
    if (trimmedPasscode === 'SADMIN' || trimmedPasscode === 'PONDA-SADMIN' || trimmedPasscode === 'ISKCON-SADMIN' || email.toLowerCase().includes('sadmin')) {
      role = 'sadmin';
    } else if (trimmedPasscode === 'ADMIN' || trimmedPasscode === 'PONDA-ADMIN' || trimmedPasscode === 'ISKCON-ADMIN') {
      role = 'admin';
    }

    // 1. Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = cred.user;

    // 2. Update display name in Firebase Auth
    try {
      await updateProfile(user, { displayName: name.trim() });
    } catch (e) {
      console.warn('Could not update Firebase displayName:', e);
    }

    // 3. Create User Profile document in Firestore
    const now = new Date().toISOString();
    const userProfile: UserProfile = {
      uid: user.uid,
      name: name.trim(),
      email: user.email || email.trim(),
      role,
      centerId: role === 'sadmin' ? 'all' : centerId,
      centerName: role === 'sadmin' ? 'Global Administration' : centerName,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);
    return userProfile;
  }

  /**
   * Sign in existing user with Firebase Auth and retrieve profile from Firestore
   */
  async signIn(email: string, password: string): Promise<UserProfile> {
    if (!isFirebaseConfigured || !auth || !db) {
      throw new Error('Firebase credentials are not configured.');
    }

    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = cred.user;

    // Retrieve profile from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }

    // Fallback if profile doc does not exist yet (e.g. created manually in console)
    const now = new Date().toISOString();
    const fallbackProfile: UserProfile = {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Devotee',
      email: user.email || email.trim(),
      role: 'user',
      centerId: 'center_ponda',
      centerName: 'ISKCON Ponda Center',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(userDocRef, fallbackProfile);
    return fallbackProfile;
  }

  /**
   * Sign in with Google Popup
   */
  async signInWithGoogle(selectedCenterId?: string, selectedCenterName?: string): Promise<UserProfile> {
    if (!isFirebaseConfigured || !auth || !db) {
      throw new Error('Firebase credentials are not configured.');
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    const user = cred.user;

    const userDocRef = doc(db, 'users', user.uid);
    try {
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
      }
    } catch (e) {
      console.warn('Could not read existing user doc in Google sign in, proceeding to create/sync:', e);
    }

    // Default to Ponda Center or passed center
    const now = new Date().toISOString();
    const isSAdminEmail = Boolean(user.email && (user.email.toLowerCase().includes('sadmin') || user.email.toLowerCase() === 'sadmin@iskcon.org'));
    const role: UserRole = isSAdminEmail ? 'sadmin' : 'user';

    const newProfile: UserProfile = {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Devotee',
      email: user.email || '',
      role,
      centerId: role === 'sadmin' ? 'all' : (selectedCenterId || 'center_ponda'),
      centerName: role === 'sadmin' ? 'Global Administration' : (selectedCenterName || 'Ponda Center'),
      avatarUrl: user.photoURL || undefined,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(userDocRef, newProfile, { merge: true });
    } catch (e) {
      console.warn('Could not persist Google user profile to Firestore:', e);
    }
    return newProfile;
  }

  /**
   * Sign out current Firebase Auth user
   */
  async signOut(): Promise<void> {
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

      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) {
          callback(firebaseUser, snap.data() as UserProfile);
        } else {
          // If no doc exists yet, generate fallback profile and persist it
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
          // Asynchronously create the document for future reads
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
