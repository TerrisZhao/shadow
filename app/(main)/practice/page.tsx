"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import { Switch } from "@heroui/switch";
import { Divider } from "@heroui/divider";
import { addToast } from "@heroui/toast";
import { motion, AnimatePresence } from "framer-motion";
import { Play, SkipForward, Volume2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";

import VoiceInputButton from "@/components/voice-input-button";

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
  audioUrl: string;
  category: {
    id: number;
    name: string;
    color: string;
  };
}

const difficultyOptions = [
  { value: "all", label: "全部难度" },
  { value: "easy", label: "简单" },
  { value: "medium", label: "中等" },
  { value: "hard", label: "困难" },
];

const difficultyLabels: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

export default function PracticePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showEnglish, setShowEnglish] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentSentence, setCurrentSentence] = useState<Sentence | null>(null);
  const [loading, setLoading] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [practiceHistory, setPracticeHistory] = useState<number[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [hasSpoken, setHasSpoken] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [perfectMatch, setPerfectMatch] = useState(false);
  const similarityRef = useRef<HTMLSpanElement | null>(null);
  const [showEnglishManually, setShowEnglishManually] = useState(false);

  // 加载分类列表
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();

      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      // 静默处理错误
    }
  };

  const fetchRandomSentence = async () => {
    // 停止当前播放的音频
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlayingAudio(false);

    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (selectedDifficulty !== "all") {
        params.append("difficulty", selectedDifficulty);
      }
      if (selectedCategory !== "all") {
        params.append("categoryId", selectedCategory);
      }
      if (practiceHistory.length > 0) {
        params.append("excludeIds", practiceHistory.join(","));
      }

      const response = await fetch(`/api/practice/random?${params}`);

      if (!response.ok) {
        const error = await response.json();

        throw new Error(error.error || "获取句子失败");
      }

      const data = await response.json();

      setCurrentSentence(data.sentence);
      setPracticeHistory([...practiceHistory, data.sentence.id]);
      setUserTranscript("");
      setHasSpoken(false);
      setPerfectMatch(false);
      setShowEnglishManually(false);
    } catch (error: any) {
      addToast({
        title: error.message || "获取句子失败",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (!hasStarted) {
      setHasStarted(true);
      fetchRandomSentence();
    }
  };

  const handleNext = () => {
    fetchRandomSentence();
  };

  const handleTranscript = (text: string, isFinal: boolean) => {
    if (isFinal && text.trim()) {
      setUserTranscript(text.trim());
      setHasSpoken(true); // 只有最终结果才设置为已说话
    } else if (text.trim()) {
      // 临时结果也显示，但不设置hasSpoken
      setUserTranscript(text.trim());
    }
  };

  const handleRecordingStart = () => {
    setUserTranscript("");
    setHasSpoken(false);
    setPerfectMatch(false);
  };

  const handlePlayAudio = () => {
    if (!currentSentence?.audioUrl) {
      return;
    }

    // 如果正在播放，则停止
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingAudio(false);

      return;
    }

    // 创建或重用音频元素
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    audio.src = currentSentence.audioUrl;

    audio.onplay = () => {
      setIsPlayingAudio(true);
    };

    audio.onended = () => {
      setIsPlayingAudio(false);
    };

    audio.onerror = () => {
      setIsPlayingAudio(false);
      addToast({
        title: "音频播放失败",
        color: "danger",
      });
    };

    audio.play().catch(() => {
      addToast({
        title: "音频播放失败",
        color: "danger",
      });
      setIsPlayingAudio(false);
    });
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    // 转换为小写，移除所有标点符号（包括连字符），只保留字母、数字和空格
    const s1 = str1
      .toLowerCase()
      .replace(/-/g, "") // 先移除连字符
      .replace(/[^\w\s]|_/g, "") // 移除其他标点和下划线
      .replace(/\s+/g, " ") // 将多个空格合并为一个
      .trim();
    const s2 = str2
      .toLowerCase()
      .replace(/-/g, "") // 先移除连字符
      .replace(/[^\w\s]|_/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // 完全匹配
    if (s1 === s2) return 100;

    // 分词比较
    const words1 = s1.split(" ").filter((w) => w.length > 0);
    const words2 = s2.split(" ").filter((w) => w.length > 0);

    if (words1.length === 0 || words2.length === 0) return 0;

    let matches = 0;
    const maxLen = Math.max(words1.length, words2.length);

    // 计算匹配的单词数
    words1.forEach((word) => {
      if (words2.includes(word)) {
        matches++;
      }
    });

    return Math.round((matches / maxLen) * 100);
  };

  const similarity =
    currentSentence && userTranscript
      ? calculateSimilarity(currentSentence.englishText, userTranscript)
      : 0;

  // 触发烟花效果
  const triggerConfetti = () => {
    if (!similarityRef.current) return;

    const rect = similarityRef.current.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    // 第一波烟花
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x, y },
      colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
    });

    // 延迟第二波
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: x - 0.1, y },
        colors: ['#10b981', '#3b82f6', '#f59e0b'],
      });
    }, 150);

    // 延迟第三波
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: x + 0.1, y },
        colors: ['#ef4444', '#8b5cf6', '#f59e0b'],
      });
    }, 300);
  };

  // 当匹配度达到100时，触发完美匹配效果
  useEffect(() => {
    if (similarity === 100) {
      setPerfectMatch(true);
      // 触发烟花效果
      triggerConfetti();
      // 1.5秒后重置动画状态，以便下次可以再次触发
      const timer = setTimeout(() => {
        setPerfectMatch(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [similarity]);

  const getSimilarityColor = (score: number) => {
    if (score === 100) return "secondary"; // 紫色
    if (score >= 80) return "success";
    if (score >= 60) return "warning";

    return "danger";
  };

  const handleEndPractice = () => {
    // 停止音频播放
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlayingAudio(false);

    // 保存练习历史到 localStorage
    if (practiceHistory.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const storageKey = `practice_history_${today}`;

      localStorage.setItem(storageKey, JSON.stringify(practiceHistory));
    }

    // 跳转到练习历史页面
    if (practiceHistory.length > 0) {
      router.push(`/practice/history?ids=${practiceHistory.join(",")}`);
    } else {
      router.push("/sentence");
    }
  };

  // 配置界面
  if (!hasStarted) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* 内容区域 */}
        <div className="flex-1 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">练习模式</h1>
              <p className="text-default-500">
                选择练习条件，开始你的英语口语练习之旅
              </p>
            </div>

            <Divider className="mb-8" />

            <div className="space-y-6">
              <Select
                label="选择难度"
                placeholder="请选择难度"
                selectedKeys={[selectedDifficulty]}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                {difficultyOptions.map((option) => (
                  <SelectItem key={option.value}>{option.label}</SelectItem>
                ))}
              </Select>

              <Select
                label="选择分类"
                placeholder="请选择分类"
                selectedKeys={[selectedCategory]}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <Fragment>
                  <SelectItem key="all">全部分类</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </Fragment>
              </Select>

              <div className="flex items-center justify-between p-4 bg-default-100 rounded-lg">
                <div>
                  <p className="font-medium">显示英文原句</p>
                  <p className="text-sm text-default-500">
                    开启后会在开始时显示英文，关闭则只显示中文
                  </p>
                </div>
                <Switch
                  isSelected={showEnglish}
                  onValueChange={setShowEnglish}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮固定区域 */}
        <div className="bg-background">
          <div className="max-w-2xl mx-auto py-4 flex justify-center">
            <Button
              className="font-semibold"
              color="primary"
              size="lg"
              startContent={<Play className="w-5 h-5" />}
              onPress={handleStart}
            >
              开始练习
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 练习界面
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AnimatePresence mode="wait">
        {currentSentence && (
          <motion.div
            key={currentSentence.id}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full"
          >
            {/* 内容区域 */}
            <div className="flex-1 flex flex-col overflow-y-auto py-6">
              {/* 顶部信息 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: currentSentence.category.color + "20",
                      color: currentSentence.category.color,
                    }}
                  >
                    {currentSentence.category.name}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-default-100">
                    {difficultyLabels[currentSentence.difficulty] ||
                      currentSentence.difficulty}
                  </span>
                </div>
                <div className="text-sm text-default-500">
                  已练习: {practiceHistory.length} 句
                </div>
              </div>

              <Divider className="mb-6" />

              {/* 中文句子 - 固定在顶部 */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3">
                  <p className="text-2xl font-medium text-default-700">
                    {currentSentence.chineseText || "无中文翻译"}
                  </p>
                  <div className="flex items-center gap-2">
                    {currentSentence.audioUrl && (
                      <Button
                        isIconOnly
                        className="min-w-unit-8 w-8 h-8"
                        color={isPlayingAudio ? "primary" : "default"}
                        size="sm"
                        variant="flat"
                        onPress={handlePlayAudio}
                      >
                        <Volume2
                          className={`w-4 h-4 ${isPlayingAudio ? "animate-pulse" : ""}`}
                        />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="flat"
                      color={showEnglishManually ? "primary" : "default"}
                      onPress={() => setShowEnglishManually(!showEnglishManually)}
                    >
                      {showEnglishManually ? "隐藏英文" : "显示英文"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* 其他内容区域 - 垂直居中 */}
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-4xl space-y-6">
                  {/* 英文句子 - 根据设置显示或在录音结束后显示或手动切换显示 */}
                  {(showEnglish || hasSpoken || showEnglishManually) && (
                    <motion.div
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-center"
                      initial={{ opacity: 0, height: 0 }}
                    >
                      <p className="text-xl text-primary font-medium">
                        {currentSentence.englishText}
                      </p>
                    </motion.div>
                  )}

                  {/* 用户语音识别结果 */}
                  {userTranscript && (
                    <motion.div
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                      initial={{ opacity: 0, y: 10 }}
                    >
                      <Divider />
                      <div className="bg-default-50 p-4 rounded-lg text-center">
                        <p className="text-sm text-default-500 mb-1">
                          你的发音：
                        </p>
                        <p className="text-lg font-medium">{userTranscript}</p>
                      </div>

                      {/* 相似度显示 */}
                      <div className="flex items-center justify-center gap-3">
                        <motion.span
                          ref={similarityRef}
                          animate={
                            perfectMatch
                              ? { scale: [1, 1.2, 1], y: [0, -5, 0] }
                              : {}
                          }
                          transition={{ duration: 0.6 }}
                          className={`text-2xl font-bold text-${getSimilarityColor(similarity)}`}
                        >
                          {similarity}%
                        </motion.span>
                        {similarity >= 80 && (
                          <motion.span
                            animate={
                              perfectMatch
                                ? { rotate: [0, 15, -15, 0], scale: [1, 1.3, 1] }
                                : {}
                            }
                            transition={{ duration: 0.6 }}
                            className="text-2xl"
                          >
                            🎉
                          </motion.span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* 底部按钮固定区域 */}
            <div className="border-t border-divider bg-background">
              <div className="py-4">
                <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
                  {/* 左侧：结束练习 */}
                  <Button
                    className="text-default-400"
                    size="sm"
                    startContent={<X className="w-4 h-4" />}
                    variant="light"
                    onPress={handleEndPractice}
                  >
                    结束练习
                  </Button>

                  {/* 中间：录音按钮 */}
                  <VoiceInputButton
                    language="en-US"
                    onRecordingStart={handleRecordingStart}
                    onTranscript={handleTranscript}
                  />

                  {/* 右侧：下一题 */}
                  <Button
                    color="primary"
                    isLoading={loading}
                    size="lg"
                    onPress={handleNext}
                  >
                    下一题
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
