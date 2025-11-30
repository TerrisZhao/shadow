"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Card, CardBody } from "@heroui/card";
import { Search, Plus, X, ArrowLeft, ArrowRight } from "lucide-react";
import { addToast } from "@heroui/toast";

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

interface AddSceneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSceneModal({
  isOpen,
  onClose,
  onSuccess,
}: AddSceneModalProps) {
  const [step, setStep] = useState(1); // 1: 基本信息, 2: 选择句子
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSentences, setSelectedSentences] = useState<Sentence[]>([]);
  const [searchResults, setSearchResults] = useState<Sentence[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [loadingSentences, setLoadingSentences] = useState(false);

  // 显示toast消息
  const showToast = (message: string, type: "success" | "error") => {
    addToast({
      title: message,
      color: type === "success" ? "success" : "danger",
    });
  };

  // 搜索句子
  const searchSentences = async () => {
    setLoadingSentences(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "50", // 限制搜索结果数量
        tab: "shared", // 默认显示共享句子
      });

      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      if (selectedCategory && selectedCategory !== "all") {
        params.append("categoryId", selectedCategory);
      }

      if (selectedDifficulty && selectedDifficulty !== "all") {
        params.append("difficulty", selectedDifficulty);
      }

      const response = await fetch(`/api/sentences?${params}`);

      if (response.ok) {
        const data = await response.json();
        // 过滤掉已经选中的句子
        const filteredSentences = data.sentences.filter(
          (sentence: Sentence) =>
            !selectedSentences.some((s) => s.id === sentence.id),
        );

        setSearchResults(filteredSentences);
      }
    } catch (error) {
      showToast("搜索句子失败", "error");
    } finally {
      setLoadingSentences(false);
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
      showToast("获取分类列表失败", "error");
    }
  };

  // 添加句子到场景
  const addSentenceToScene = (sentence: Sentence) => {
    setSelectedSentences((prev) => [...prev, sentence]);
    // 从搜索结果中移除已添加的句子
    setSearchResults((prev) => prev.filter((s) => s.id !== sentence.id));
    showToast(`已添加句子：${sentence.englishText}`, "success");
  };

  // 从场景中移除句子
  const removeSentenceFromScene = (sentenceId: number) => {
    setSelectedSentences((prev) => prev.filter((s) => s.id !== sentenceId));
    showToast("已移除句子", "success");
  };

  // 处理提交
  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast("请输入场景标题", "error");

      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/scenes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          sentenceIds: selectedSentences.map((s) => s.id),
        }),
      });

      if (response.ok) {
        showToast("场景创建成功！", "success");
        onSuccess();
        handleClose();
      } else {
        const error = await response.json();

        showToast(error.error || "创建失败", "error");
      }
    } catch (error) {
      showToast("创建失败，请重试", "error");
    } finally {
      setLoading(false);
    }
  };

  // 处理关闭
  const handleClose = () => {
    setStep(1);
    setTitle("");
    setDescription("");
    setSelectedSentences([]);
    setSearchResults([]);
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedDifficulty("all");
    onClose();
  };

  // 下一步
  const handleNext = () => {
    if (!title.trim()) {
      showToast("请输入场景标题", "error");

      return;
    }
    setStep(2);
  };

  // 上一步
  const handlePrev = () => {
    setStep(1);
  };

  // 初始化加载
  useEffect(() => {
    if (isOpen && step === 2) {
      fetchCategories();
    }
  }, [isOpen, step]);

  // 当筛选条件改变时重新搜索句子
  useEffect(() => {
    if (isOpen && step === 2) {
      searchSentences();
    }
  }, [selectedCategory, selectedDifficulty, isOpen, step]);

  return (
    <Modal
      isOpen={isOpen}
      scrollBehavior="inside"
      size="4xl"
      onClose={handleClose}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {step === 1 ? "添加新场景" : "选择句子"}
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${step === 1 ? "bg-primary" : "bg-default-300"}`}
                />
                <span className="text-xs text-default-500">基本信息</span>
              </div>
              <ArrowRight className="w-3 h-3 text-default-400" />
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${step === 2 ? "bg-primary" : "bg-default-300"}`}
                />
                <span className="text-xs text-default-500">选择句子</span>
              </div>
            </div>
          </div>
        </ModalHeader>
        <ModalBody>
          {step === 1 ? (
            // 第一步：基本信息
            <div className="space-y-6">
              <div className="space-y-4">
                <Input
                  isRequired
                  label="场景标题"
                  placeholder="请输入场景标题"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Textarea
                  label="场景描述"
                  minRows={3}
                  placeholder="请输入场景描述（可选）"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          ) : (
            // 第二步：选择句子
            <div className="space-y-6">
              {/* 已选择的句子 */}
              {selectedSentences.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium">
                    已选择的句子 ({selectedSentences.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedSentences.map((sentence, index) => (
                      <Card key={sentence.id} className="p-3">
                        <CardBody className="p-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Chip color="primary" size="sm" variant="flat">
                                  {index + 1}
                                </Chip>
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
                                  color={
                                    sentence.difficulty === "easy"
                                      ? "success"
                                      : sentence.difficulty === "medium"
                                        ? "warning"
                                        : "danger"
                                  }
                                  size="sm"
                                  variant="flat"
                                >
                                  {sentence.difficulty === "easy"
                                    ? "简单"
                                    : sentence.difficulty === "medium"
                                      ? "中等"
                                      : "困难"}
                                </Chip>
                              </div>
                              <p className="text-sm font-medium text-foreground">
                                {sentence.englishText}
                              </p>
                              <p className="text-xs text-default-500 mt-1">
                                {sentence.chineseText}
                              </p>
                            </div>
                            <Button
                              isIconOnly
                              color="danger"
                              size="sm"
                              variant="light"
                              onPress={() =>
                                removeSentenceFromScene(sentence.id)
                              }
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* 搜索和筛选 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">搜索句子</h3>
                <div className="flex gap-4">
                  <Input
                    className="flex-1"
                    placeholder="搜索句子内容..."
                    startContent={
                      <Search className="w-4 h-4 text-default-400" />
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        searchSentences();
                      }
                    }}
                  />
                  <Button
                    color="primary"
                    isLoading={loadingSentences}
                    onPress={searchSentences}
                  >
                    搜索
                  </Button>
                </div>

                <div className="flex gap-4">
                  <Select
                    className="w-48"
                    label="分类筛选"
                    placeholder="选择分类"
                    selectedKeys={new Set([selectedCategory])}
                    onSelectionChange={(keys) => {
                      const selectedKey = Array.from(keys)[0] as string;

                      setSelectedCategory(selectedKey);
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
                    className="w-48"
                    label="难度筛选"
                    placeholder="选择难度"
                    selectedKeys={new Set([selectedDifficulty])}
                    onSelectionChange={(keys) => {
                      const selectedKey = Array.from(keys)[0] as string;

                      setSelectedDifficulty(selectedKey);
                    }}
                  >
                    <SelectItem key="all" textValue="全部难度">
                      全部难度
                    </SelectItem>
                    <SelectItem key="easy" textValue="简单">
                      简单
                    </SelectItem>
                    <SelectItem key="medium" textValue="中等">
                      中等
                    </SelectItem>
                    <SelectItem key="hard" textValue="困难">
                      困难
                    </SelectItem>
                  </Select>
                </div>
              </div>

              {/* 搜索结果 */}
              <div className="space-y-4">
                <h4 className="text-base font-medium">
                  搜索结果 ({searchResults.length})
                </h4>

                {loadingSentences ? (
                  <div className="flex justify-center items-center py-8">
                    <Spinner size="lg" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8 text-default-500">
                    <p>没有找到匹配的句子</p>
                    <p className="text-xs mt-1">尝试调整搜索条件或筛选器</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-2 border border-default-200 rounded-lg p-4">
                    {searchResults.map((sentence) => (
                      <Card
                        key={sentence.id}
                        className="p-3 hover:bg-default-50 transition-colors"
                      >
                        <CardBody className="p-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
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
                                  color={
                                    sentence.difficulty === "easy"
                                      ? "success"
                                      : sentence.difficulty === "medium"
                                        ? "warning"
                                        : "danger"
                                  }
                                  size="sm"
                                  variant="flat"
                                >
                                  {sentence.difficulty === "easy"
                                    ? "简单"
                                    : sentence.difficulty === "medium"
                                      ? "中等"
                                      : "困难"}
                                </Chip>
                              </div>
                              <p className="text-sm font-medium text-foreground">
                                {sentence.englishText}
                              </p>
                              <p className="text-xs text-default-500 mt-1">
                                {sentence.chineseText}
                              </p>
                            </div>
                            <Button
                              isIconOnly
                              color="primary"
                              size="sm"
                              variant="flat"
                              onPress={() => addSentenceToScene(sentence)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            取消
          </Button>
          {step === 1 ? (
            <Button
              color="primary"
              isDisabled={!title.trim()}
              onPress={handleNext}
            >
              下一步
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="light" onPress={handlePrev}>
                <ArrowLeft className="w-4 h-4" />
                上一步
              </Button>
              <Button
                color="primary"
                isDisabled={selectedSentences.length === 0}
                isLoading={loading}
                onPress={handleSubmit}
              >
                创建场景
              </Button>
            </div>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
