/** Where to send a user after a successful sign in or sign up: the picker if profiles exist, else create one. */
export function postAuthPath(): string {
  if (typeof window === "undefined") return "/note/create-profile";
  try {
    const profiles = localStorage.getItem("profiles");
    if (profiles && JSON.parse(profiles).length > 0) return "/note/profile-selection";
  } catch {
    // Unreadable storage counts as no profiles.
  }
  return "/note/create-profile";
}
