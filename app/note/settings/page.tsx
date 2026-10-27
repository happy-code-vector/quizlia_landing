"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/components/app/ThemeProvider";
import { getSubscription, getPlanById, SUBSCRIPTION_PLANS, UserSubscription, canGenerate, resolveEffectivePlan } from "@/lib/subscription";
import { PromoCodeInput } from "@/components/app/PromoCodeInput";
import { deleteProfileFromFirebase, saveProfileToFirebase } from "@/lib/firebaseProfiles";
import { useToast } from "@/components/app/ToastContainer";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut, getUserEmail, getUserName, isConfigured } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"general" | "billing" | "account">("general");
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);

  // Editable profile fields — initialized once the profile loads.
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("student");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name);
      setEditType(profile.type || "student");
    }
  }, [profile?.id]);

  const handleSaveProfile = async () => {
    if (!profile || !editName.trim()) return;
    setIsSavingProfile(true);
    try {
      const updated = { ...profile, name: editName.trim(), type: editType };

      // Local list + current profile
      const stored = localStorage.getItem("profiles");
      const profiles = stored ? JSON.parse(stored) : [];
      localStorage.setItem(
        "profiles",
        JSON.stringify(profiles.map((p: any) => (p.id === profile.id ? updated : p)))
      );
      localStorage.setItem("currentProfile", JSON.stringify(updated));

      // Cloud mirror (best effort)
      if (user?.email) {
        await saveProfileToFirebase(user.email, updated);
      }

      setProfile(updated);
      showToast("Profile updated", "success");
    } catch {
      showToast("Couldn't save profile", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!profile) return;
    if (!window.confirm(`Delete profile "${profile.name}"? Its notes on this device will be removed. This cannot be undone.`)) return;

    // Remove cloud copy (signed-in users)
    const email = profile.email || "unknown@local";
    await deleteProfileFromFirebase(email, profile.id);

    // Remove local profile + its cached notes
    const stored = localStorage.getItem("profiles");
    const profiles = stored ? JSON.parse(stored) : [];
    localStorage.setItem(
      "profiles",
      JSON.stringify(profiles.filter((p: any) => p.id !== profile.id))
    );
    localStorage.removeItem(`content_${profile.id}`);
    localStorage.removeItem(`subscription_${profile.id}`);
    localStorage.removeItem("currentProfile");

    router.push("/note/profile-selection");
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // Clear local storage
      if (typeof window !== "undefined") {
        localStorage.removeItem("currentProfile");
      }
      router.push("/note/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentProfile = localStorage.getItem("currentProfile");
      if (!currentProfile) {
        router.push("/note/profile-selection");
        return;
      }
      const profileData = JSON.parse(currentProfile);
      setProfile(profileData);
      setSubscription(getSubscription(profileData.id));
    }
  }, [router]);

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your account and preferences</p>
          </div>
          <Link href="/note" className="btn-secondary">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-2">
              <button
                onClick={() => setActiveTab("general")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === "general"
                    ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <span className="material-symbols-outlined">settings</span>
                <span className="font-medium">General</span>
              </button>
              <button
                onClick={() => setActiveTab("billing")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === "billing"
                    ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <span className="material-symbols-outlined">credit_card</span>
                <span className="font-medium">Billing</span>
              </button>
              <button
                onClick={() => setActiveTab("account")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === "account"
                    ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <span className="material-symbols-outlined">person</span>
                <span className="font-medium">Account</span>
              </button>
            </nav>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* General Tab */}
            {activeTab === "general" && (
              <>
                {/* Appearance */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Appearance</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Customize how QuizliAI looks</p>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Theme</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Choose your preferred theme</p>
                      </div>
                      <button
                        onClick={toggleTheme}
                        className="relative inline-flex h-12 w-24 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors"
                      >
                        <span
                          className={`flex h-10 w-10 transform rounded-full bg-white dark:bg-gray-900 shadow-lg transition-transform items-center justify-center ${
                            theme === "dark" ? "translate-x-12" : "translate-x-1"
                          }`}
                        >
                          <span className="material-symbols-outlined text-yellow-500 dark:text-blue-400">
                            {theme === "dark" ? "dark_mode" : "light_mode"}
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Billing Tab */}
            {activeTab === "billing" && (
              <>
                {/* Current Plan */}
                {(() => {
                  const currentPlan = getPlanById(subscription?.planId || "free") || SUBSCRIPTION_PLANS[0];
                  const isPro = subscription?.status === "active" && subscription?.planId !== "free";
                  return (
                    <div className={`rounded-xl p-6 text-white ${isPro ? "bg-gradient-to-br from-purple-600 to-pink-600" : "bg-gradient-to-br from-blue-500 to-purple-600"}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-2xl font-bold">{currentPlan.name} Plan</h2>
                          <p className="text-white/80 mt-1">
                            {isPro ? "Unlimited learning potential" : "Perfect for getting started"}
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-5xl opacity-20">
                          {isPro ? "workspace_premium" : "school"}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-4xl font-bold">${currentPlan.price}</span>
                        <span className="text-white/80">/{currentPlan.interval}</span>
                      </div>
                      {isPro ? (
                        <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
                          <span className="material-symbols-outlined text-green-300">check_circle</span>
                          <span>Active until {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "N/A"}</span>
                        </div>
                      ) : (
                        <Link href="/note/pricing" className="block w-full bg-white text-purple-600 font-semibold py-3 rounded-lg hover:bg-purple-50 transition-colors text-center">
                          Upgrade to Pro
                        </Link>
                      )}
                    </div>
                  );
                })()}

                {/* Usage Stats */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Today's Usage</h2>
                  </div>
                  <div className="p-6">
                    {(() => {
                      const usage = canGenerate(profile.id);
                      const plan = resolveEffectivePlan(subscription?.planId || "free");
                      if (plan.id === "free") {
                        return (
                          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                            <span className="material-symbols-outlined">note_stack</span>
                            <span className="font-medium">
                              {usage.allowed ? "1 free note remaining" : "Free note used — upgrade to keep generating"}
                            </span>
                          </div>
                        );
                      }
                      const used = plan.generationsPerDay - usage.remaining;
                      return (
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-gray-600 dark:text-gray-400">Generations used today</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{used} / {plan.generationsPerDay}</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${used >= plan.generationsPerDay ? "bg-red-500" : usage.remaining <= 1 ? "bg-amber-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min((used / plan.generationsPerDay) * 100, 100)}%` }}
                            />
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Resets daily at midnight</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Plan Features */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Plan Features</h2>
                  </div>
                  <div className="p-6 space-y-3">
                    {(getPlanById(subscription?.planId || "free") || SUBSCRIPTION_PLANS[0]).features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-green-600">check_circle</span>
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Promo Code */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Promo Code</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Have a promo code? Redeem it here</p>
                  </div>
                  <div className="p-6">
                    <PromoCodeInput
                      email={profile?.email || "demo@example.com"}
                      profileId={profile?.id || 0}
                      onSuccess={() => {
                        const newSub = getSubscription(profile?.id || 0);
                        setSubscription(newSub);
                      }}
                    />
                  </div>
                </div>

                {/* Manage Subscription */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage Subscription</h2>
                  </div>
                  <div className="p-6 space-y-3">
                    <Link href="/note/pricing" className="btn-secondary w-full flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">compare</span>
                      View All Plans
                    </Link>
                    {subscription?.status === "active" && subscription?.planId !== "free" && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        To cancel or modify your subscription, please contact support.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Account Tab */}
            {activeTab === "account" && (
              <>
                {/* Firebase Account Info */}
                {user && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/50 overflow-hidden">
                    <div className="p-6 border-b border-blue-200 dark:border-blue-900/50">
                      <h2 className="text-xl font-bold text-blue-900 dark:text-blue-400">Firebase Account</h2>
                      <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">Signed in with Firebase</p>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                          {getUserName().charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{getUserName()}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{getUserEmail()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        <span>Authenticated with Firebase</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Profile Information — editable */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profile Information</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Changes sync to your other devices</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Profile Type</label>
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 capitalize"
                      >
                        <option value="student">Student</option>
                        <option value="parent">Parent</option>
                      </select>
                    </div>
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile || (editName.trim() === profile.name && editType === profile.type)}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">save</span>
                      {isSavingProfile ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>

                {/* Profile Actions */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profile Actions</h2>
                  </div>
                  <div className="p-6 space-y-3">
                    <Link href="/note/profile-selection" className="btn-secondary w-full flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">swap_horiz</span>
                      Switch Profile
                    </Link>
                    <Link href="/note/create-profile?add=1" className="btn-secondary w-full flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">add</span>
                      Create New Profile
                    </Link>
                  </div>
                </div>

                {/* Logout */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Session</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Sign out of your account</p>
                  </div>
                  <div className="p-6">
                    <button
                      onClick={handleLogout}
                      className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">logout</span>
                      Log Out
                    </button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-50 dark:bg-red-950/20 rounded-xl border-2 border-red-200 dark:border-red-900/50 overflow-hidden">
                  <div className="p-6 border-b border-red-200 dark:border-red-900/50">
                    <h2 className="text-xl font-bold text-red-900 dark:text-red-400">Danger Zone</h2>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">Irreversible actions</p>
                  </div>
                  <div className="p-6">
                    <button
                      onClick={handleDeleteProfile}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">delete_forever</span>
                      Delete Profile
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
