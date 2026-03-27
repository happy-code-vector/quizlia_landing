"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { syncProfilesFromFirebase, syncProfilesToFirebase } from "@/lib/firebaseProfiles";

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
}

export default function ProfileSelectionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        const localProfiles = JSON.parse(storedProfiles);
        setProfiles(localProfiles);

        // If authenticated, sync local profiles to Firebase
        if (user?.email && localProfiles.length > 0) {
          await syncProfilesToFirebase(user.email);
        }
      } else if (!user) {
        // No profiles and not authenticated - go to create profile
        router.push("/note/create-profile");
      }
      setIsLoading(false);
    }

    if (!authLoading) {
      loadProfiles();
    }
  }, [router, user, authLoading]);

  const selectProfile = (profile: Profile) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("currentProfile", JSON.stringify(profile));
      router.push("/note");
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

  // If no profiles, redirect to create profile
  if (profiles.length === 0) {
    router.push("/note/create-profile");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl w-full">
        {/* Sync status */}
        {user?.email && (
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm">
              <span className="material-symbols-outlined text-sm">cloud_done</span>
              Synced to {user.email}
            </span>
          </div>
        )}

        <h1 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          Who's learning today?
        </h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-8">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              onClick={() => selectProfile(profile)}
              className="group cursor-pointer text-center transition-transform hover:scale-105"
            >
              <div className="relative w-full aspect-square mb-3">
                <div
                  className={`w-full h-full rounded-full bg-gradient-to-br ${
                    avatarColors[profile.avatar] || "from-gray-400 to-gray-500"
                  } shadow-lg group-hover:shadow-xl transition-shadow`}
                />
              </div>
              <p className="font-bold text-lg text-gray-900 dark:text-white">{profile.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {profile.type}
              </p>
            </div>
          ))}

          <Link
            href="/note/create-profile"
            className="group cursor-pointer text-center transition-transform hover:scale-105"
          >
            <div className="relative w-full aspect-square mb-3">
              <div className="w-full h-full rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center group-hover:border-[#964CEE] transition-colors bg-white dark:bg-gray-900">
                <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-600 group-hover:text-[#964CEE] transition-colors">
                  add
                </span>
              </div>
            </div>
            <p className="font-bold text-lg text-[#964CEE]">Add Profile</p>
          </Link>
        </div>

        <div className="flex justify-center gap-4">
          <Link href="/note/create-profile" className="btn-secondary flex items-center gap-2">
            <span className="material-symbols-outlined">settings</span>
            Manage Profiles
          </Link>
        </div>
      </div>
    </div>
  );
}
