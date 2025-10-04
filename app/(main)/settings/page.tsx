"use client";

import { useSession } from "next-auth/react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { title, subtitle } from "@/components/primitives";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  if (!session) {
    router.push("/sign-in");
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className={title()}>设置</h1>
        <p className={subtitle({ class: "mt-2" })}>
          管理您的账户设置和偏好
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">账户信息</h3>
            <p className="text-small text-default-500">管理您的个人信息</p>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="姓名"
              placeholder="输入您的姓名"
              defaultValue={session.user?.name || ""}
              isReadOnly
            />
            <Input
              label="邮箱"
              placeholder="输入您的邮箱"
              defaultValue={session.user?.email || ""}
              isReadOnly
            />
            <Button variant="flat" onClick={() => router.push("/profile")}>
              编辑个人信息
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">通知设置</h3>
            <p className="text-small text-default-500">管理您接收的通知类型</p>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-medium font-medium">邮件通知</p>
                <p className="text-small text-default-500">
                  接收重要更新和通知邮件
                </p>
              </div>
              <Switch
                isSelected={notifications}
                onValueChange={setNotifications}
              />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-medium font-medium">深色模式</p>
                <p className="text-small text-default-500">
                  使用深色主题界面
                </p>
              </div>
              <Switch
                isSelected={darkMode}
                onValueChange={setDarkMode}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">安全设置</h3>
            <p className="text-small text-default-500">管理您的账户安全</p>
          </CardHeader>
          <CardBody className="space-y-4">
            <Button variant="flat" className="w-full justify-start">
              更改密码
            </Button>
            <Button variant="flat" className="w-full justify-start">
              两步验证
            </Button>
            <Button variant="flat" className="w-full justify-start">
              登录历史
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">数据管理</h3>
            <p className="text-small text-default-500">管理您的数据</p>
          </CardHeader>
          <CardBody className="space-y-4">
            <Button variant="flat" className="w-full justify-start">
              导出数据
            </Button>
            <Button 
              variant="flat" 
              color="danger" 
              className="w-full justify-start"
            >
              删除账户
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
