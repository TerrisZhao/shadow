"use client";

import type { ThemeProviderProps } from "next-themes";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode, useEffect, useState } from "react";

interface ClientThemeProviderProps {
  children: ReactNode;
  themeProps?: ThemeProviderProps;
}

export function ClientThemeProvider({
  children,
  themeProps,
}: ClientThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  const defaultThemeProps = {
    attribute: "class" as const,
    defaultTheme: "dark",
  };
  const finalThemeProps = themeProps || defaultThemeProps;

  return (
    <NextThemesProvider {...finalThemeProps}>{children}</NextThemesProvider>
  );
}
