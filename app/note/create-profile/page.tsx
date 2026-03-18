"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/app/ToastContainer";

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
  const [formData, setFormData] = useState({
    avatar: "avatar-1",
    name: "",
    type: "student",
    gradeLevel: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (typeof window !== "undefined") {
        const profiles = JSON.parse(localStorage.getItem("profiles") || "[]");
        const newProfile = {
          ...formData,
          id: Date.now(),
          createdAt: new Date().toISOString(),
        };
        profiles.push(newProfile);
        localStorage.setItem("profiles", JSON.stringify(profiles));
        localStorage.setItem("currentProfile", JSON.stringify(newProfile));
      }

      showToast(`Profile "${formData.name}" created successfully!`, "success");
      setTimeout(() => router.push("/profile-selection"), 500);
    } catch (error) {
      showToast("Failed to create profile. Please try again.", "error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white">Create Your Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Personalize your learning experience
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-4 text-gray-900 dark:text-white">Choose Avatar</label>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
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
                        className={`w-16 h-16 rounded-full bg-gradient-to-br ${color} peer-checked:ring-4 peer-checked:ring-blue-500 transition-all`}
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
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Sarah, Math Studies, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-white">Profile Type</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="cursor-pointer">
                    <input
                      type="radio"
                      name="profile-type"
                      value="student"
                      checked={formData.type === "student"}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="hidden peer"
                    />
                    <div className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950/30 transition-all bg-white dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-600">school</span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Student</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            For learners
                          </p>
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
                    <div className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950/30 transition-all bg-white dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-600">family_restroom</span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Parent</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            For families
                          </p>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Grade Level (Optional)</label>
                <select
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                onClick={() => router.push("/profile-selection")}
                className="flex-1 btn-secondary"
              >
                Skip for Now
              </button>
              <button type="submit" className="flex-1 btn-primary">
                Create Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
