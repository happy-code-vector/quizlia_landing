import { Check, Pencil } from "lucide-react";
import { profileInitial } from "@/lib/profileStore";

/**
 * Paper circle with a serif monogram (iOS ProfilePickerView). The old color-gradient avatars are gone.
 * `current` adds the rust ring and a check badge; `editing` swaps the badge for a pencil (lock rule 8:
 * the ring is hidden in edit mode).
 */
export function ProfileFace({
  name, size = "lg", current, editing,
}: {
  name: string;
  size?: "lg" | "sm";
  current?: boolean;
  editing?: boolean;
}) {
  const lg = size === "lg";
  return (
    <span aria-hidden="true" className={`relative inline-flex shrink-0 ${lg ? "size-20" : "size-11"}`}>
      <span
        className={`flex size-full items-center justify-center rounded-full border border-card-stroke bg-paper font-serif font-semibold text-on-paper ${
          lg ? "text-title" : "text-headline"
        } ${current && !editing ? "shadow-[0_0_0_3px_var(--card),0_0_0_6px_var(--rust)]" : "shadow-card"}`}
      >
        {profileInitial(name)}
      </span>
      {editing ? (
        <span className={`absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full border border-card-stroke bg-card text-label shadow-card ${lg ? "size-7" : "size-5"}`}>
          <Pencil strokeWidth={1.75} className={lg ? "size-3.5" : "size-3"} />
        </span>
      ) : current ? (
        <span className={`absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground ${lg ? "size-7" : "size-5"}`}>
          <Check strokeWidth={2.25} className={lg ? "size-4" : "size-3"} />
        </span>
      ) : null}
    </span>
  );
}
