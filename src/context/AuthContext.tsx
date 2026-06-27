import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  EmailAuthProvider,
  linkWithCredential,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  User,
} from "firebase/auth";
import { Unsubscribe } from "firebase/firestore";
import { auth, isFirebaseConfigured } from "../config/firebase";
import {
  ensureUserProfile,
  subscribeUserProfile,
  subscribeHousehold,
  getUserProfile,
  syncUserEmail,
  UserProfile,
} from "../lib/firestore";
import { humanizeAuthError } from "../lib/authErrors";
import { clearPushTokens } from "../lib/pushNotifications";
import { translate } from "../i18n/translate";
import { normalizeLocale } from "../i18n/types";
import { Household } from "../types";

interface AuthContextValue {
  configured: boolean;
  initializing: boolean;
  user: User | null;
  profile: UserProfile | null;
  household: Household | null;
  displayName: string;
  isAnonymous: boolean;
  emailVerified: boolean;
  email: string | null;
  /** Igaz, ha a user e-maillel regisztrált, de még nem erősítette meg. */
  requiresVerification: boolean;
  /** Ha a megerősítő e-mail küldése meghiúsult, itt az oka (különben null). */
  verificationError: string | null;
  signInAnon: (name: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  /** Anonim fiók összekapcsolása e-maillel/jelszóval (adatok megtartásával). */
  linkEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  /** Frissíti a felhasználó állapotát; visszaadja, hogy meg van-e erősítve az e-mail. */
  reloadUser: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  // A Firebase User objektumot a link/reload helyben módosítja; ezzel a
  // számlálóval kényszerítjük ki az újrarenderelést ilyenkor.
  const [authVersion, setAuthVersion] = useState(0);

  const profileUnsub = useRef<Unsubscribe | null>(null);
  const householdUnsub = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setInitializing(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      // Korábbi feliratkozások bontása
      profileUnsub.current?.();
      profileUnsub.current = null;

      if (u) {
        profileUnsub.current = subscribeUserProfile(u.uid, (p) => {
          setProfile(p);
          setInitializing(false);
        });
      } else {
        setProfile(null);
        setHousehold(null);
        setInitializing(false);
      }
    });

    return () => {
      unsub();
      profileUnsub.current?.();
      householdUnsub.current?.();
    };
  }, []);

  // Háztartásra feliratkozás, ha a profil tartalmaz householdId-t
  useEffect(() => {
    householdUnsub.current?.();
    householdUnsub.current = null;
    if (profile?.householdId) {
      householdUnsub.current = subscribeHousehold(profile.householdId, setHousehold);
    } else {
      setHousehold(null);
    }
    return () => {
      householdUnsub.current?.();
    };
  }, [profile?.householdId]);

  const authT = (key: string) =>
    translate(normalizeLocale(profile?.locale), key);

  const signInAnon = async (name: string) => {
    const cred = await signInAnonymously(auth);
    if (name) await updateProfile(cred.user, { displayName: name });
    await ensureUserProfile(cred.user.uid, name || "Vendég");
  };

  const signUpEmail = async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name) await updateProfile(cred.user, { displayName: name });
    await ensureUserProfile(cred.user.uid, name || email.trim());
    setVerificationError(null);
    try {
      await sendEmailVerification(cred.user);
    } catch (e: any) {
      // A fiók létrejött; a megerősítő levél hibáját külön jelezzük.
      setVerificationError(humanizeAuthError(e?.message ?? "", authT));
    }
  };

  const signInEmail = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    await ensureUserProfile(
      cred.user.uid,
      cred.user.displayName || email.trim()
    );
    const p = await getUserProfile(cred.user.uid);
    if (p?.householdId && cred.user.email) {
      void syncUserEmail(cred.user.uid, cred.user.email, p.householdId);
    }
  };

  const linkEmail = async (name: string, email: string, password: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error("Nincs bejelentkezett felhasználó.");
    const credential = EmailAuthProvider.credential(email.trim(), password);
    const result = await linkWithCredential(current, credential);
    if (name) await updateProfile(result.user, { displayName: name });
    await ensureUserProfile(result.user.uid, name || result.user.displayName || email.trim());
    const profile = await getUserProfile(result.user.uid);
    if (profile?.householdId) {
      void syncUserEmail(result.user.uid, email.trim(), profile.householdId);
    }
    setVerificationError(null);
    try {
      await sendEmailVerification(result.user);
    } catch (e: any) {
      setVerificationError(humanizeAuthError(e?.message ?? "", authT));
    }
    setUser(auth.currentUser);
    setAuthVersion((v) => v + 1);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const resendVerification = async () => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
      setVerificationError(null);
    }
  };

  const reloadUser = async (): Promise<boolean> => {
    if (auth.currentUser) {
      await reload(auth.currentUser);
      setUser(auth.currentUser);
      setAuthVersion((v) => v + 1);
      if (auth.currentUser.emailVerified) setVerificationError(null);
      return auth.currentUser.emailVerified;
    }
    return false;
  };

  const reloadUserRef = useRef(reloadUser);
  reloadUserRef.current = reloadUser;

  // A megerősítő link a böngészőben/email appban frissíti a Firebase-t, de a
  // helyi session cache-elt marad – app előtérbe kerüléskor szinkronizálunk.
  useEffect(() => {
    const u = user;
    if (!u || u.isAnonymous || u.emailVerified) return;

    const sync = () => {
      void reloadUserRef.current();
    };

    sync();
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") sync();
    });
    return () => sub.remove();
  }, [user?.uid, user?.emailVerified, user?.isAnonymous]);

  const signOut = async () => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await clearPushTokens(uid);
      } catch {
        // token törlés nem blokkolja a kijelentkezést
      }
    }
    await fbSignOut(auth);
  };

  const displayName =
    profile?.displayName ||
    user?.displayName ||
    translate(normalizeLocale(profile?.locale), "common.guest");
  const isAnonymous = user?.isAnonymous ?? false;
  const emailVerified = user?.emailVerified ?? false;
  const email = user?.email ?? null;
  // E-maillel regisztrált, de még meg nem erősített fiók (anonimot nem érint).
  const requiresVerification = !!user && !isAnonymous && !emailVerified;

  // E-mail szinkron a profilba és a család taglistájába (duplikált nevek megkülönböztetéséhez).
  useEffect(() => {
    if (!user?.uid || user.isAnonymous || !email?.trim() || !profile?.householdId) return;
    const stored = household?.members?.[user.uid]?.email?.trim();
    if (stored === email.trim() && profile.email?.trim() === email.trim()) return;
    void syncUserEmail(user.uid, email, profile.householdId);
  }, [user?.uid, user?.isAnonymous, email, profile?.householdId, profile?.email, household?.members]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isFirebaseConfigured,
      initializing,
      user,
      profile,
      household,
      displayName,
      isAnonymous,
      emailVerified,
      email,
      requiresVerification,
      verificationError,
      signInAnon,
      signUpEmail,
      signInEmail,
      linkEmail,
      resetPassword,
      resendVerification,
      reloadUser,
      signOut,
    }),
    [initializing, user, profile, household, displayName, isAnonymous, emailVerified, email, requiresVerification, verificationError, authVersion]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
