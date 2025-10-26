"use client";

import React, { useState } from "react";
import { Button } from "@heroui/button";
import { Tabs, Tab } from "@heroui/tabs";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Pagination } from "@heroui/pagination";
import { Plus, Heart, HeartOff, Trash2, Edit, Eye } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { addToast } from "@heroui/toast";

import AddSceneModal from "@/components/add-scene-modal";

interface Scene {
  id: number;
  title: string;
  description?: string;
  isShared: boolean;
  isFavorite: boolean;
  userId: number;
  createdAt: string;
  updatedAt: string;
  sentencesCount: number;
}

export default function ScenePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTab, setSelectedTab] = useState("shared");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const limit = 10;

  // 显示toast消息
  const showToast = (message: string, type: "success" | "error") => {
    addToast({
      title: message,
      color: type === "success" ? "success" : "danger",
    });
  };

  // 获取场景列表
  const fetchScenes = async (
    page = 1,
    tabFilter = "shared",
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        tab: tabFilter,
      });

      const response = await fetch(`/api/scenes?${params}`);

      if (response.ok) {
        const data = await response.json();
        setScenes(data.scenes);
        setHasMore(data.pagination.hasMore);
        setTotalPages(
          Math.ceil(data.scenes.length / limit) +
            (data.pagination.hasMore ? 1 : 0),
        );
      }
    } catch (error) {
      showToast("获取场景列表失败", "error");
    } finally {
      setLoading(false);
    }
  };

  // 处理添加成功
  const handleAddSuccess = () => {
    setRefreshKey((prev) => prev + 1);
    fetchScenes(currentPage, selectedTab);
  };

  // 处理标签页切换
  const handleTabChange = (key: React.Key) => {
    setSelectedTab(key as string);
    setCurrentPage(1);
    fetchScenes(1, key as string);
  };

  // 处理分页
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchScenes(page, selectedTab);
  };

  // 切换收藏状态
  const toggleFavorite = async (
    sceneId: number,
    currentFavorite: boolean,
  ) => {
    try {
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isFavorite: !currentFavorite,
        }),
      });

      if (response.ok) {
        setScenes((prevScenes) =>
          prevScenes.map((scene) =>
            scene.id === sceneId
              ? { ...scene, isFavorite: !currentFavorite }
              : scene,
          ),
        );
        showToast(!currentFavorite ? "已添加到收藏" : "已取消收藏", "success");
      } else {
        const error = await response.json();
        showToast(error.error || "操作失败", "error");
      }
    } catch (error) {
      showToast("操作失败，请重试", "error");
    }
  };

  // 删除场景
  const deleteScene = async (sceneId: number) => {
    try {
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setScenes((prevScenes) =>
          prevScenes.filter((scene) => scene.id !== sceneId),
        );
        showToast("场景删除成功！", "success");
      } else {
        const error = await response.json();
        showToast(error.error || "删除失败", "error");
      }
    } catch (error) {
      showToast("删除失败，请重试", "error");
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // 根据当前 tab 获取空状态文案
  const getEmptyMessage = () => {
    switch (selectedTab) {
      case "shared":
        return "暂无共享场景，管理员还未添加任何公共场景";
      case "custom":
        return "暂无自定义场景，点击右上角按钮添加您的第一个场景吧！";
      case "favorite":
        return "暂无收藏场景，快去收藏一些喜欢的场景吧！";
      default:
        return "暂无场景";
    }
  };

  // 检查是否为管理员
  const isAdmin = Boolean(
    session?.user &&
      (session.user as any).role &&
      ["admin", "owner"].includes((session.user as any).role),
  );

  // 判断场景是否为当前用户的私有场景
  const isPrivateScene = (scene: Scene) => {
    if (session?.user && (session.user as any).id) {
      const currentUserId = parseInt((session.user as any).id);
      return !scene.isShared && scene.userId === currentUserId;
    }
    return false;
  };

  // 初始化加载
  React.useEffect(() => {
    if (status === "authenticated") {
      fetchScenes(currentPage, selectedTab);
    }
  }, [status, currentPage, selectedTab]);

  // 如果 session 还在加载中，显示加载状态
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Tabs 和添加按钮 */}
      <div className="flex justify-center items-center relative">
        <Tabs
          aria-label="场景库选项"
          color="primary"
          selectedKey={selectedTab}
          size="lg"
          onSelectionChange={handleTabChange}
        >
          <Tab key="shared" title="共享库" />
          <Tab key="custom" title="自定义" />
          <Tab key="favorite" title="收藏" />
        </Tabs>
        <div className="absolute right-0">
          <Button
            isIconOnly
            className="md:w-auto md:h-auto md:px-3 md:py-2"
            color="primary"
            onPress={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline md:ml-2">添加场景</span>
          </Button>
        </div>
      </div>

      {/* 场景列表 */}
      {loading && scenes.length === 0 ? (
        <div className="flex justify-center items-center py-8">
          <Spinner size="lg" />
        </div>
      ) : scenes.length === 0 ? (
        <Card>
          <CardBody className="text-center py-8">
            <p className="text-default-500">{getEmptyMessage()}</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {scenes.map((scene) => (
              <motion.div
                key={scene.id}
                layout
                exit={{
                  opacity: 0,
                  scale: 0.8,
                  height: 0,
                  marginBottom: 0,
                  transition: { duration: 0.3 },
                }}
                initial={{ opacity: 1, scale: 1 }}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardBody className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        {scene.isShared ? (
                          <Chip color="primary" size="sm" variant="flat">
                            共享
                          </Chip>
                        ) : (
                          <Chip color="default" size="sm" variant="flat">
                            自定义
                          </Chip>
                        )}
                        {scene.isFavorite && (
                          <Chip color="danger" size="sm" variant="flat">
                            收藏
                          </Chip>
                        )}
                        <Chip color="secondary" size="sm" variant="flat">
                          {scene.sentencesCount} 个句子
                        </Chip>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color={scene.isFavorite ? "danger" : "default"}
                          onPress={() => toggleFavorite(scene.id, scene.isFavorite)}
                        >
                          {scene.isFavorite ? (
                            <Heart className="w-4 h-4" />
                          ) : (
                            <HeartOff className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="primary"
                          onPress={() => router.push(`/scene/${scene.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {(isPrivateScene(scene) || (isAdmin && scene.isShared)) && (
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="warning"
                            onPress={() => router.push(`/scene/${scene.id}/edit`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {(isPrivateScene(scene) || (isAdmin && scene.isShared)) && (
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            onPress={() => deleteScene(scene.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          {scene.title}
                        </h3>
                        {scene.description && (
                          <p className="text-default-600 text-base">
                            {scene.description}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-sm text-default-400">
                        <span>
                          创建时间：{formatDate(scene.createdAt)}
                        </span>
                        <span>
                          更新时间：{formatDate(scene.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 分页 */}
      {scenes.length > 0 && (
        <div className="flex justify-center">
          <Pagination
            showControls
            page={currentPage}
            total={totalPages}
            onChange={handlePageChange}
          />
        </div>
      )}

      {/* 添加场景模态框 */}
      <AddSceneModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
