import type { LucideIcon, LucideProps } from "lucide-react";
import {
  ArrowLeft, ArrowLeftRight, ArrowRight, BadgeCheck, BookOpen, BookOpenText, Bot, Check,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleAlert, CircleCheck, CirclePlay,
  CircleX, CloudCheck, Columns2, Crown, CreditCard, EllipsisVertical, ExternalLink, EyeOff,
  FileText, FileType, FileUp, Files, Folder, FolderInput, FolderPlus, Gamepad2, Globe,
  GraduationCap, Hand, Headset, Image, Inbox, Info, Layers, Library, Link, ListChecks,
  LoaderCircle, Lock, LogOut, Moon, Newspaper, Pencil, Plus, Rocket, Save, Send, Settings,
  RotateCcw, Share2, Sparkles, Sun, ThumbsUp, Trash2, TriangleAlert, Trophy, User, UserPlus, Users, X, Zap,
} from "lucide-react";

/**
 * Maps the Material Symbols names the app used before the lucide switch to
 * lucide-react icons, so call sites and stored data (source types, tab ids)
 * keep working. New code should import from lucide-react directly.
 * One stroke width everywhere (W-3, icons): 1.75.
 */
const MAP: Record<string, LucideIcon> = {
  add: Plus,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  article: Newspaper,
  auto_awesome: Sparkles,
  auto_stories: BookOpen,
  bolt: Zap,
  cancel: CircleX,
  check: Check,
  check_circle: CircleCheck,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  close: X,
  cloud_done: CloudCheck,
  compare: Columns2,
  create_new_folder: FolderPlus,
  credit_card: CreditCard,
  dark_mode: Moon,
  delete: Trash2,
  delete_forever: Trash2,
  description: FileText,
  drive_file_move: FolderInput,
  edit: Pencil,
  emoji_events: Trophy,
  error: CircleAlert,
  expand_less: ChevronUp,
  expand_more: ChevronDown,
  family_restroom: Users,
  folder: Folder,
  image: Image,
  inbox: Inbox,
  info: Info,
  library_books: Library,
  light_mode: Sun,
  link: Link,
  lock: Lock,
  logout: LogOut,
  menu_book: BookOpenText,
  more_vert: EllipsisVertical,
  note_stack: Files,
  open_in_new: ExternalLink,
  person: User,
  person_add: UserPlus,
  picture_as_pdf: FileType,
  play_circle: CirclePlay,
  priority_high: CircleAlert,
  progress_activity: LoaderCircle,
  public: Globe,
  quiz: ListChecks,
  refresh: RotateCcw,
  rocket_launch: Rocket,
  save: Save,
  school: GraduationCap,
  send: Send,
  settings: Settings,
  share: Share2,
  smart_toy: Bot,
  sports_esports: Gamepad2,
  style: Layers,
  support_agent: Headset,
  swap_horiz: ArrowLeftRight,
  thumb_up: ThumbsUp,
  touch_app: Hand,
  upload_file: FileUp,
  verified: BadgeCheck,
  visibility_off: EyeOff,
  warning: TriangleAlert,
  workspace_premium: Crown,
};

type IconProps = Omit<LucideProps, "ref"> & { name: string };

export function Icon({ name, className, strokeWidth = 1.75, ...rest }: IconProps) {
  const Cmp = MAP[name] ?? CircleAlert;
  const spin = name === "progress_activity" ? " animate-spin" : "";
  // Material Symbols defaulted to 24px and took a text-* size class when one was set.
  const sized = /\btext-(xs|sm|base|lg|\d?xl|\[)/.test(className ?? "") ? "size-[1em]" : "size-6";
  return (
    <Cmp
      aria-hidden="true"
      focusable="false"
      strokeWidth={strokeWidth}
      className={`inline-block shrink-0 align-middle ${sized}${spin}${className ? ` ${className}` : ""}`}
      {...rest}
    />
  );
}
