"use client";

import { useSession } from "next-auth/react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { Select, SelectItem } from "@heroui/select";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { addToast } from "@heroui/toast";
import {
  X,
  Check,
  Sun,
  Moon,
  Monitor,
  Clock,
  MapPin,
  Smartphone,
  Monitor as MonitorIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

import { title, subtitle } from "@/components/primitives";

// 登录历史类型定义
interface LoginHistoryItem {
  id: number;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
  isSuccessful: boolean;
  failureReason: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session, update, status } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);

  // 用户信息编辑状态
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const nameEditRef = useRef<HTMLDivElement>(null);

  // 主题模式状态
  const [themeMode, setThemeMode] = useState<string>("system");
  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false);

  // 登录历史状态
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [isLoginHistoryOpen, setIsLoginHistoryOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 显示toast消息
  const showToast = (message: string, type: "success" | "error") => {
    addToast({
      title: message,
      color: type === "success" ? "success" : "danger",
    });
  };

  // 初始化姓名和主题模式
  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
    if (session?.user && (session.user as any)?.themeMode) {
      setThemeMode((session.user as any).themeMode);
    }
  }, [session?.user]);

  // 点击外部区域取消编辑
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isEditingName &&
        nameEditRef.current &&
        !nameEditRef.current.contains(event.target as Node)
      ) {
        handleCancelEdit();
      }
    };

    if (isEditingName) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditingName]);

  // 更新用户姓名
  const handleUpdateName = async () => {
    if (!name.trim()) {
      showToast("姓名不能为空", "error");

      return;
    }

    if (name.trim() === session?.user?.name) {
      setIsEditingName(false);

      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "更新失败");
      }

      // 更新session
      await update({
        ...session,
        user: {
          ...session?.user,
          name: name.trim(),
        },
      });

      showToast("姓名更新成功", "success");
      setIsEditingName(false);
    } catch (error) {
      console.error("更新姓名失败:", error);
      showToast(error instanceof Error ? error.message : "更新失败", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setName(session?.user?.name || "");
    setIsEditingName(false);
  };

  // 更新主题模式
  const handleThemeModeChange = async (newThemeMode: string) => {
    setIsUpdatingTheme(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ themeMode: newThemeMode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "更新失败");
      }

      // 更新session
      await update({
        ...session,
        user: {
          ...session?.user,
          themeMode: newThemeMode,
        },
      });

      // 更新next-themes
      setTheme(newThemeMode);
      setThemeMode(newThemeMode);

      showToast("主题设置更新成功", "success");
    } catch (error) {
      console.error("更新主题模式失败:", error);
      showToast(error instanceof Error ? error.message : "更新失败", "error");
    } finally {
      setIsUpdatingTheme(false);
    }
  };

  // 获取登录历史
  const fetchLoginHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch("/api/user/login-history");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "获取登录历史失败");
      }

      setLoginHistory(data.history);
    } catch (error) {
      console.error("获取登录历史失败:", error);
      showToast(
        error instanceof Error ? error.message : "获取登录历史失败",
        "error",
      );
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 打开登录历史模态框
  const handleOpenLoginHistory = () => {
    setIsLoginHistoryOpen(true);
    fetchLoginHistory();
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 获取设备图标
  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone size={16} />;
      case "tablet":
        return <MonitorIcon size={16} />;
      default:
        return <Monitor size={16} />;
    }
  };

  // 处理session状态
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
    }
  }, [status, router]);

  // 显示加载状态
  if (status === "loading") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className={title()}>设置</h1>
          <p className={subtitle({ class: "mt-2" })}>管理您的账户设置和偏好</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-default-500">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  // 如果未认证，不渲染内容（useEffect会处理跳转）
  if (status === "unauthenticated" || !session) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className={title()}>设置</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">账户信息</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <div ref={nameEditRef} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    classNames={{
                      input: "cursor-pointer",
                    }}
                    isReadOnly={!isEditingName}
                    label="姓名"
                    placeholder="输入您的姓名"
                    value={name}
                    variant={isEditingName ? "bordered" : "flat"}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => !isEditingName && setIsEditingName(true)}
                  />
                </div>
                {isEditingName && (
                  <div className="flex gap-2">
                    <Button
                      isIconOnly
                      className="min-w-10 w-10 h-10 rounded-lg"
                      color="danger"
                      isDisabled={isLoading}
                      variant="light"
                      onClick={handleCancelEdit}
                    >
                      <X size={18} />
                    </Button>
                    <Button
                      isIconOnly
                      className="min-w-10 w-10 h-10 rounded-lg"
                      color="success"
                      isDisabled={!name.trim()}
                      isLoading={isLoading}
                      variant="light"
                      onClick={handleUpdateName}
                    >
                      <Check size={18} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <Input
              isReadOnly
              defaultValue={session.user?.email || ""}
              description="邮箱地址不可修改"
              label="邮箱"
              placeholder="输入您的邮箱"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">通知设置</h3>
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
                <p className="text-medium font-medium">主题模式</p>
              </div>
              <div style={{ width: "140px" }}>
                <Select
                  classNames={{
                    trigger: "min-h-8 h-8 w-full",
                    value: "text-sm",
                    mainWrapper: "w-full",
                  }}
                  isDisabled={isUpdatingTheme}
                  selectedKeys={[themeMode]}
                  size="sm"
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string;

                    if (selectedKey) {
                      handleThemeModeChange(selectedKey);
                    }
                  }}
                >
                  <SelectItem key="light" startContent={<Sun size={16} />}>
                    浅色
                  </SelectItem>
                  <SelectItem key="dark" startContent={<Moon size={16} />}>
                    深色
                  </SelectItem>
                  <SelectItem key="system" startContent={<Monitor size={16} />}>
                    跟随系统
                  </SelectItem>
                </Select>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">安全设置</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Button
              className="w-full justify-start"
              variant="flat"
              onClick={handleOpenLoginHistory}
            >
              登录历史
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">数据管理</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Button className="w-full justify-start" variant="flat">
              导出数据
            </Button>
            <Button
              className="w-full justify-start"
              color="danger"
              variant="flat"
            >
              删除账户
            </Button>
          </CardBody>
        </Card>
      </div>

      {/* 登录历史模态框 */}
      <Modal
        isOpen={isLoginHistoryOpen}
        scrollBehavior="inside"
        size="2xl"
        onOpenChange={setIsLoginHistoryOpen}
      >
        <ModalContent>
          <ModalHeader>
            <h3 className="text-lg font-semibold">登录历史</h3>
          </ModalHeader>
          <ModalBody>
            {isLoadingHistory ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : loginHistory.length === 0 ? (
              <div className="text-center py-8 text-default-500">
                暂无登录历史记录
              </div>
            ) : (
              <div className="space-y-4">
                {loginHistory.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getDeviceIcon(item.deviceType)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {item.browser || "Unknown Browser"}
                            </span>
                            <span className="text-sm text-default-500">
                              on {item.os || "Unknown OS"}
                            </span>
                          </div>
                          <div className="text-sm text-default-500 mt-1">
                            {item.deviceType && (
                              <span className="capitalize">
                                {item.deviceType}
                              </span>
                            )}
                            {item.ipAddress && (
                              <span className="ml-2">
                                <MapPin className="inline mr-1" size={12} />
                                {item.ipAddress}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-default-500">
                          <Clock size={12} />
                          {formatDate(item.createdAt)}
                        </div>
                        <div
                          className={`text-xs mt-1 ${
                            item.isSuccessful ? "text-success" : "text-danger"
                          }`}
                        >
                          {item.isSuccessful ? "登录成功" : "登录失败"}
                        </div>
                      </div>
                    </div>
                    {!item.isSuccessful && item.failureReason && (
                      <div className="mt-2 text-sm text-danger">
                        失败原因: {item.failureReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onClick={() => setIsLoginHistoryOpen(false)}>
              关闭
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
