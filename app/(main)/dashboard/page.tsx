"use client";

import { useSession } from "next-auth/react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { subtitle } from "@/components/primitives";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !session && status !== "loading") {
      router.push("/sign-in");
    }
  }, [mounted, session, status, router]);

  if (!mounted || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <p className={subtitle({ class: "mt-2" })}>
          欢迎回来，{session.user?.name || session.user?.email}！
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Avatar
              name={session.user?.name || session.user?.email || "用户"}
              size="md"
              src={session.user?.image || undefined}
            />
            <div>
              <h3 className="text-lg font-semibold">个人信息</h3>
              <p className="text-small text-default-500">
                查看和编辑您的个人资料
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              <div>
                <span className="text-small font-medium">姓名：</span>
                <span className="text-small">
                  {session.user?.name || "未设置"}
                </span>
              </div>
              <div>
                <span className="text-small font-medium">邮箱：</span>
                <span className="text-small">{session.user?.email}</span>
              </div>
            </div>
            <Button
              className="mt-4"
              variant="flat"
              onClick={() => router.push("/profile")}
            >
              编辑资料
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">快速操作</h3>
            <p className="text-small text-default-500">常用功能快捷入口</p>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <Button
                className="w-full justify-start"
                variant="flat"
                onClick={() => router.push("/settings")}
              >
                设置
              </Button>
              <Button
                className="w-full justify-start"
                variant="flat"
                onClick={() => router.push("/help")}
              >
                帮助中心
              </Button>
              <Button
                className="w-full justify-start"
                variant="flat"
                onClick={() => router.push("/about")}
              >
                关于我们
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">系统状态</h3>
            <p className="text-small text-default-500">当前系统运行状态</p>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-small">认证状态</span>
                <span className="text-small text-success">已登录</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-small">会话状态</span>
                <span className="text-small text-success">活跃</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-small">最后登录</span>
                <span className="text-small text-default-500">刚刚</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">最近活动</h3>
            <p className="text-small text-default-500">您的最近操作记录</p>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-default-50 rounded-lg">
                <div className="w-2 h-2 bg-success rounded-full" />
                <div className="flex-1">
                  <p className="text-small font-medium">成功登录</p>
                  <p className="text-tiny text-default-500">刚刚</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-default-50 rounded-lg">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <div className="flex-1">
                  <p className="text-small font-medium">访问仪表板</p>
                  <p className="text-tiny text-default-500">刚刚</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
