"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/app/ToastContainer";
import { saveProfileToFirebase, syncProfilesFromFirebase } from "@/lib/firebaseProfiles";

const avatarColors = [
  "from-blue-400 to-purple-400",
  "from-green-400 to-teal-400",
  "from-orange-400 to-red-400",
  "from-pink-400 to-rose-400",
  "from-yellow-400 to-orange-400",
  "from-indigo-400 to-blue-400",
];

export default function CreateProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, signInWithGoogle, signIn, signUp, isConfigured, loading: authLoading } = useAuth();

  const [step, setStep] = useState<"auth" | "profile">("auth");
  const [formData, setFormData] = useState({
    avatar: "avatar-1",
    name: "",
    type: "student",
    gradeLevel: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [studentCount, setStudentCount] = useState(0);

  // Check existing student count for parent
  useEffect(() => {
    if (user?.email && typeof window !== "undefined") {
      const storedProfiles = localStorage.getItem("profiles");
      if (storedProfiles) {
        const profiles = JSON.parse(storedProfiles);
        const count = profiles.filter(
          (p: any) => p.type === "student" && p.parentEmail === user.email
        ).length;
        setStudentCount(count);
      }
    }
  }, [user?.email]);

  // Check if user is already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      setStep("profile");
    }
  }, [user, authLoading]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // Auth state change will trigger step change
    } catch (error: any) {
      showToast(error.message || "Failed to sign in with Google", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("Please enter email and password", "error");
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, formData.name || email.split("@")[0]);
        showToast("Account created successfully!", "success");
      } else {
        await signIn(email, password);
        showToast("Signed in successfully!", "success");
      }
      // Auth state change will trigger step change
    } catch (error: any) {
      showToast(error.message || "Authentication failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast("Please enter a profile name", "error");
      return;
    }

    setIsLoading(true);

    try {
      // Simulate slight delay for UX
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get existing profiles
      const storedProfiles = localStorage.getItem("profiles");
      const profiles = storedProfiles ? JSON.parse(storedProfiles) : [];

      // Check student limit for parent profiles
      if (formData.type === "student" && user?.email) {
        const existingStudents = profiles.filter(
          (p: any) => p.type === "student" && p.parentEmail === user.email
        );
        if (existingStudents.length >= 3) {
          showToast("Maximum of 3 student profiles allowed per parent account", "error");
          setIsLoading(false);
          return;
        }
      }

      const newProfile = {
        id: Date.now(),
        ...formData,
        createdAt: new Date().toISOString(),
        // Link student profiles to parent email
        parentEmail: formData.type === "student" ? user?.email : undefined,
      };

      // Add new profile
      profiles.push(newProfile);
      localStorage.setItem("profiles", JSON.stringify(profiles));
      localStorage.setItem("currentProfile", JSON.stringify(newProfile));

      // Sync to Firebase if user is authenticated
      if (user?.email) {
        await saveProfileToFirebase(user.email, newProfile);
      }

      showToast(`Profile "${formData.name}" created successfully!`, "success");

      // Redirect to dashboard
      setTimeout(() => router.push("/note"), 500);
    } catch (error) {
      showToast("Failed to create profile. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#964CEE]"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Step 1: Authentication
  if (step === "auth") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">auto_stories</span>
            </div>
            <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Welcome to QuickNote</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in to sync your data across all devices
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800">
            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors mb-4"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {isLoading ? "Signing in..." : "Continue with Google"}
              </span>
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">or</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#964CEE]"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#964CEE]"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 btn-primary flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    Processing...
                  </>
                ) : isSignUp ? (
                  "Create Account"
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full mt-4 text-sm text-gray-600 dark:text-gray-400 hover:text-[#964CEE] dark:hover:text-[#964CEE]"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>

            {/* Skip for demo */}
            <button
              onClick={() => setStep("profile")}
              className="w-full mt-6 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
            >
              Continue without syncing →
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            By signing in, you agree to sync your data across devices.
            <br />
            Your profile and study materials will be backed up to the cloud.
          </p>
        </div>
      </div>
    );
  }

  // Step 2: Create Profile
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white">Create Your Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {user?.email ? `Signed in as ${user.email}` : "Personalize your learning experience"}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800">
          <form onSubmit={handleCreateProfile}>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-4 text-gray-900 dark:text-white">Choose Avatar</label>
                <div className="grid grid-cols-6 gap-4">
                  {avatarColors.map((color, index) => (
                    <label key={index} className="cursor-pointer">
                      <input
                        type="radio"
                        name="avatar"
                        value={`avatar-${index + 1}`}
                        checked={formData.avatar === `avatar-${index + 1}`}
                        onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                        className="hidden peer"
                      />
                      <div
                        className={`w-14 h-14 rounded-full bg-gradient-to-br ${color} peer-checked:ring-4 peer-checked:ring-[#964CEE] transition-all`}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Profile Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#964CEE]"
                  placeholder="e.g., Sarah, Math Studies, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-white">Profile Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="cursor-pointer">
                    <input
                      type="radio"
                      name="profile-type"
                      value="student"
                      checked={formData.type === "student"}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="hidden peer"
                    />
                    <div className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 peer-checked:border-[#964CEE] peer-checked:bg-purple-50 dark:peer-checked:bg-purple-950/30 transition-all bg-white dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#964CEE]">school</span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Student</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">For learners</p>
                        </div>
                      </div>
                    </div>
                  </label>
                  <label className="cursor-pointer">
                    <input
                      type="radio"
                      name="profile-type"
                      value="parent"
                      checked={formData.type === "parent"}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="hidden peer"
                    />
                    <div className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 peer-checked:border-[#964CEE] peer-checked:bg-purple-50 dark:peer-checked:bg-purple-950/30 transition-all bg-white dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#964CEE]">family_restroom</span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Parent</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">For families</p>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
                {studentCount >= 3 && formData.type === "student" && (
                  <p className="mt-2 text-sm text-red-500 dark:text-red-400">
                    Maximum of 3 student profiles reached. Delete an existing student profile to add a new one.
                  </p>
                )}
                {studentCount < 3 && formData.type === "student" && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {3 - studentCount} of 3 student slots remaining
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Grade Level (Optional)</label>
                <select
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#964CEE]"
                >
                  <option value="">Select grade level</option>
                  <option value="elementary">Elementary</option>
                  <option value="middle">Middle School</option>
                  <option value="high">High School</option>
                  <option value="college">College</option>
                  <option value="adult">Adult Learner</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                type="button"
                onClick={() => router.push("/note/profile-selection")}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" disabled={isLoading || (studentCount >= 3 && formData.type === "student")} className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    Creating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    Create Profile
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
