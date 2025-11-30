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
import { Checkbox } from "@heroui/checkbox";
import { addToast } from "@heroui/toast";
import { useSession } from "next-auth/react";

interface Category {
  id: number;
  name: string;
  description?: string;
  color: string;
  isPreset: boolean;
}

interface AddSentenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (sentenceId?: number) => void;
}

export default function AddSentenceModal({
  isOpen,
  onClose,
  onSuccess,
}: AddSentenceModalProps) {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    englishText: "",
    chineseText: "",
    categoryId: "",
    difficulty: "medium",
    notes: "",
    isShared: false,
  });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

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

  // 获取分类列表
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.englishText || !formData.categoryId) {
      showToast("请填写英文句子与分类", "error");

      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/sentences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();

        showToast("句子添加成功！", "success");
        setFormData({
          englishText: "",
          chineseText: "",
          categoryId: "",
          difficulty: "medium",
          notes: "",
          isShared: false,
        });
        // 传递新创建的句子ID，用于标记正在异步生成音频
        onSuccess(data.sentence?.id);
        onClose();
      } else {
        const error = await response.json();

        showToast(error.error || "添加失败", "error");
      }
    } catch (error) {
      console.error("添加句子失败:", error);
      showToast("添加失败，请重试", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      showToast("请输入分类名称", "error");

      return;
    }

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCategoryName,
          description: "",
          color: "#3b82f6",
        }),
      });

      if (response.ok) {
        const data = await response.json();

        setCategories([...categories, data.category]);
        setFormData({ ...formData, categoryId: data.category.id.toString() });
        setNewCategoryName("");
        setShowNewCategory(false);
        showToast("分类创建成功！", "success");
      } else {
        const error = await response.json();

        showToast(error.error || "创建分类失败", "error");
      }
    } catch (error) {
      console.error("创建分类失败:", error);
      showToast("创建分类失败，请重试", "error");
    }
  };

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="2xl" onClose={onClose}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">添加新句子</h2>
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody className="gap-4">
            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  htmlFor="englishText"
                >
                  英文句子 <span className="text-red-500">*</span>
                </label>
                <Textarea
                  isRequired
                  id="englishText"
                  maxRows={4}
                  minRows={2}
                  value={formData.englishText}
                  onChange={(e) =>
                    setFormData({ ...formData, englishText: e.target.value })
                  }
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  htmlFor="chineseText"
                >
                  中文翻译{" "}
                  <span className="text-default-400 text-xs">(可选)</span>
                </label>
                <Textarea
                  id="chineseText"
                  maxRows={4}
                  minRows={2}
                  value={formData.chineseText}
                  onChange={(e) =>
                    setFormData({ ...formData, chineseText: e.target.value })
                  }
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  htmlFor="categoryId"
                >
                  分类 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <Select
                    isRequired
                    className="flex-1"
                    id="categoryId"
                    placeholder="选择分类"
                    selectedKeys={
                      formData.categoryId
                        ? new Set([formData.categoryId])
                        : new Set()
                    }
                    selectionMode="single"
                    onSelectionChange={(keys) => {
                      const selectedKey = Array.from(keys)[0] as string;

                      setFormData({ ...formData, categoryId: selectedKey });
                    }}
                  >
                    {categories.map((category) => (
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
                          {category.isPreset && (
                            <Chip color="primary" size="sm" variant="flat">
                              预设
                            </Chip>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="bordered"
                    onClick={() => setShowNewCategory(!showNewCategory)}
                  >
                    {showNewCategory ? "取消" : "新建"}
                  </Button>
                </div>

                {showNewCategory && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      className="flex-1"
                      placeholder="输入新分类名称"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <Button
                      color="primary"
                      type="button"
                      onClick={handleCreateCategory}
                    >
                      创建
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  htmlFor="difficulty"
                >
                  难度等级
                </label>
                <Select
                  id="difficulty"
                  placeholder="选择难度"
                  selectedKeys={new Set([formData.difficulty])}
                  selectionMode="single"
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string;

                    setFormData({ ...formData, difficulty: selectedKey });
                  }}
                >
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

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  htmlFor="notes"
                >
                  备注
                </label>
                <Textarea
                  id="notes"
                  maxRows={3}
                  minRows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>

              {/* 只有管理员可以设置共享 */}
              {isAdmin && (
                <div>
                  <Checkbox
                    isSelected={formData.isShared}
                    onValueChange={(checked) =>
                      setFormData({ ...formData, isShared: checked })
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span>设为共享句子</span>
                      <Chip color="primary" size="sm" variant="flat">
                        管理员
                      </Chip>
                    </div>
                  </Checkbox>
                  <p className="text-xs text-default-500 mt-1 ml-6">
                    共享句子将在&ldquo;共享库&rdquo;中对所有用户可见
                  </p>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              取消
            </Button>
            <Button color="primary" isLoading={loading} type="submit">
              添加句子
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
