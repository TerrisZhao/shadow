"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { ToastProvider } from "@heroui/toast";

import { ClientSessionProvider } from "@/components/client-session-provider";
import { ClientThemeProvider } from "@/components/client-theme-provider";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <ClientSessionProvider>
      <HeroUIProvider navigate={router.push}>
        <ClientThemeProvider themeProps={themeProps as any}>
          <ToastProvider placement="top-right" />
          {children}
        </ClientThemeProvider>
      </HeroUIProvider>
    </ClientSessionProvider>
  );
}
