import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { PublicSite, GuestRsvp } from '../types/invitation';

// Initialize Firebase App and Services
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on initial boot as required by Firebase skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    return true;
  }
}

// Test connection on startup
testConnection().catch(() => {
  // Safe startup probe
});

export interface SystemConfig {
  adminUsername: string;
  adminPasswordHash: string;
  updatedAt?: string;
}

// ==========================================
// Centralized Cloud Real-Time Services
// ==========================================

/**
 * Real-time subscription to all public sites in the centralized database
 */
export function subscribeToSites(
  onUpdate: (sites: PublicSite[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const sitesRef = collection(db, 'sites');
  return onSnapshot(
    sitesRef,
    (snapshot) => {
      const sites: PublicSite[] = [];
      snapshot.forEach((docSnap) => {
        const siteData = docSnap.data() as Omit<PublicSite, 'rsvps'> & { rsvps?: GuestRsvp[] };
        sites.push({
          ...siteData,
          id: docSnap.id,
          rsvps: siteData.rsvps || [],
        });
      });
      onUpdate(sites);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, 'sites');
    }
  );
}

/**
 * Real-time subscription to RSVPs for a given site
 */
export function subscribeToSiteRsvps(
  siteId: string,
  onUpdate: (rsvps: GuestRsvp[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const rsvpsRef = collection(db, 'sites', siteId, 'rsvps');
  return onSnapshot(
    rsvpsRef,
    (snapshot) => {
      const rsvps: GuestRsvp[] = [];
      snapshot.forEach((docSnap) => {
        rsvps.push(docSnap.data() as GuestRsvp);
      });
      // Sort newest first
      rsvps.sort((a, b) => b.id.localeCompare(a.id));
      onUpdate(rsvps);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, `sites/${siteId}/rsvps`);
    }
  );
}

/**
 * Save / Update a site in the centralized cloud database
 */
export async function saveSiteToCloud(site: PublicSite): Promise<void> {
  const path = `sites/${site.id}`;
  try {
    const siteRef = doc(db, 'sites', site.id);
    // Separate rsvps array so subcollection is source of truth or keep synced
    const { rsvps, ...restSite } = site;
    // Deep sanitize undefined values to guarantee clean Firestore serialization
    const cleaned = JSON.parse(JSON.stringify(restSite));
    await setDoc(siteRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a site from the centralized cloud database
 */
export async function deleteSiteFromCloud(siteId: string): Promise<void> {
  const path = `sites/${siteId}`;
  try {
    const siteRef = doc(db, 'sites', siteId);
    // Delete subcollection rsvps
    const rsvpsRef = collection(db, 'sites', siteId, 'rsvps');
    const rsvpDocs = await getDocs(rsvpsRef);
    const deletePromises = rsvpDocs.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    await deleteDoc(siteRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Submit an RSVP to the centralized cloud database
 */
export async function submitRsvpToCloud(siteId: string, rsvp: GuestRsvp): Promise<void> {
  const path = `sites/${siteId}/rsvps/${rsvp.id}`;
  try {
    const rsvpRef = doc(db, 'sites', siteId, 'rsvps', rsvp.id);
    const cleaned = JSON.parse(JSON.stringify(rsvp));
    await setDoc(rsvpRef, cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Delete an RSVP from the centralized cloud database
 */
export async function deleteRsvpFromCloud(siteId: string, rsvpId: string): Promise<void> {
  const path = `sites/${siteId}/rsvps/${rsvpId}`;
  try {
    const rsvpRef = doc(db, 'sites', siteId, 'rsvps', rsvpId);
    await deleteDoc(rsvpRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribe to centralized system config (admin credentials)
 */
export function subscribeToSystemConfig(
  onUpdate: (config: SystemConfig) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const docRef = doc(db, 'system', 'config');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as SystemConfig);
      }
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.GET, 'system/config');
    }
  );
}

/**
 * Update centralized admin credentials in the database
 */
export async function updateSystemConfigInCloud(config: SystemConfig): Promise<void> {
  const path = 'system/config';
  try {
    const docRef = doc(db, 'system', 'config');
    await setDoc(docRef, { ...config, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
