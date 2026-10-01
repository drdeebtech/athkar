import {
  BookOpen,
  CloudRain,
  HeartPulse,
  Home,
  Landmark,
  List,
  Mountain,
  Plane,
  Shield,
  Sparkles,
  Sun,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  sun: Sun,
  landmark: Landmark,
  sparkles: Sparkles,
  home: Home,
  utensils: Utensils,
  plane: Plane,
  shield: Shield,
  "heart-pulse": HeartPulse,
  "book-open": BookOpen,
  users: Users,
  "cloud-rain": CloudRain,
  mountain: Mountain,
  list: List,
};

export function SectionIcon({ name, className = "size-5" }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? List;
  return <Icon className={className} aria-hidden="true" />;
}
