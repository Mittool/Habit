// Professional Studio Vector Icon Library for Habit Customization
"use client";
import React from "react";
import {
  Heart,
  Dumbbell,
  Activity,
  Apple,
  Book,
  Library,
  Droplets,
  Brain,
  Eye,
  Footprints,
  Code,
  GraduationCap,
  Wallet,
  Moon,
  Music,
  Notebook,
  PenTool,
  Target,
  Zap,
  CheckSquare,
  Sparkles,
  Sun,
  Coffee,
  Compass,
} from "lucide-react";

export interface IconOption {
  key: string;
  label: string;
  category: "Health" | "Reading" | "Mindfulness" | "Finance" | "Coding & Study" | "Lifestyle";
  component: React.ReactNode;
}

export const HABIT_ICON_LIBRARY: IconOption[] = [
  // Health
  { key: "Heart", label: "Heart Carding", category: "Health", component: <Heart /> },
  { key: "Dumbbell", label: "Gym Training", category: "Health", component: <Dumbbell /> },
  { key: "Activity", label: "Activity Pulse", category: "Health", component: <Activity /> },
  { key: "Apple", label: "Clean Nutrition", category: "Health", component: <Apple /> },
  { key: "Footprints", label: "Daily Running", category: "Health", component: <Footprints /> },
  { key: "Droplets", label: "Water Hydration", category: "Health", component: <Droplets /> },

  // Reading & Study
  { key: "Book", label: "Book Reading", category: "Reading", component: <Book /> },
  { key: "Library", label: "Deep Study", category: "Reading", component: <Library /> },
  { key: "Notebook", label: "Journaling", category: "Reading", component: <Notebook /> },
  { key: "PenTool", label: "Writing Flow", category: "Reading", component: <PenTool /> },

  // Mindfulness & Rest
  { key: "Brain", label: "Meditation", category: "Mindfulness", component: <Brain /> },
  { key: "Eye", label: "Mindful Focus", category: "Mindfulness", component: <Eye /> },
  { key: "Moon", label: "Sleep Hygiene", category: "Mindfulness", component: <Moon /> },
  { key: "Sun", label: "Morning Light", category: "Mindfulness", component: <Sun /> },

  // Coding & Learning
  { key: "Code", label: "Code Crafting", category: "Coding & Study", component: <Code /> },
  { key: "GraduationCap", label: "Course Mastery", category: "Coding & Study", component: <GraduationCap /> },
  { key: "Target", label: "Priority Target", category: "Coding & Study", component: <Target /> },
  { key: "Zap", label: "High Energy", category: "Coding & Study", component: <Zap /> },

  // Finance & Lifestyle
  { key: "Wallet", label: "Budget Savings", category: "Finance", component: <Wallet /> },
  { key: "Music", label: "Practice Instrument", category: "Lifestyle", component: <Music /> },
  { key: "Coffee", label: "Zero Caffeine", category: "Lifestyle", component: <Coffee /> },
  { key: "Compass", label: "Outdoor Exploration", category: "Lifestyle", component: <Compass /> },
  { key: "CheckSquare", label: "Daily Review", category: "Lifestyle", component: <CheckSquare /> },
  { key: "Sparkles", label: "Creative Ritual", category: "Lifestyle", component: <Sparkles /> },
];

export function renderHabitIcon(iconKey: string, size = 18, color = "currentColor"): React.ReactNode {
  const found = HABIT_ICON_LIBRARY.find((i) => i.key === iconKey);
  if (!found) return <Target size={size} color={color} />;

  return React.cloneElement(found.component as any, {
    size,
    color,
    strokeWidth: 2,
  });
}
