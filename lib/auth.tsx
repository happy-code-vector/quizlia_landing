"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";
import { createOrUpdateFirebaseUser } from "./firebaseSubscription";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getUserId: () => string;
  getUserName: () => string;
  getUserEmail: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isFirebaseConfigured();

  useEffect(() => {
    if (!isConfigured || !auth) {
      // Firebase not configured - check localStorage fallback
      if (typeof window !== "undefined") {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          // User exists in localStorage but not in Firebase
          // Keep the localStorage user as fallback
        }
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Create or update user in Firestore (matches iOS)
        if (firebaseUser.email) {
          await createOrUpdateFirebaseUser(firebaseUser.email);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isConfigured]);

  const signIn = async (email: string, password: string) => {
    if (!isConfigured || !auth) {
      // Fallback to localStorage for demo mode
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "user",
          JSON.stringify({
            name: "Demo User",
            email: email,
            loginAt: new Date().toISOString(),
          })
        );
      }
      return;
    }

    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, name?: string) => {
    if (!isConfigured || !auth) {
      // Fallback to localStorage for demo mode
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "user",
          JSON.stringify({
            name: name || "Demo User",
            email: email,
            createdAt: new Date().toISOString(),
          })
        );
      }
      return;
    }

    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name if provided
    if (name && result.user) {
      await updateProfile(result.user, { displayName: name });
    }

    // Create user document in Firestore
    if (result.user.email) {
      await createOrUpdateFirebaseUser(result.user.email);
    }
  };

  const signInWithGoogle = async () => {
    if (!isConfigured || !auth) {
      throw new Error("Firebase is not configured. Please set up Firebase environment variables.");
    }

    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    // Create user document in Firestore
    if (result.user.email) {
      await createOrUpdateFirebaseUser(result.user.email);
    }
  };

  const signOut = async () => {
    if (!isConfigured || !auth) {
      // Clear localStorage fallback
      if (typeof window !== "undefined") {
        localStorage.removeItem("user");
      }
      return;
    }

    await firebaseSignOut(auth);

    // Also clear localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
    }
  };

  const resetPassword = async (email: string) => {
    if (!isConfigured || !auth) {
      throw new Error("Firebase is not configured. Please set up Firebase environment variables.");
    }

    await sendPasswordResetEmail(auth, email);
  };

  const getUserId = (): string => {
    return user?.uid || "Unknown";
  };

  const getUserName = (): string => {
    return user?.displayName || "User";
  };

  const getUserEmail = (): string => {
    return user?.email || "Nil";
  };

  const value: AuthContextType = {
    user,
    loading,
    isConfigured,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    getUserId,
    getUserName,
    getUserEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Hook to check if user is authenticated (matches iOS isLoggedIn pattern)
export function useIsLoggedIn(): boolean {
  const { user, isConfigured } = useAuth();

  if (!isConfigured) {
    // Fallback to localStorage check
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      return !!storedUser;
    }
    return false;
  }

  return !!user;
}
