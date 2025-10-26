"use client";

import { useState, useEffect } from "react";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { Pagination } from "@heroui/pagination";
import { Select, SelectItem } from "@heroui/select";

import SentenceCard from "./sentence-card";

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

interface SentenceListWithAIProps {
  tab: string;
}

export default function SentenceListWithAI({ tab }: SentenceListWithAIProps) {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // 获取句子列表
  const fetchSentences = async (
    page: number = 1,
    categoryId?: string,
    difficulty?: string,
    tabType?: string,
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

  // 处理分页变化
  const handlePageChange = (page: number) => {
    fetchSentences(page, selectedCategory, selectedDifficulty, tab);
  };

  // 处理分类变化
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    fetchSentences(1, categoryId, selectedDifficulty, tab);
  };

  // 处理难度变化
  const handleDifficultyChange = (difficulty: string) => {
    setSelectedDifficulty(difficulty);
    fetchSentences(1, selectedCategory, difficulty, tab);
  };

  // 初始化加载
  useEffect(() => {
    fetchCategories();
    fetchSentences(1, selectedCategory, selectedDifficulty, tab);
  }, [tab]);

  // 当tab变化时重新加载
  useEffect(() => {
    fetchSentences(1, selectedCategory, selectedDifficulty, tab);
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
      <div className="flex gap-4 justify-center">
        <Select
          label="分类筛选"
          placeholder="选择分类"
          selectedKeys={new Set([selectedCategory])}
          onSelectionChange={(keys) => {
            const selectedKey = Array.from(keys)[0] as string;
            handleCategoryChange(selectedKey);
          }}
          className="w-48"
        >
          <SelectItem key="all" textValue="全部分类">
            全部分类
          </SelectItem>
          {Array.isArray(categories) && categories.map((category) => (
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
          )) as any}
        </Select>

        <Select
          label="难度筛选"
          placeholder="选择难度"
          selectedKeys={new Set([selectedDifficulty])}
          onSelectionChange={(keys) => {
            const selectedKey = Array.from(keys)[0] as string;
            handleDifficultyChange(selectedKey);
          }}
          className="w-48"
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
                sentence={sentence}
                onRefresh={() => {
                  fetchSentences(currentPage, selectedCategory, selectedDifficulty, tab);
                }}
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
