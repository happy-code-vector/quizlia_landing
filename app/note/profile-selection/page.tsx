"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
}

export default function ProfileSelectionPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedProfiles = localStorage.getItem("profiles");
      if (storedProfiles) {
        setProfiles(JSON.parse(storedProfiles));
      } else {
        router.push("/create-profile");
      }
    }
  }, [router]);

  const selectProfile = (profile: Profile) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("currentProfile", JSON.stringify(profile));
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl w-full">
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
                    avatarColors[profile.avatar]
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
            href="/create-profile"
            className="group cursor-pointer text-center transition-transform hover:scale-105"
          >
            <div className="relative w-full aspect-square mb-3">
              <div className="w-full h-full rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center group-hover:border-blue-500 transition-colors bg-white dark:bg-gray-900">
                <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-600 group-hover:text-blue-500 transition-colors">
                  add
                </span>
              </div>
            </div>
            <p className="font-bold text-lg text-blue-600">Add Profile</p>
          </Link>
        </div>

        <div className="flex justify-center">
          <Link href="/create-profile" className="btn-secondary flex items-center gap-2">
            <span className="material-symbols-outlined">settings</span>
            Manage Profiles
          </Link>
        </div>
      </div>
    </div>
  );
}
