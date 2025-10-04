"use client";

import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export function AuthButton() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <Button
        className="text-sm font-normal text-default-600 bg-default-100"
        variant="flat"
        isLoading
      >
        加载中...
      </Button>
    );
  }

  if (session) {
    return (
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <Avatar
            isBordered
            as="button"
            className="transition-transform"
            color="secondary"
            name={session.user?.name || session.user?.email || "用户"}
            size="sm"
            src={session.user?.image || undefined}
          />
        </DropdownTrigger>
        <DropdownMenu aria-label="Profile Actions" variant="flat">
          <DropdownItem key="profile" className="h-14 gap-2">
            <p className="font-semibold">登录为</p>
            <p className="font-semibold">{session.user?.email}</p>
          </DropdownItem>
          <DropdownItem 
            key="dashboard" 
            onClick={() => router.push('/dashboard')}
          >
            仪表板
          </DropdownItem>
          <DropdownItem 
            key="settings" 
            onClick={() => router.push('/settings')}
          >
            设置
          </DropdownItem>
          <DropdownItem 
            key="logout" 
            color="danger"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            登出
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    );
  }

  return (
    <Button
      className="text-sm font-normal text-default-600 bg-default-100"
      variant="flat"
      onClick={() => signIn()}
    >
      登录
    </Button>
  );
}
