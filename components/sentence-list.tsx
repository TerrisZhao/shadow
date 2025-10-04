"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { Pagination } from "@heroui/pagination";
import { Select, SelectItem } from "@heroui/select";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
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
} from "lucide-react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

import EditSentenceModal from "./edit-sentence-modal";

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
}

interface SentenceListProps {
  onRefresh?: () => void;
  tab?: string;
}

export default function SentenceList({
  onRefresh,
  tab = "shared",
}: SentenceListProps) {
  const { data: session, status } = useSession();
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  );
  const [generatingAudio, setGeneratingAudio] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sentenceToDelete, setSentenceToDelete] = useState<number | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [sentenceToEdit, setSentenceToEdit] = useState<Sentence | null>(null);
  const [removingItems, setRemovingItems] = useState<Map<number, number>>(
    new Map(),
  ); // sentenceId -> countdown
  const timersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // 检查是否为管理员
  const isAdmin = Boolean(
    session?.user &&
      (session.user as any).role &&
      ["admin", "owner"].includes((session.user as any).role),
  );

  // 显示toast消息
  const showToast = (message: string, type: "success" | "error") => {
    addToast({
      title: message,
      color: type === "success" ? "success" : "danger",
    });
  };

  // 判断句子是否为当前用户的私有句子
  const isPrivateSentence = (sentence: Sentence) => {
    // 如果句子不是共享的，且属于当前用户，则为私有句子
    if (session?.user && (session.user as any).id) {
      const currentUserId = parseInt((session.user as any).id);

      return !sentence.isShared && sentence.userId === currentUserId;
    }

    return false;
  };

  const limit = 10;

  // 获取句子列表
  const fetchSentences = async (
    page = 1,
    categoryId = "all",
    difficulty = "all",
    tabFilter = "shared",
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        tab: tabFilter,
      });

      if (categoryId && categoryId !== "all") {
        params.append("categoryId", categoryId);
      }

      if (difficulty && difficulty !== "all") {
        params.append("difficulty", difficulty);
      }

      const response = await fetch(`/api/sentences?${params}`);

      if (response.ok) {
        const data = await response.json();

        setSentences(data.sentences);
        setHasMore(data.pagination.hasMore);
        setTotalPages(
          Math.ceil(data.sentences.length / limit) +
            (data.pagination.hasMore ? 1 : 0),
        );
      }
    } catch (error) {
      console.error("获取句子列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 获取分类列表
  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");

      if (response.ok) {
        const data = await response.json();

        setCategories(data.categories);
      }
    } catch (error) {
      console.error("获取分类失败:", error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchSentences(currentPage, selectedCategory, selectedDifficulty, tab);
  }, [currentPage, selectedCategory, selectedDifficulty, tab]);

  // 清理定时器
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearInterval(timer));
      timersRef.current.clear();
    };
  }, []);

  // 如果 session 还在加载中，显示加载状态
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  const handleDifficultyChange = (value: string) => {
    setSelectedDifficulty(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // 根据当前 tab 获取空状态文案
  const getEmptyMessage = () => {
    switch (tab) {
      case "shared":
        return "暂无共享句子，管理员还未添加任何公共句子";
      case "custom":
        return "暂无自定义句子，点击右上角按钮添加您的第一个句子吧！";
      case "favorite":
        return "暂无收藏句子，快去收藏一些喜欢的句子吧！";
      default:
        return "暂无句子";
    }
  };

  // 播放音频
  const playAudio = async (audioUrl: string, sentenceId: number) => {
    try {
      // 如果正在播放其他音频，先停止
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }

      // 如果点击的是当前正在播放的音频，则停止播放
      if (playingAudio === sentenceId) {
        setPlayingAudio(null);
        setAudioElement(null);

        return;
      }

      // 创建新的音频元素
      const audio = new Audio(audioUrl);

      setAudioElement(audio);
      setPlayingAudio(sentenceId);

      // 播放音频
      await audio.play();

      // 音频播放结束时的处理
      audio.onended = () => {
        setPlayingAudio(null);
        setAudioElement(null);
      };

      // 音频播放错误时的处理
      audio.onerror = () => {
        console.error("音频播放失败");
        setPlayingAudio(null);
        setAudioElement(null);
      };
    } catch (error) {
      console.error("播放音频失败:", error);
      setPlayingAudio(null);
      setAudioElement(null);
    }
  };

  // 打开编辑modal
  const openEditModal = (sentence: Sentence) => {
    setSentenceToEdit(sentence);
    setEditModalOpen(true);
  };

  // 打开删除确认对话框
  const openDeleteConfirm = (sentenceId: number) => {
    setSentenceToDelete(sentenceId);
    setDeleteConfirmOpen(true);
  };

  // 确认删除句子
  const confirmDelete = async () => {
    if (!sentenceToDelete) return;

    try {
      const response = await fetch(`/api/sentences/${sentenceToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // 从列表中移除已删除的句子
        setSentences((prevSentences) =>
          prevSentences.filter((sentence) => sentence.id !== sentenceToDelete),
        );
        showToast("句子删除成功！", "success");
      } else {
        const error = await response.json();

        showToast(error.error || "删除失败", "error");
      }
    } catch (error) {
      console.error("删除句子失败:", error);
      showToast("删除失败，请重试", "error");
    } finally {
      setDeleteConfirmOpen(false);
      setSentenceToDelete(null);
    }
  };

  // 切换收藏状态
  const toggleFavorite = async (
    sentenceId: number,
    currentFavorite: boolean,
  ) => {
    // 如果在收藏 Tab 中取消收藏，先启动倒计时，不立即调用API
    if (tab === "favorite" && currentFavorite) {
      startRemovalCountdown(sentenceId);

      return;
    }

    // 其他情况直接调用API更新
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
        setSentences((prevSentences) =>
          prevSentences.map((sentence) =>
            sentence.id === sentenceId
              ? { ...sentence, isFavorite: !currentFavorite }
              : sentence,
          ),
        );
        showToast(!currentFavorite ? "已添加到收藏" : "已取消收藏", "success");
      } else {
        const error = await response.json();

        showToast(error.error || "操作失败", "error");
      }
    } catch (error) {
      console.error("切换收藏状态失败:", error);
      showToast("操作失败，请重试", "error");
    }
  };

  // 启动移除倒计时
  const startRemovalCountdown = (sentenceId: number) => {
    // 清除可能存在的旧定时器
    const existingTimer = timersRef.current.get(sentenceId);

    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // 先更新本地状态，让UI显示为未收藏（但不调用API）
    setSentences((prevSentences) =>
      prevSentences.map((sentence) =>
        sentence.id === sentenceId
          ? { ...sentence, isFavorite: false }
          : sentence,
      ),
    );

    let countdown = 5;

    setRemovingItems((prev) => new Map(prev).set(sentenceId, countdown));

    const timer = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        setRemovingItems((prev) => new Map(prev).set(sentenceId, countdown));
      } else {
        // 倒计时结束，调用API取消收藏
        clearInterval(timer);
        timersRef.current.delete(sentenceId);

        // 调用API取消收藏
        removeFavoriteAfterCountdown(sentenceId);
      }
    }, 1000);

    timersRef.current.set(sentenceId, timer);
  };

  // 倒计时结束后调用API取消收藏
  const removeFavoriteAfterCountdown = async (sentenceId: number) => {
    try {
      const response = await fetch(`/api/sentences/${sentenceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isFavorite: false,
        }),
      });

      if (response.ok) {
        // API调用成功，更新UI并从列表移除
        setRemovingItems((prev) => {
          const newMap = new Map(prev);

          newMap.delete(sentenceId);

          return newMap;
        });

        // 延迟一点再移除，让动画更流畅
        setTimeout(() => {
          setSentences((prevSentences) =>
            prevSentences.filter((sentence) => sentence.id !== sentenceId),
          );
        }, 100);

        showToast("已取消收藏", "success");
      } else {
        // API调用失败，清除倒计时状态并恢复收藏状态
        setRemovingItems((prev) => {
          const newMap = new Map(prev);

          newMap.delete(sentenceId);

          return newMap;
        });
        // 恢复收藏状态
        setSentences((prevSentences) =>
          prevSentences.map((s) =>
            s.id === sentenceId ? { ...s, isFavorite: true } : s,
          ),
        );
        const error = await response.json();

        showToast(error.error || "取消收藏失败", "error");
      }
    } catch (error) {
      console.error("取消收藏失败:", error);
      setRemovingItems((prev) => {
        const newMap = new Map(prev);

        newMap.delete(sentenceId);

        return newMap;
      });
      // 恢复收藏状态
      setSentences((prevSentences) =>
        prevSentences.map((s) =>
          s.id === sentenceId ? { ...s, isFavorite: true } : s,
        ),
      );
      showToast("取消收藏失败，请重试", "error");
    }
  };

  // 手动生成音频
  const generateAudio = async (sentenceId: number, englishText: string) => {
    setGeneratingAudio(sentenceId);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: englishText,
          voice: "af_alloy",
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // 将音频URL保存到数据库
        try {
          const updateResponse = await fetch(`/api/sentences/${sentenceId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              audioUrl: result.url,
            }),
          });

          if (updateResponse.ok) {
            // 更新句子列表中的音频 URL
            setSentences((prevSentences) =>
              prevSentences.map((sentence) =>
                sentence.id === sentenceId
                  ? { ...sentence, audioUrl: result.url }
                  : sentence,
              ),
            );

            showToast("音频生成成功！", "success");
          } else {
            console.error("保存音频URL到数据库失败");
            showToast("音频生成成功，但保存失败", "error");
          }
        } catch (updateError) {
          console.error("更新数据库失败:", updateError);
          showToast("音频生成成功，但保存失败", "error");
        }
      } else {
        showToast("音频生成失败，请重试", "error");
      }
    } catch (error) {
      console.error("生成音频失败:", error);
      showToast("音频生成失败，请重试", "error");
    } finally {
      setGeneratingAudio(null);
    }
  };

  if (loading && sentences.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 筛选器 */}
      <div className="flex gap-4 items-center">
        <Select
          className="w-64"
          disallowEmptySelection={false}
          placeholder="选择分类筛选"
          selectedKeys={new Set([selectedCategory])}
          selectionMode="single"
          onSelectionChange={(keys) => {
            const selectedKey = Array.from(keys)[0] as string;

            handleCategoryChange(selectedKey);
          }}
        >
          <SelectItem key="all" textValue="全部分类">
            全部分类
          </SelectItem>
          {
            categories.map((category) => (
              <SelectItem
                key={category.id.toString()}
                textValue={category.name}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            )) as any
          }
        </Select>

        <Select
          className="w-64"
          disallowEmptySelection={false}
          placeholder="选择难度筛选"
          selectedKeys={new Set([selectedDifficulty])}
          selectionMode="single"
          onSelectionChange={(keys) => {
            const selectedKey = Array.from(keys)[0] as string;

            handleDifficultyChange(selectedKey);
          }}
        >
          <SelectItem key="all" textValue="全部难度">
            全部难度
          </SelectItem>
          <SelectItem key="easy" textValue="简单">
            <div className="flex items-center gap-2">
              <Chip color="success" size="sm" variant="flat">
                简单
              </Chip>
            </div>
          </SelectItem>
          <SelectItem key="medium" textValue="中等">
            <div className="flex items-center gap-2">
              <Chip color="warning" size="sm" variant="flat">
                中等
              </Chip>
            </div>
          </SelectItem>
          <SelectItem key="hard" textValue="困难">
            <div className="flex items-center gap-2">
              <Chip color="danger" size="sm" variant="flat">
                困难
              </Chip>
            </div>
          </SelectItem>
        </Select>
      </div>

      {/* 句子列表 */}
      {sentences.length === 0 ? (
        <Card>
          <CardBody className="text-center py-8">
            <p className="text-default-500">{getEmptyMessage()}</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {sentences.map((sentence) => {
              const isRemoving = removingItems.has(sentence.id);
              const countdown = removingItems.get(sentence.id);

              return (
                <motion.div
                  key={sentence.id}
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
                  <Card
                    className={`hover:shadow-md transition-shadow ${isRemoving ? "opacity-60 border-2 border-danger" : ""}`}
                  >
                    <CardBody className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <Chip
                            size="sm"
                            style={{
                              backgroundColor: sentence.category.color,
                              color: "white",
                            }}
                          >
                            {sentence.category.name}
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
                                toggleFavorite(
                                  sentence.id,
                                  sentence.isFavorite,
                                );
                              } else if (key === "edit") {
                                openEditModal(sentence);
                              }
                            }}
                          >
                            {!sentence.audioUrl ? (
                              <DropdownItem
                                key="generate-audio"
                                isDisabled={generatingAudio === sentence.id}
                                onClick={() =>
                                  generateAudio(
                                    sentence.id,
                                    sentence.englishText,
                                  )
                                }
                              >
                                {generatingAudio === sentence.id ? (
                                  <div className="flex items-center gap-2">
                                    <Spinner size="sm" />
                                    <span>生成中...</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Volume2 className="w-4 h-4" />
                                    <span>生成音频</span>
                                  </div>
                                )}
                              </DropdownItem>
                            ) : null}
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
                            <DropdownItem key="edit">
                              <div className="flex items-center gap-2">
                                <Edit className="w-4 h-4" />
                                <span>编辑</span>
                              </div>
                            </DropdownItem>
                            {/* 私有句子或管理员可以删除共享句子 */}
                            {isPrivateSentence(sentence) ||
                            (isAdmin && sentence.isShared) ? (
                              <DropdownItem
                                key="delete"
                                className="text-danger"
                              >
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
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-medium text-foreground flex-1">
                              {sentence.englishText}
                            </h3>
                            {sentence.audioUrl && (
                              <Button
                                isIconOnly
                                className="ml-2"
                                color={
                                  playingAudio === sentence.id
                                    ? "primary"
                                    : "default"
                                }
                                size="sm"
                                variant="light"
                                onClick={() =>
                                  playAudio(sentence.audioUrl!, sentence.id)
                                }
                              >
                                {playingAudio === sentence.id ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                          <p className="text-default-600 text-base">
                            {sentence.chineseText}
                          </p>
                        </div>

                        {sentence.notes && (
                          <div className="bg-default-50 rounded-lg p-3">
                            <p className="text-sm text-default-600">
                              <span className="font-medium">备注：</span>
                              {sentence.notes}
                            </p>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-sm text-default-400">
                          <span>
                            创建时间：{formatDate(sentence.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* 倒计时提示 */}
                      {isRemoving && (
                        <motion.div
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-3 bg-danger-50 dark:bg-danger-900/20 rounded-lg border border-danger-200 dark:border-danger-800"
                          initial={{ opacity: 0, y: -10 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Spinner color="danger" size="sm" />
                              <span className="text-danger-600 dark:text-danger-400 text-sm font-medium">
                                即将取消收藏，{countdown}秒后生效
                              </span>
                            </div>
                            <Button
                              color="danger"
                              size="sm"
                              variant="light"
                              onPress={() => {
                                // 取消移除倒计时
                                const timer = timersRef.current.get(
                                  sentence.id,
                                );

                                if (timer) {
                                  clearInterval(timer);
                                  timersRef.current.delete(sentence.id);
                                }
                                setRemovingItems((prev) => {
                                  const newMap = new Map(prev);

                                  newMap.delete(sentence.id);

                                  return newMap;
                                });
                                // 恢复收藏状态
                                setSentences((prevSentences) =>
                                  prevSentences.map((s) =>
                                    s.id === sentence.id
                                      ? { ...s, isFavorite: true }
                                      : s,
                                  ),
                                );
                                showToast("已取消操作", "success");
                              }}
                            >
                              撤销
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </CardBody>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* 分页 */}
      {sentences.length > 0 && (
        <div className="flex justify-center">
          <Pagination
            showControls
            page={currentPage}
            total={totalPages}
            onChange={handlePageChange}
          />
        </div>
      )}

      {/* 编辑句子Modal */}
      <EditSentenceModal
        isOpen={editModalOpen}
        sentence={sentenceToEdit}
        onClose={() => {
          setEditModalOpen(false);
          setSentenceToEdit(null);
        }}
        onSuccess={() => {
          fetchSentences(
            currentPage,
            selectedCategory,
            selectedDifficulty,
            tab,
          );
        }}
      />

      {/* 删除确认对话框 */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">确认删除</h2>
          </ModalHeader>
          <ModalBody>
            <p>确定要删除这个句子吗？删除后将无法恢复。</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setDeleteConfirmOpen(false)}>
              取消
            </Button>
            <Button color="danger" onPress={confirmDelete}>
              删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
