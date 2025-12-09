"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardBody } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { Pagination } from "@heroui/pagination";
import { Select, SelectItem } from "@heroui/select";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Chip } from "@heroui/chip";

import SentenceCard from "./sentence-card";

interface Category {
  id: number;
  name: string;
  color: string;
}

interface Tag {
  id: number;
  name: string;
  color: string;
  isPreset: boolean;
  referenceCount: number;
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

interface SentenceListWithAIProps {
  tab: string;
  newSentenceId?: number | null;
}

export default function SentenceListWithAI({
  tab,
  newSentenceId,
}: SentenceListWithAIProps) {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]); // 标签列表（top20 或搜索结果）
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>(""); // 选中的标签 ID
  const [tagSearchValue, setTagSearchValue] = useState<string>(""); // 标签搜索输入值
  const [tagsLoading, setTagsLoading] = useState(false); // 标签加载状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  // 跟踪正在异步生成音频的句子ID（新创建的句子）
  const [generatingSentences, setGeneratingSentences] = useState<Set<number>>(
    new Set(),
  );
  // 标记是否是选择操作导致的输入变化（用于避免触发搜索）
  const isTagSelectionRef = useRef(false);

  // 切换收藏状态
  const toggleFavorite = async (
    sentenceId: number,
    currentFavorite: boolean,
  ) => {
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
        // 更新本地状态
        setSentences((prevSentences) =>
          prevSentences.map((sentence) =>
            sentence.id === sentenceId
              ? { ...sentence, isFavorite: !currentFavorite }
              : sentence,
          ),
        );
      } else {
        console.error("收藏状态更新失败");
      }
    } catch (error) {
      console.error("收藏状态更新失败:", error);
    }
  };

  // 获取句子列表
  const fetchSentences = async (
    page: number = 1,
    categoryId?: string,
    difficulty?: string,
    tabType?: string,
    tagId?: string,
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        tab: tabType || tab,
      });

      if (categoryId && categoryId !== "all") {
        params.append("categoryId", categoryId);
      }

      if (difficulty && difficulty !== "all") {
        params.append("difficulty", difficulty);
      }

      if (tagId && tagId !== "") {
        params.append("tagId", tagId);
      }

      const response = await fetch(`/api/sentences?${params}`);

      if (response.ok) {
        const data = await response.json();

        setSentences(data.sentences);
        setTotalPages(data.pagination.totalPages);
        setCurrentPage(page);
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
        // 兼容返回 { categories: Category[] } 或直接返回 Category[]
        const payload = Array.isArray(data) ? { categories: data } : data;

        if (Array.isArray(payload?.categories)) {
          setCategories(payload.categories);
        } else {
          console.error("分类数据格式错误:", data);
          setCategories([]);
        }
      } else {
        console.error("获取分类列表失败:", response.status);
        setCategories([]);
      }
    } catch (error) {
      console.error("获取分类列表失败:", error);
      setCategories([]);
    }
  };

  // 获取标签列表（支持搜索）
  const fetchTags = useCallback(async (search?: string) => {
    setTagsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });

      if (search && search.trim()) {
        params.append("search", search.trim());
      }

      const response = await fetch(`/api/tags?${params}`);

      if (response.ok) {
        const data = await response.json();

        if (Array.isArray(data?.tags)) {
          setTags(data.tags);
        } else {
          console.error("标签数据格式错误:", data);
          setTags([]);
        }
      } else {
        console.error("获取标签列表失败:", response.status);
        setTags([]);
      }
    } catch (error) {
      console.error("获取标签列表失败:", error);
      setTags([]);
    } finally {
      setTagsLoading(false);
    }
  }, []);

  // 处理分页变化
  const handlePageChange = (page: number) => {
    fetchSentences(
      page,
      selectedCategory,
      selectedDifficulty,
      tab,
      selectedTag,
    );
  };

  // 处理分类变化
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    fetchSentences(1, categoryId, selectedDifficulty, tab, selectedTag);
  };

  // 处理难度变化
  const handleDifficultyChange = (difficulty: string) => {
    setSelectedDifficulty(difficulty);
    fetchSentences(1, selectedCategory, difficulty, tab, selectedTag);
  };

  // 处理标签变化
  const handleTagChange = (tagId: string | null) => {
    const newTagId = tagId || "";

    setSelectedTag(newTagId);

    // 标记这是选择操作，避免触发搜索
    isTagSelectionRef.current = true;

    // 同步更新输入框显示的文本
    if (newTagId) {
      const selectedTagItem = tags.find((t) => t.id.toString() === newTagId);

      if (selectedTagItem) {
        setTagSearchValue(selectedTagItem.name);
      }
    } else {
      setTagSearchValue("");
    }

    fetchSentences(1, selectedCategory, selectedDifficulty, tab, newTagId);
  };

  // 标签搜索输入变化时触发搜索（防抖）
  useEffect(() => {
    // 如果是选择操作导致的输入变化，跳过搜索
    if (isTagSelectionRef.current) {
      isTagSelectionRef.current = false;

      return;
    }

    const timer = setTimeout(() => {
      fetchTags(tagSearchValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [tagSearchValue, fetchTags]);

  // 当有新句子创建时，标记为正在生成音频
  useEffect(() => {
    if (newSentenceId) {
      setGeneratingSentences((prev) => new Set(prev).add(newSentenceId));
      // 30秒后自动移除（防止后端生成失败时一直显示生成中）
      const timeout = setTimeout(() => {
        setGeneratingSentences((prev) => {
          const newSet = new Set(prev);

          newSet.delete(newSentenceId);

          return newSet;
        });
      }, 30000);

      return () => clearTimeout(timeout);
    }
  }, [newSentenceId]);

  // 检测句子是否已生成音频，如果有则移除生成中标记
  useEffect(() => {
    generatingSentences.forEach((sentenceId) => {
      const sentence = sentences.find((s) => s.id === sentenceId);

      if (sentence?.audioUrl) {
        setGeneratingSentences((prev) => {
          const newSet = new Set(prev);

          newSet.delete(sentenceId);

          return newSet;
        });
      }
    });
  }, [sentences, generatingSentences]);

  // 初始化加载
  useEffect(() => {
    fetchCategories();
    fetchTags(); // 默认加载 top20 标签
    fetchSentences(1, selectedCategory, selectedDifficulty, tab, selectedTag);
  }, []);

  // 当tab变化时重新加载
  useEffect(() => {
    fetchSentences(1, selectedCategory, selectedDifficulty, tab, selectedTag);
  }, [tab]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 筛选器 */}
      <div className="flex flex-wrap gap-4 justify-center">
        <Select
          className="w-48"
          label="分类筛选"
          placeholder="选择分类"
          selectedKeys={new Set([selectedCategory])}
          onSelectionChange={(keys) => {
            const selectedKey = Array.from(keys)[0] as string;

            handleCategoryChange(selectedKey);
          }}
        >
          <SelectItem key="all" textValue="全部分类">
            全部分类
          </SelectItem>
          {Array.isArray(categories) &&
            (categories.map((category) => (
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
            )) as any)}
        </Select>

        <Select
          className="w-48"
          label="难度筛选"
          placeholder="选择难度"
          selectedKeys={new Set([selectedDifficulty])}
          onSelectionChange={(keys) => {
            const selectedKey = Array.from(keys)[0] as string;

            handleDifficultyChange(selectedKey);
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

        <Autocomplete
          allowsCustomValue={false}
          className="w-48"
          inputValue={tagSearchValue}
          isLoading={tagsLoading}
          items={tags}
          label="标签筛选"
          listboxProps={{
            className: "overscroll-contain",
          }}
          placeholder="搜索或选择标签"
          scrollShadowProps={{
            className: "overscroll-contain",
          }}
          selectedKey={selectedTag || null}
          onInputChange={setTagSearchValue}
          onSelectionChange={(key) => handleTagChange(key as string | null)}
        >
          {(tag) => (
            <AutocompleteItem key={tag.id.toString()} textValue={tag.name}>
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2">
                  <Chip
                    className="text-xs"
                    size="sm"
                    style={{ backgroundColor: tag.color, color: "#fff" }}
                  >
                    {tag.name}
                  </Chip>
                </div>
                <span className="text-xs text-default-400">
                  {tag.referenceCount}
                </span>
              </div>
            </AutocompleteItem>
          )}
        </Autocomplete>
      </div>

      {/* 句子列表 */}
      {sentences.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-default-500">暂无句子</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {sentences.map((sentence) => (
            <div key={sentence.id}>
              <SentenceCard
                generatingAudio={
                  generatingSentences.has(sentence.id) ? sentence.id : null
                }
                sentence={sentence}
                onRefresh={() => {
                  fetchSentences(
                    currentPage,
                    selectedCategory,
                    selectedDifficulty,
                    tab,
                    selectedTag,
                  );
                }}
                onToggleFavorite={toggleFavorite}
              />
            </div>
          ))}
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
    </div>
  );
}
