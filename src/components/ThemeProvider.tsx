"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    const html = document.documentElement;
    html.removeAttribute("data-theme");
    if (theme !== "white-paper") {
      html.setAttribute("data-theme", theme);
    }
  }, [theme]);

  return <>{children}</>;
}
