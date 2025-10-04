"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode, useEffect, useState } from "react";

import type { ThemeProviderProps } from "next-themes";

interface ClientThemeProviderProps {
  children: ReactNode;
  themeProps?: ThemeProviderProps;
}

export function ClientThemeProvider({ 
  children, 
  themeProps 
}: ClientThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  const defaultThemeProps = { attribute: "class", defaultTheme: "dark" };
  const finalThemeProps = themeProps || defaultThemeProps;

  return (
    <NextThemesProvider {...finalThemeProps}>
      {children}
    </NextThemesProvider>
  );
}
