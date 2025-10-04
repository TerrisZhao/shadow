'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Textarea } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import { Chip } from '@heroui/chip';
import { Checkbox } from '@heroui/checkbox';
import { addToast } from '@heroui/toast';
import { useSession } from 'next-auth/react';

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
  onSuccess: () => void;
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
    englishText: '',
    chineseText: '',
    categoryId: '',
    difficulty: 'medium',
    notes: '',
    isShared: false,
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  // 检查是否为管理员
  const isAdmin = Boolean(
    session?.user && 
    (session.user as any).role && 
    ['admin', 'owner'].includes((session.user as any).role)
  );

  // 显示toast消息
  const showToast = (message: string, type: 'success' | 'error') => {
    addToast({
      title: message,
      color: type === 'success' ? 'success' : 'danger',
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
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.englishText || !formData.chineseText || !formData.categoryId) {
      showToast('请填写所有必填字段', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/sentences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showToast('句子添加成功！', 'success');
        setFormData({
          englishText: '',
          chineseText: '',
          categoryId: '',
          difficulty: 'medium',
          notes: '',
          isShared: false,
        });
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        showToast(error.error || '添加失败', 'error');
      }
    } catch (error) {
      console.error('添加句子失败:', error);
      showToast('添加失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      showToast('请输入分类名称', 'error');
      return;
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName,
          description: '',
          color: '#3b82f6',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCategories([...categories, data.category]);
        setFormData({ ...formData, categoryId: data.category.id.toString() });
        setNewCategoryName('');
        setShowNewCategory(false);
        showToast('分类创建成功！', 'success');
      } else {
        const error = await response.json();
        showToast(error.error || '创建分类失败', 'error');
      }
    } catch (error) {
      console.error('创建分类失败:', error);
      showToast('创建分类失败，请重试', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">添加新句子</h2>
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody className="gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  英文句子 <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="输入英文句子..."
                  value={formData.englishText}
                  onChange={(e) =>
                    setFormData({ ...formData, englishText: e.target.value })
                  }
                  minRows={2}
                  maxRows={4}
                  isRequired
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  中文翻译 <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="输入中文翻译..."
                  value={formData.chineseText}
                  onChange={(e) =>
                    setFormData({ ...formData, chineseText: e.target.value })
                  }
                  minRows={2}
                  maxRows={4}
                  isRequired
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  分类 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <Select
                    placeholder="选择分类"
                    selectedKeys={formData.categoryId ? new Set([formData.categoryId]) : new Set()}
                    onSelectionChange={(keys) => {
                      const selectedKey = Array.from(keys)[0] as string;
                      setFormData({ ...formData, categoryId: selectedKey });
                    }}
                    className="flex-1"
                    isRequired
                    selectionMode="single"
                  >
                    {categories.map((category) => (
                      <SelectItem key={category.id.toString()} textValue={category.name}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                          {category.isPreset && (
                            <Chip size="sm" color="primary" variant="flat">
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
                    {showNewCategory ? '取消' : '新建'}
                  </Button>
                </div>

                {showNewCategory && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder="输入新分类名称"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      color="primary"
                      onClick={handleCreateCategory}
                    >
                      创建
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">难度等级</label>
                <Select
                  placeholder="选择难度"
                  selectedKeys={new Set([formData.difficulty])}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string;
                    setFormData({ ...formData, difficulty: selectedKey });
                  }}
                  selectionMode="single"
                >
                  <SelectItem key="easy" textValue="简单">
                    <div className="flex items-center gap-2">
                      <Chip size="sm" color="success" variant="flat">
                        简单
                      </Chip>
                    </div>
                  </SelectItem>
                  <SelectItem key="medium" textValue="中等">
                    <div className="flex items-center gap-2">
                      <Chip size="sm" color="warning" variant="flat">
                        中等
                      </Chip>
                    </div>
                  </SelectItem>
                  <SelectItem key="hard" textValue="困难">
                    <div className="flex items-center gap-2">
                      <Chip size="sm" color="danger" variant="flat">
                        困难
                      </Chip>
                    </div>
                  </SelectItem>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">备注</label>
                <Textarea
                  placeholder="添加备注信息（可选）..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  minRows={2}
                  maxRows={3}
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
                      <Chip size="sm" color="primary" variant="flat">
                        管理员
                      </Chip>
                    </div>
                  </Checkbox>
                  <p className="text-xs text-default-500 mt-1 ml-6">
                    共享句子将在"共享库"中对所有用户可见
                  </p>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              取消
            </Button>
              <Button color="primary" type="submit" isLoading={loading}>
                添加句子
              </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
