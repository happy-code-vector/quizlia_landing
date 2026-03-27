"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/app/ToastContainer";
import { syncProfilesFromFirebase, syncProfilesToFirebase, deleteProfileFromFirebase } from "@/lib/firebaseProfiles";

const avatarColors: Record<string, string> = {
  "avatar-1": "from-blue-400 to-purple-400",
  "avatar-2": "from-green-400 to-teal-400",
  "avatar-3": "from-orange-400 to-red-400",
  "avatar-4": "from-pink-400 to-rose-400",
  "avatar-5": "from-yellow-400 to-orange-400",
  "avatar-6": "from-indigo-400 to-blue-400",
};

interface Profile {
  id: number;
  name: string;
  type: string;
  avatar: string;
  gradeLevel?: string;
  parentEmail?: string;
  createdAt?: string;
}

export default function ManageProfilesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editGradeLevel, setEditGradeLevel] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Profile | null>(null);

  useEffect(() => {
    async function loadProfiles() {
      if (typeof window === "undefined") return;

      // If user is authenticated, sync from Firebase first
      if (user?.email) {
        const firebaseProfiles = await syncProfilesFromFirebase(user.email);
        if (firebaseProfiles.length > 0) {
          setProfiles(firebaseProfiles);
          setIsLoading(false);
          return;
        }
      }

      // Fall back to localStorage
      const storedProfiles = localStorage.getItem("profiles");
      if (storedProfiles) {
        setProfiles(JSON.parse(storedProfiles));
      }
      setIsLoading(false);
    }

    if (!authLoading) {
      loadProfiles();
    }
  }, [user, authLoading]);

  const saveProfiles = async (updatedProfiles: Profile[]) => {
    setProfiles(updatedProfiles);
    localStorage.setItem("profiles", JSON.stringify(updatedProfiles));

    // Sync to Firebase if authenticated
    if (user?.email) {
      await syncProfilesToFirebase(user.email);
    }
  };

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setEditName(profile.name);
    setEditGradeLevel(profile.gradeLevel || "");
  };

  const handleSaveEdit = async () => {
    if (!editingProfile || !editName.trim()) return;

    const updatedProfiles = profiles.map((p) =>
      p.id === editingProfile.id
        ? { ...p, name: editName.trim(), gradeLevel: editGradeLevel }
        : p
    );

    await saveProfiles(updatedProfiles);
    setEditingProfile(null);
    showToast("Profile updated successfully!", "success");
  };

  const handleDelete = async (profile: Profile) => {
    const updatedProfiles = profiles.filter((p) => p.id !== profile.id);
    await saveProfiles(updatedProfiles);

    // Delete from Firebase if authenticated
    if (user?.email) {
      await deleteProfileFromFirebase(user.email, profile.id);
    }

    setDeleteConfirm(null);
    showToast("Profile deleted successfully!", "success");

    // If no profiles left, redirect to create profile
    if (updatedProfiles.length === 0) {
      router.push("/note/create-profile");
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#964CEE]"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/note/profile-selection"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">arrow_back</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Profiles</h1>
          </div>
          <Link
            href="/note/create-profile"
            className="btn-primary flex items-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            Add Profile
          </Link>
        </div>

        {/* Sync status */}
        {user?.email && (
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm">
              <span className="material-symbols-outlined text-sm">cloud_done</span>
              Synced to {user.email}
            </span>
          </div>
        )}

        {/* Profile list */}
        <div className="space-y-4">
          {profiles.map((profile) => {
            const studentCount = profiles.filter(
              (p) => p.type === "student" && p.parentEmail === user?.email
            ).length;

            return (
              <div
                key={profile.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
              >
                {editingProfile?.id === profile.id ? (
                  // Edit mode
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full bg-gradient-to-br ${
                          avatarColors[profile.avatar] || "from-gray-400 to-gray-500"
                        }`}
                      />
                      <div className="flex-1 space-y-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#964CEE]"
                          placeholder="Profile name"
                        />
                        <select
                          value={editGradeLevel}
                          onChange={(e) => setEditGradeLevel(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#964CEE]"
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
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingProfile(null)}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-2 rounded-lg bg-[#964CEE] text-white hover:bg-[#7B3ED1] transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full bg-gradient-to-br ${
                          avatarColors[profile.avatar] || "from-gray-400 to-gray-500"
                        }`}
                      />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{profile.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="capitalize">{profile.type}</span>
                          {profile.gradeLevel && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{profile.gradeLevel.replace("-", " ")}</span>
                            </>
                          )}
                          {profile.type === "student" && profile.parentEmail && (
                            <>
                              <span>•</span>
                              <span className="text-xs">Linked to parent</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(profile)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="Edit profile"
                      >
                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(profile)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete profile"
                      >
                        <span className="material-symbols-outlined text-red-500">delete</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Student limit info */}
        {profiles.filter((p) => p.type === "student" && p.parentEmail === user?.email).length >= 3 && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-yellow-600">info</span>
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Student limit reached</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  You've reached the maximum of 3 student profiles. Delete an existing student to add a new one.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-red-500">warning</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Profile?</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Are you sure you want to delete "{deleteConfirm.name}"? This will also delete all their notes, flashcards, and quizzes. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
