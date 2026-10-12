import {
  Briefcase,
  Bus,
  CircleEllipsis,
  CirclePlus,
  Clapperboard,
  FolderKanban,
  Gift,
  GraduationCap,
  Laptop,
  Pencil,
  Receipt,
  ShoppingBag,
  Sparkles,
  Store,
  Utensils,
  Wallet,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react-native';
import { createElement } from 'react';

/**
 * Category `icon` values are lucide names chosen by the backend seeder
 * (and by students for personal categories). Unknown names fall back to a neutral icon.
 */
const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  bus: Bus,
  pencil: Pencil,
  'folder-kanban': FolderKanban,
  clapperboard: Clapperboard,
  sparkles: Sparkles,
  'shopping-bag': ShoppingBag,
  receipt: Receipt,
  'circle-ellipsis': CircleEllipsis,
  wallet: Wallet,
  briefcase: Briefcase,
  laptop: Laptop,
  store: Store,
  'graduation-cap': GraduationCap,
  gift: Gift,
  'circle-plus': CirclePlus,
};

/** Renders the icon for a category `icon` name. */
export function CategoryIcon({ icon, ...props }: LucideProps & { icon: string | null | undefined }) {
  return createElement((icon && ICONS[icon]) || CircleEllipsis, props);
}
