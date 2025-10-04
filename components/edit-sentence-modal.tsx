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
import { Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Chip } from "@heroui/chip";
import { Checkbox } from "@heroui/checkbox";
import { addToast } from "@heroui/toast";
import { useSession } from "next-auth/react";

interface CategoryOption {
  id: number;
  name: string;
  description?: string;
  color: string;
  isPreset: boolean;
}

interface CategoryInfo {
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
  category: CategoryInfo;
}

interface EditSentenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sentence: Sentence | null;
}

export default function EditSentenceModal({
  isOpen,
  onClose,
  onSuccess,
  sentence,
}: EditSentenceModalProps) {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    englishText: "",
    chineseText: "",
    categoryId: "",
    difficulty: "medium",
    notes: "",
    isShared: false,
  });

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

  // 当sentence变化时，更新formData
  useEffect(() => {
    if (sentence) {
      setFormData({
        englishText: sentence.englishText,
        chineseText: sentence.chineseText,
        categoryId: sentence.category.id.toString(),
        difficulty: sentence.difficulty,
        notes: sentence.notes || "",
        isShared: sentence.isShared || false,
      });
    }
  }, [sentence]);

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

    if (
      !formData.englishText ||
      !formData.chineseText ||
      !formData.categoryId
    ) {
      showToast("请填写所有必填字段", "error");

      return;
    }

    if (!sentence) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/sentences/${sentence.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showToast("句子更新成功！", "success");
        onSuccess();
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        const error = await response.json();

        showToast(error.error || "更新失败", "error");
      }
    } catch (error) {
      console.error("更新句子失败:", error);
      showToast("更新失败，请重试", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="2xl" onClose={onClose}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">编辑句子</h2>
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody className="gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="edit-englishText">
                  英文句子 <span className="text-red-500">*</span>
                </label>
                <Textarea
                  id="edit-englishText"
                  isRequired
                  minRows={2}
                  placeholder="输入英文句子"
                  value={formData.englishText}
                  onChange={(e) =>
                    setFormData({ ...formData, englishText: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="edit-chineseText">
                  中文翻译 <span className="text-red-500">*</span>
                </label>
                <Textarea
                  id="edit-chineseText"
                  isRequired
                  minRows={2}
                  placeholder="输入中文翻译"
                  value={formData.chineseText}
                  onChange={(e) =>
                    setFormData({ ...formData, chineseText: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="edit-categoryId">
                  分类 <span className="text-red-500">*</span>
                </label>
                <Select
                  id="edit-categoryId"
                  isRequired
                  className="flex-1"
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
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="edit-difficulty">
                  难度等级
                </label>
                <Select
                  id="edit-difficulty"
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
                <label className="block text-sm font-medium mb-2" htmlFor="edit-notes">备注</label>
                <Textarea
                  id="edit-notes"
                  minRows={2}
                  placeholder="输入备注（可选）"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>

              {/* 只有管理员可以修改共享状态 */}
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
              保存修改
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
