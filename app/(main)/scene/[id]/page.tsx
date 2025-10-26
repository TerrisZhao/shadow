"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { ArrowLeft, Edit, Trash2, Heart, HeartOff } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { addToast } from "@heroui/toast";

import SentenceCard from "@/components/sentence-card";

interface Category {
  id: number;
  name: string;
  color: string;
}

interface Sentence {
  id: number;
  englishText: string;
  chineseText: string;
  difficulty: string;
  notes?: string;
  isFavorite: boolean;
  isShared: boolean;
  audioUrl?: string;
  userId: number;
  createdAt: string;
  category: Category;
  recordingsCount?: number;
}

interface SceneSentence {
  id: number;
  order: number;
  sentence: Sentence;
}

interface Scene {
  id: number;
  title: string;
  description?: string;
  isShared: boolean;
  isFavorite: boolean;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export default function SceneDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const sceneId = params.id as string;

  const [scene, setScene] = useState<Scene | null>(null);
  const [sentences, setSentences] = useState<SceneSentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // 显示toast消息
  const showToast = (message: string, type: "success" | "error") => {
    addToast({
      title: message,
      color: type === "success" ? "success" : "danger",
    });
  };

  // 获取场景详情
  const fetchSceneDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/scenes/${sceneId}`);

      if (response.ok) {
        const data = await response.json();

        setScene(data.scene);
        setSentences(data.sentences);
      } else if (response.status === 404) {
        showToast("场景不存在", "error");
        router.push("/scene");
      } else if (response.status === 403) {
        showToast("无权限访问此场景", "error");
        router.push("/scene");
      } else {
        showToast("获取场景详情失败", "error");
      }
    } catch (error) {
      showToast("获取场景详情失败", "error");
    } finally {
      setLoading(false);
    }
  };

  // 切换收藏状态
  const toggleFavorite = async (currentFavorite: boolean) => {
    if (!scene) return;

    try {
      const response = await fetch(`/api/scenes/${scene.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isFavorite: !currentFavorite,
        }),
      });

      if (response.ok) {
        setScene((prev) =>
          prev ? { ...prev, isFavorite: !currentFavorite } : null,
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
  const deleteScene = async () => {
    if (!scene) return;

    if (!confirm("确定要删除这个场景吗？删除后将无法恢复。")) {
      return;
    }

    try {
      const response = await fetch(`/api/scenes/${scene.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showToast("场景删除成功！", "success");
        router.push("/scene");
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

  // 处理句子刷新
  const handleSentenceRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    fetchSceneDetail();
  };

  // 初始化加载
  useEffect(() => {
    if (status === "authenticated" && sceneId) {
      fetchSceneDetail();
    }
  }, [status, sceneId]);

  // 如果 session 还在加载中，显示加载状态
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!scene) {
    return (
      <div className="text-center py-8">
        <p className="text-default-500">场景不存在或已被删除</p>
        <Button
          className="mt-4"
          color="primary"
          onPress={() => router.push("/scene")}
        >
          返回场景列表
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* 返回按钮和操作按钮 */}
      <div className="flex justify-between items-center">
        <Button
          startContent={<ArrowLeft className="w-4 h-4" />}
          variant="light"
          onPress={() => router.push("/scene")}
        >
          返回场景列表
        </Button>

        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            color={scene.isFavorite ? "danger" : "default"}
            size="sm"
            variant="light"
            onPress={() => toggleFavorite(scene.isFavorite)}
          >
            {scene.isFavorite ? (
              <Heart className="w-4 h-4" />
            ) : (
              <HeartOff className="w-4 h-4" />
            )}
          </Button>
          {(isPrivateScene(scene) || (isAdmin && scene.isShared)) && (
            <Button
              isIconOnly
              color="warning"
              size="sm"
              variant="light"
              onPress={() => router.push(`/scene/${scene.id}/edit`)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {(isPrivateScene(scene) || (isAdmin && scene.isShared)) && (
            <Button
              isIconOnly
              color="danger"
              size="sm"
              variant="light"
              onPress={deleteScene}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 场景信息 */}
      <Card>
        <CardBody className="p-6">
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {scene.title}
              </h1>
              {scene.description && (
                <p className="text-default-600 text-lg">{scene.description}</p>
              )}
            </div>

            <div className="flex justify-between items-center text-sm text-default-400">
              <span>创建时间：{formatDate(scene.createdAt)}</span>
              <span>更新时间：{formatDate(scene.updatedAt)}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 句子列表 */}
      <div className="space-y-4">
        {sentences.length === 0 ? (
          <Card>
            <CardBody className="text-center py-8">
              <p className="text-default-500">此场景暂无句子</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {sentences.map((sceneSentence, index) => (
                <motion.div
                  key={`${sceneSentence.id}-${refreshKey}`}
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
                  <div className="relative">
                    {/* 句子序号 */}
                    <div className="absolute -left-2 top-6 z-10">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                    </div>
                    {/* 句子卡片 */}
                    <div className="ml-6">
                      <SentenceCard
                        sentence={sceneSentence.sentence}
                        showActions={true}
                        onRefresh={handleSentenceRefresh}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
