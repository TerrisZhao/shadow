"use client";

import { useState } from "react";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { addToast } from "@heroui/toast";
import {
  MoreVertical,
  Heart,
  HeartOff,
  Play,
  Pause,
  Volume2,
  Trash2,
  Edit,
  Bot,
} from "lucide-react";
import { useSession } from "next-auth/react";

import EditSentenceModal from "./edit-sentence-modal";
import AIAssistant from "./ai-assistant";

interface Category {
  id: number;
  name: string;
  color: string;
}

interface Sentence {
  id: number;
  englishText: string;
  chineseText?: string | null;
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

interface SimpleSentenceCardProps {
  sentence: Sentence;
  onRefresh?: () => void;
}

export default function SimpleSentenceCard({
  sentence,
  onRefresh,
}: SimpleSentenceCardProps) {
  const { data: session } = useSession();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  // 检查是否为管理员
  const isAdmin = Boolean(
    session?.user &&
      (session.user as any).role &&
      (session.user as any).role === "admin",
  );

  // 检查是否为私有句子
  const isPrivateSentence = (sentence: Sentence) => {
    if (!session?.user || !(session.user as any).id) return false;
    return sentence.userId === parseInt((session.user as any).id);
  };

  // 显示toast消息
  const showToast = (message: string, type: "success" | "error") => {
    addToast({
      title: message,
      color: type === "success" ? "success" : "danger",
    });
  };

  // 获取难度颜色
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "success";
      case "medium":
        return "warning";
      case "hard":
        return "danger";
      default:
        return "default";
    }
  };

  // 获取难度文本
  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "简单";
      case "medium":
        return "中等";
      case "hard":
        return "困难";
      default:
        return "未知";
    }
  };

  // 处理收藏切换
  const toggleFavorite = async (sentenceId: number, currentFavorite: boolean) => {
    try {
      const response = await fetch(`/api/sentences/${sentenceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isFavorite: !currentFavorite,
        }),
      });

      if (response.ok) {
        showToast(
          !currentFavorite ? "已添加到收藏" : "已取消收藏",
          "success",
        );
        if (onRefresh) {
          onRefresh();
        }
      } else {
        const error = await response.json();
        showToast(error.error || "操作失败", "error");
      }
    } catch (error) {
      console.error("收藏切换失败:", error);
      showToast("网络错误，请重试", "error");
    }
  };

  // 处理删除
  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/sentences/${sentence.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showToast("句子删除成功", "success");
        if (onRefresh) {
          onRefresh();
        }
        setDeleteConfirmOpen(false);
      } else {
        const error = await response.json();
        showToast(error.error || "删除失败", "error");
      }
    } catch (error) {
      console.error("删除句子失败:", error);
      showToast("网络错误，请重试", "error");
    }
  };

  // 打开编辑模态框
  const openEditModal = (sentence: Sentence) => {
    setEditModalOpen(true);
  };

  // 打开删除确认
  const openDeleteConfirm = (sentenceId: number) => {
    setDeleteConfirmOpen(true);
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardBody className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Chip
                size="sm"
                style={{
                  backgroundColor: sentence.category?.color || "#999999",
                  color: "white",
                }}
              >
                {sentence.category?.name || "未分类"}
              </Chip>
              <Chip
                color={getDifficultyColor(sentence.difficulty)}
                size="sm"
                variant="flat"
              >
                {getDifficultyText(sentence.difficulty)}
              </Chip>
              {sentence.isShared ? (
                <Chip color="primary" size="sm" variant="flat">
                  共享
                </Chip>
              ) : (
                <Chip color="default" size="sm" variant="flat">
                  自定义
                </Chip>
              )}
              {sentence.isFavorite && (
                <Chip color="danger" size="sm" variant="flat">
                  收藏
                </Chip>
              )}
            </div>
            <Dropdown>
              <DropdownTrigger>
                <Button isIconOnly size="sm" variant="light">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                onAction={(key) => {
                  if (key === "delete") {
                    openDeleteConfirm(sentence.id);
                  } else if (key === "favorite") {
                    toggleFavorite(sentence.id, sentence.isFavorite);
                  } else if (key === "edit") {
                    openEditModal(sentence);
                  } else if (key === "ai") {
                    setAiAssistantOpen(true);
                  }
                }}
              >
                <DropdownItem key="favorite">
                  {sentence.isFavorite ? (
                    <div className="flex items-center gap-2">
                      <HeartOff className="w-4 h-4" />
                      <span>取消收藏</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      <span>添加收藏</span>
                    </div>
                  )}
                </DropdownItem>
                {isPrivateSentence(sentence) || (isAdmin && sentence.isShared) ? (
                  <DropdownItem key="edit">
                    <div className="flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      <span>编辑</span>
                    </div>
                  </DropdownItem>
                ) : null}
                <DropdownItem key="ai">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    <span>AI 学习助手</span>
                  </div>
                </DropdownItem>
                {isPrivateSentence(sentence) || (isAdmin && sentence.isShared) ? (
                  <DropdownItem key="delete" className="text-danger">
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      <span>删除</span>
                    </div>
                  </DropdownItem>
                ) : null}
              </DropdownMenu>
            </Dropdown>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {sentence.englishText}
              </h3>
              <p className="text-sm text-default-600">
                {sentence.chineseText || "(暂无中文翻译)"}
              </p>
              {sentence.notes && (
                <p className="text-xs text-default-500 mt-2">
                  {sentence.notes}
                </p>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 编辑句子Modal */}
      <EditSentenceModal
        isOpen={editModalOpen}
        sentence={sentence}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          if (onRefresh) {
            onRefresh();
          }
        }}
      />

      {/* 删除句子确认对话框 */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">确认删除句子</h2>
          </ModalHeader>
          <ModalBody>
            <p>确定要删除这个句子吗？删除后将无法恢复。</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setDeleteConfirmOpen(false)}>
              取消
            </Button>
            <Button color="danger" onPress={handleDelete}>
              删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* AI 学习助手模态框 */}
      <AIAssistant
        sentence={sentence.englishText}
        isOpen={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
      />
    </>
  );
}
