"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
import { Chip } from "@heroui/chip";
import { ArrowLeft, Calendar, Volume2, Pause } from "lucide-react";

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

const difficultyLabels: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

export default function PracticeHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const ids = searchParams.get("ids");
    if (ids) {
      fetchSentences(ids);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchSentences = async (idsStr: string) => {
    setLoading(true);
    try {
      const ids = idsStr.split(",").map((id) => parseInt(id));
      
      // 逐个获取句子详情
      const sentencePromises = ids.map((id) =>
        fetch(`/api/sentences/${id}`).then((res) => res.json())
      );
      
      const results = await Promise.all(sentencePromises);
      const validSentences = results
        .filter((result) => result.sentence)
        .map((result) => result.sentence);
      
      setSentences(validSentences);
    } catch (error) {
      // 静默处理错误
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // 停止音频播放
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingId(null);
    router.push("/practice");
  };

  const handlePlayAudio = (sentence: Sentence) => {
    if (!sentence.audioUrl) return;

    // 如果正在播放这个音频，则停止
    if (playingId === sentence.id && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingId(null);
      return;
    }

    // 停止之前的音频
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // 创建或重用音频元素
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    audio.src = sentence.audioUrl;

    audio.onplay = () => {
      setPlayingId(sentence.id);
    };

    audio.onended = () => {
      setPlayingId(null);
    };

    audio.onerror = () => {
      setPlayingId(null);
    };

    audio.play().catch(() => {
      setPlayingId(null);
    });
  };

  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">今日练习记录</h1>
          <div className="flex items-center gap-2 text-default-500">
            <Calendar className="w-4 h-4" />
            <span>{today}</span>
            <span>·</span>
            <span>共练习 {sentences.length} 个句子</span>
          </div>
        </div>
        <Button
          variant="flat"
          startContent={<ArrowLeft className="w-4 h-4" />}
          onPress={handleBack}
        >
          继续练习
        </Button>
      </div>

      {/* 句子列表 */}
      {sentences.length === 0 ? (
        <Card className="hover:shadow-md transition-shadow">
          <CardBody className="text-center py-12">
            <p className="text-default-500 text-lg">还没有练习记录</p>
            <Button
              color="primary"
              className="mt-4"
              onPress={handleBack}
            >
              开始练习
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {sentences.map((sentence, index) => (
            <Card key={sentence.id} className="hover:shadow-md transition-shadow">
              <CardBody className="gap-4">
                {/* 序号和标签 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-default-300">
                      #{index + 1}
                    </span>
                    <Chip
                      size="sm"
                      style={{
                        backgroundColor: sentence.category.color + "20",
                        color: sentence.category.color,
                      }}
                    >
                      {sentence.category.name}
                    </Chip>
                    <Chip size="sm" variant="flat">
                      {difficultyLabels[sentence.difficulty] || sentence.difficulty}
                    </Chip>
                  </div>
                </div>

                {/* 句子内容 */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <p className="text-lg font-medium text-default-700">
                        {sentence.chineseText || "无中文翻译"}
                      </p>
                      <p className="text-base text-primary">
                        {sentence.englishText}
                      </p>
                    </div>
                    {/* 音频播放按钮 */}
                    {sentence.audioUrl && (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        color={playingId === sentence.id ? "primary" : "default"}
                        onPress={() => handlePlayAudio(sentence)}
                        className="min-w-unit-8 w-8 h-8 shrink-0"
                      >
                        {playingId === sentence.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
