"use client";

import { useState, useRef } from "react";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import { Spinner } from "@heroui/spinner";
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
  Mic,
  ChevronDown,
  ChevronUp,
  Bot,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

import EditSentenceModal from "./edit-sentence-modal";
import AIAssistant from "./ai-assistant";

interface Category {
  id: number;
  name: string;
  color: string;
}

interface Recording {
  id: number;
  audioUrl: string;
  duration: string;
  fileSize: string;
  createdAt: string;
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

interface SentenceCardProps {
  sentence: Sentence;
  onRefresh?: () => void;
  showActions?: boolean;
  onDelete?: (sentenceId: number) => void;
  onToggleFavorite?: (sentenceId: number, currentFavorite: boolean) => void;
  onEdit?: (sentence: Sentence) => void;
  onGenerateAudio?: (sentenceId: number, text: string) => void;
  onToggleRecording?: (sentenceId: number) => void;
  onUploadRecording?: (sentenceId: number, audioBlob: Blob, duration: number) => void;
  onDeleteRecording?: (recordingId: number, sentenceId: number) => void;
  currentIsAdmin?: boolean;
  currentIsPrivateSentence?: (sentence: Sentence) => boolean;
  playingAudio?: number | null;
  audioProgress?: number;
  audioDuration?: number;
  generatingAudio?: number | null;
  preparingRecording?: number | null;
  recordingState?: Map<number, boolean>;
  uploadingRecording?: number | null;
  recordingDuration?: number;
  sentenceNumber?: number;
  sentenceRecordings?: any[];
  expandedRecordings?: Record<number, boolean>;
  playingRecording?: number | null;
  deletingRecording?: number | null;
  removingItems?: Map<number, number>;
  countdown?: number;
  onCancelRemoval?: (sentenceId: number) => void;
}

export default function SentenceCard({
  sentence,
  onRefresh,
  showActions = true,
  onDelete,
  onToggleFavorite,
  onEdit,
  onGenerateAudio,
  onToggleRecording,
  onUploadRecording,
  onDeleteRecording,
  currentIsAdmin: propIsAdmin = false,
  currentIsPrivateSentence: propIsPrivateSentence,
  playingAudio: propPlayingAudio = null,
  audioProgress: propAudioProgress = 0,
  audioDuration: propAudioDuration = 0,
  generatingAudio: propGeneratingAudio = null,
  preparingRecording: propPreparingRecording = null,
  recordingState: propRecordingState = new Map(),
  uploadingRecording: propUploadingRecording = null,
  recordingDuration: propRecordingDuration = 0,
  sentenceNumber,
  sentenceRecordings: propSentenceRecordings = [],
  expandedRecordings: propExpandedRecordings = {},
  playingRecording: propPlayingRecording = null,
  deletingRecording: propDeletingRecording = null,
  removingItems = new Map(),
  countdown,
  onCancelRemoval,
}: SentenceCardProps) {
  const { data: session } = useSession();
  const [playingAudio, setPlayingAudio] = useState<number | null>(propPlayingAudio);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState<number | null>(propGeneratingAudio);
  const [audioProgress, setAudioProgress] = useState<Map<number, number>>(
    new Map(),
  );
  const [audioDuration, setAudioDuration] = useState<Map<number, number>>(
    new Map(),
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [recordingState, setRecordingState] = useState<Map<number, boolean>>(
    propRecordingState,
  );
  const [preparingRecording, setPreparingRecording] = useState<number | null>(
    propPreparingRecording,
  );
  const [uploadingRecording, setUploadingRecording] = useState<number | null>(
    propUploadingRecording,
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const [recordingDuration, setRecordingDuration] = useState<Map<number, number>>(
    new Map(),
  );
  const recordingTimerRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const audioProgressAnimationRef = useRef<number | null>(null);
  const [sentenceRecordings, setSentenceRecordings] = useState<
    Map<number, Recording[]>
  >(new Map(propSentenceRecordings.map((recording, index) => [index, recording])));
  const [expandedRecordings, setExpandedRecordings] = useState<Set<number>>(
    new Set(Object.keys(propExpandedRecordings).map(Number)),
  );
  const [playingRecording, setPlayingRecording] = useState<number | null>(propPlayingRecording);
  const [recordingAudioElement, setRecordingAudioElement] =
    useState<HTMLAudioElement | null>(null);
  const [deletingRecording, setDeletingRecording] = useState<number | null>(
    propDeletingRecording,
  );
  const [deleteRecordingConfirmOpen, setDeleteRecordingConfirmOpen] =
    useState(false);
  const [recordingToDelete, setRecordingToDelete] = useState<{
    recordingId: number;
    sentenceId: number;
  } | null>(null);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  
  // 检查是否正在移除
  const isRemoving = removingItems.has(sentence.id);

  // 使用传入的 isAdmin 或根据 session 计算
  const currentIsAdmin = propIsAdmin || Boolean(
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
  const currentIsPrivateSentence = propIsPrivateSentence || ((sentence: Sentence) => {
    if (session?.user && (session.user as any).id) {
      const currentUserId = parseInt((session.user as any).id);
      return !sentence.isShared && sentence.userId === currentUserId;
    }
    return false;
  });

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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 播放音频
  const playAudio = async (audioUrl: string, sentenceId: number, startTime?: number) => {
    try {
      if (audioProgressAnimationRef.current) {
        cancelAnimationFrame(audioProgressAnimationRef.current);
        audioProgressAnimationRef.current = null;
      }

      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
      }

      if (playingAudio === sentenceId) {
        setPlayingAudio(null);
        audioElementRef.current = null;
        return;
      }

      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      setPlayingAudio(sentenceId);

      audio.onloadedmetadata = () => {
        setAudioDuration((prev) => {
          const newMap = new Map(prev);
          newMap.set(sentenceId, audio.duration);
          return newMap;
        });
      };

      audio.onpause = () => {
        if (audioProgressAnimationRef.current) {
          cancelAnimationFrame(audioProgressAnimationRef.current);
          audioProgressAnimationRef.current = null;
        }
      };

      if (audio.readyState < 1) {
        await new Promise((resolve) => {
          audio.addEventListener('loadedmetadata', resolve, { once: true });
        });
      }

      if (audio.duration && !isNaN(audio.duration)) {
        setAudioDuration((prev) => {
          const newMap = new Map(prev);
          newMap.set(sentenceId, audio.duration);
          return newMap;
        });
      }

      if (startTime !== undefined && startTime > 0) {
        audio.currentTime = startTime;
        setAudioProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(sentenceId, startTime);
          return newMap;
        });
      }

      await audio.play();

      const updateProgress = () => {
        if (!audio.paused && !audio.ended) {
          setAudioProgress((prev) => {
            const newMap = new Map(prev);
            newMap.set(sentenceId, audio.currentTime);
            return newMap;
          });
          audioProgressAnimationRef.current = requestAnimationFrame(updateProgress);
        }
      };

      updateProgress();

      audio.onended = () => {
        if (audioProgressAnimationRef.current) {
          cancelAnimationFrame(audioProgressAnimationRef.current);
          audioProgressAnimationRef.current = null;
        }
        setPlayingAudio(null);
        audioElementRef.current = null;
        setAudioProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(sentenceId, 0);
          return newMap;
        });
      };

      audio.onerror = () => {
        if (audioProgressAnimationRef.current) {
          cancelAnimationFrame(audioProgressAnimationRef.current);
          audioProgressAnimationRef.current = null;
        }
        setPlayingAudio(null);
        audioElementRef.current = null;
      };
    } catch (error) {
      if (audioProgressAnimationRef.current) {
        cancelAnimationFrame(audioProgressAnimationRef.current);
        audioProgressAnimationRef.current = null;
      }
      setPlayingAudio(null);
      audioElementRef.current = null;
    }
  };

  // 更改音频播放进度
  const handleAudioSeek = async (sentenceId: number, value: number | number[]) => {
    const newTime = Array.isArray(value) ? value[0] : value;

    if (audioElementRef.current && playingAudio === sentenceId) {
      audioElementRef.current.currentTime = newTime;
      setAudioProgress((prev) => {
        const newMap = new Map(prev);
        newMap.set(sentenceId, newTime);
        return newMap;
      });
    } else {
      if (sentence?.audioUrl) {
        await playAudio(sentence.audioUrl, sentenceId, newTime);
      }
    }
  };

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // 打开编辑modal
  const openEditModal = (sentence: Sentence) => {
    if (onEdit) {
      onEdit(sentence);
    } else {
      setEditModalOpen(true);
    }
  };

  // 打开删除确认对话框
  const openDeleteConfirm = (sentenceId: number) => {
    setDeleteConfirmOpen(true);
  };

  // 确认删除句子
  const confirmDelete = async () => {
    if (onDelete) {
      onDelete(sentence.id);
    }
    setDeleteConfirmOpen(false);
  };

  // 切换收藏状态
  const toggleFavorite = async (
    sentenceId: number,
    currentFavorite: boolean,
  ) => {
    if (onToggleFavorite) {
      onToggleFavorite(sentenceId, currentFavorite);
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
            showToast("音频生成成功！", "success");
            if (onRefresh) {
              onRefresh();
            }
          } else {
            showToast("音频生成成功，但保存失败", "error");
          }
        } catch (updateError) {
          showToast("音频生成成功，但保存失败", "error");
        }
      } else {
        showToast("音频生成失败，请重试", "error");
      }
    } catch (error) {
      showToast("音频生成失败，请重试", "error");
    } finally {
      setGeneratingAudio(null);
    }
  };

  // 检查浏览器是否支持录音
  const checkRecordingSupport = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        supported: false,
        message: "您的浏览器不支持录音功能，请使用现代浏览器（Chrome、Firefox、Safari等）",
      };
    }

    if (
      window.location.protocol !== "https:" &&
      !window.location.hostname.match(/^(localhost|127\.0\.0\.1|::1)$/)
    ) {
      return {
        supported: false,
        message: "录音功能需要 HTTPS 连接或在 localhost 环境下使用",
      };
    }

    return { supported: true, message: "" };
  };

  // 开始录音
  const startRecording = async (sentenceId: number) => {
    if (preparingRecording !== null && preparingRecording !== sentenceId) {
      showToast("请等待当前录音完成", "error");
      return;
    }

    const { supported, message } = checkRecordingSupport();

    if (!supported) {
      showToast(message, "error");
      return;
    }

    try {
      setPreparingRecording(sentenceId);

      let stream: MediaStream;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          } 
        });
      } catch (constraintError) {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true
        });
      }

      let mimeType = "";
      
      if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setPreparingRecording(null);
        recordingStartTimeRef.current = Date.now();
        setRecordingState((prev) => new Map(prev).set(sentenceId, true));
        setRecordingDuration((prev) => new Map(prev).set(sentenceId, 0));

        const timer = setInterval(() => {
          setRecordingDuration((prev) => {
            const newMap = new Map(prev);
            const currentDuration = newMap.get(sentenceId) || 0;
            newMap.set(sentenceId, currentDuration + 1);
            return newMap;
          });
        }, 1000);

        recordingTimerRef.current.set(sentenceId, timer);
        showToast("开始录音，请说话...", "success");
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/mp4",
        });
        const duration = Math.floor(
          (Date.now() - recordingStartTimeRef.current) / 1000,
        );

        stream.getTracks().forEach((track) => track.stop());

        const timer = recordingTimerRef.current.get(sentenceId);
        if (timer) {
          clearInterval(timer);
          recordingTimerRef.current.delete(sentenceId);
        }
        setRecordingDuration((prev) => {
          const newMap = new Map(prev);
          newMap.delete(sentenceId);
          return newMap;
        });

        await uploadRecording(sentenceId, audioBlob, duration);
      };

      mediaRecorder.onerror = (event: any) => {
        setPreparingRecording(null);
        showToast("录音过程中出现错误", "error");
        stopRecording(sentenceId);
      };

      mediaRecorder.start();
    } catch (error: any) {
      setPreparingRecording(null);
      
      let errorMessage = "无法访问麦克风";

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage = "麦克风权限被拒绝，请在浏览器设置中允许访问麦克风";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        errorMessage = "未找到麦克风设备，请检查是否连接了麦克风";
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        errorMessage = "麦克风正被其他应用占用，请关闭其他使用麦克风的程序";
      } else if (error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError") {
        errorMessage = "麦克风不支持请求的音频设置";
      } else if (error.name === "TypeError") {
        errorMessage = "浏览器不支持录音功能或需要在 HTTPS 环境下使用";
      } else if (error.name === "SecurityError") {
        errorMessage = "安全限制：录音功能需要在 HTTPS 或 localhost 环境下使用";
      }

      showToast(errorMessage, "error");
    }
  };

  // 停止录音
  const stopRecording = (sentenceId: number) => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecordingState((prev) => {
        const newMap = new Map(prev);
        newMap.delete(sentenceId);
        return newMap;
      });
    }
  };

  // 格式化录音时长
  const formatRecordingDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // 上传录音
  const uploadRecording = async (
    sentenceId: number,
    audioBlob: Blob,
    duration: number,
  ) => {
    setUploadingRecording(sentenceId);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("sentenceId", sentenceId.toString());
      formData.append("duration", duration.toString());

      const response = await fetch("/api/recordings", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        showToast(
          `录音上传成功！时长：${result.recording.duration}秒`,
          "success",
        );

        if (onRefresh) {
          onRefresh();
        }

        await fetchRecordings(sentenceId);

        if (!expandedRecordings.has(sentenceId)) {
          setExpandedRecordings((prev) => new Set(prev).add(sentenceId));
        }
      } else {
        const error = await response.json();
        showToast(error.error || "录音上传失败", "error");
      }
    } catch (error) {
      showToast("录音上传失败，请重试", "error");
    } finally {
      setUploadingRecording(null);
    }
  };

  // 切换录音状态
  const toggleRecording = (sentenceId: number) => {
    const isRecording = recordingState.get(sentenceId);

    if (isRecording) {
      stopRecording(sentenceId);
    } else {
      if (preparingRecording !== null && preparingRecording !== sentenceId) {
        showToast("请等待当前录音完成", "error");
        return;
      }

      recordingState.forEach((isRecording, id) => {
        if (isRecording && id !== sentenceId) {
          stopRecording(id);
        }
      });
      
      startRecording(sentenceId);
    }
  };

  // 获取句子的录音列表
  const fetchRecordings = async (sentenceId: number) => {
    try {
      const response = await fetch(
        `/api/recordings?sentenceId=${sentenceId}`,
      );

      if (response.ok) {
        const data = await response.json();
        setSentenceRecordings((prev) =>
          new Map(prev).set(sentenceId, data.recordings),
        );
      }
    } catch (error) {
      // 静默处理错误
    }
  };

  // 切换录音列表展开/收起
  const toggleRecordingsExpanded = async (sentenceId: number) => {
    const isExpanded = expandedRecordings.has(sentenceId);

    if (isExpanded) {
      setExpandedRecordings((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sentenceId);
        return newSet;
      });
    } else {
      setExpandedRecordings((prev) => new Set(prev).add(sentenceId));
      if (!sentenceRecordings.has(sentenceId)) {
        await fetchRecordings(sentenceId);
      }
    }
  };

  // 播放录音
  const playRecording = async (recordingUrl: string, recordingId: number) => {
    try {
      if (recordingAudioElement) {
        recordingAudioElement.pause();
        recordingAudioElement.currentTime = 0;
      }

      if (playingRecording === recordingId) {
        setPlayingRecording(null);
        setRecordingAudioElement(null);
        return;
      }

      const audio = new Audio(recordingUrl);
      setRecordingAudioElement(audio);
      setPlayingRecording(recordingId);

      await audio.play();

      audio.onended = () => {
        setPlayingRecording(null);
        setRecordingAudioElement(null);
      };

      audio.onerror = () => {
        setPlayingRecording(null);
        setRecordingAudioElement(null);
        showToast("录音播放失败", "error");
      };
    } catch (error) {
      setPlayingRecording(null);
      setRecordingAudioElement(null);
      showToast("播放录音失败", "error");
    }
  };

  // 打开删除录音确认对话框
  const openDeleteRecordingConfirm = (
    recordingId: number,
    sentenceId: number,
  ) => {
    setRecordingToDelete({ recordingId, sentenceId });
    setDeleteRecordingConfirmOpen(true);
  };

  // 确认删除录音
  const confirmDeleteRecording = async () => {
    if (!recordingToDelete) return;

    const { recordingId, sentenceId } = recordingToDelete;

    setDeletingRecording(recordingId);
    try {
      const response = await fetch(`/api/recordings/${recordingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSentenceRecordings((prev) => {
          const newMap = new Map(prev);
          const recordings = newMap.get(sentenceId) || [];
          newMap.set(
            sentenceId,
            recordings.filter((r) => r.id !== recordingId),
          );
          return newMap;
        });
        showToast("录音删除成功", "success");
      } else {
        const error = await response.json();
        showToast(error.error || "删除失败", "error");
      }
    } catch (error) {
      showToast("删除失败，请重试", "error");
    } finally {
      setDeletingRecording(null);
      setDeleteRecordingConfirmOpen(false);
      setRecordingToDelete(null);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div
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
          <div className="flex items-start gap-3 mb-4">
            {/* 句子序号 */}
            {sentenceNumber !== undefined && (
              <div className="h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 px-2">
                {sentenceNumber}
              </div>
            )}
            <div className="flex-1">
              <div className="flex justify-between items-start">
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
            {showActions && (
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
                    } else if (key === "ai") {
                      setAiAssistantOpen(true);
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
                  {currentIsPrivateSentence(sentence) ||
                  (currentIsAdmin && sentence.isShared) ? (
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
                  {currentIsPrivateSentence(sentence) ||
                  (currentIsAdmin && sentence.isShared) ? (
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
            )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-medium text-foreground flex-1">
                  {sentence.englishText}
                </h3>
                <div className="flex items-center gap-2 ml-2">
                  {sentence.audioUrl && (
                    <Button
                      isIconOnly
                      color={
                        playingAudio === sentence.id
                          ? "primary"
                          : "default"
                      }
                      size="md"
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
                  <Button
                    isIconOnly
                    color={
                      recordingState.get(sentence.id)
                        ? "danger"
                        : preparingRecording === sentence.id
                          ? "warning"
                          : undefined
                    }
                    isDisabled={
                      uploadingRecording === sentence.id ||
                      preparingRecording === sentence.id
                    }
                    isLoading={uploadingRecording === sentence.id}
                    size="md"
                    variant="light"
                    onClick={() => toggleRecording(sentence.id)}
                  >
                    {recordingState.get(sentence.id) ||
                    preparingRecording === sentence.id ? (
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <Mic className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-default-600 text-base">
                {sentence.chineseText || "(暂无中文翻译)"}
              </p>

              {/* 音频进度条 */}
              {sentence.audioUrl &&
                audioDuration.get(sentence.id) !== undefined && (
                  <div className="mt-3 space-y-2 px-1">
                    <div
                      aria-label="音频播放进度条"
                      aria-valuemax={audioDuration.get(sentence.id) || 0}
                      aria-valuemin={0}
                      aria-valuenow={audioProgress.get(sentence.id) || 0}
                      aria-valuetext={`${formatTime(audioProgress.get(sentence.id) || 0)} / ${formatTime(audioDuration.get(sentence.id) || 0)}`}
                      className="relative w-full h-1.5 bg-default-200 rounded-full cursor-pointer group"
                      role="slider"
                      tabIndex={0}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const offsetX = e.clientX - rect.left;
                        const percentage = offsetX / rect.width;
                        const newTime =
                          percentage *
                          (audioDuration.get(sentence.id) || 0);
                        handleAudioSeek(sentence.id, newTime);
                      }}
                      onKeyDown={(e) => {
                        const duration = audioDuration.get(sentence.id) || 0;
                        const current = audioProgress.get(sentence.id) || 0;
                        const step = 0.5;
                        
                        if (e.key === 'ArrowRight') {
                          e.preventDefault();
                          handleAudioSeek(sentence.id, Math.min(current + step, duration));
                        } else if (e.key === 'ArrowLeft') {
                          e.preventDefault();
                          handleAudioSeek(sentence.id, Math.max(current - step, 0));
                        }
                      }}
                    >
                      <div
                        className="absolute top-0 left-0 h-full bg-primary rounded-full pointer-events-none"
                        style={{
                          width: `${((audioProgress.get(sentence.id) || 0) / (audioDuration.get(sentence.id) || 1)) * 100}%`,
                        }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full shadow-md 
                                   transition-[width,height] duration-150 group-hover:w-4 group-hover:h-4 pointer-events-none z-10"
                        style={{
                          left: `calc(${((audioProgress.get(sentence.id) || 0) / (audioDuration.get(sentence.id) || 1)) * 100}% - 7px)`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-default-500 px-1">
                      <span className="font-medium">
                        {formatTime(
                          audioProgress.get(sentence.id) || 0,
                        )}
                      </span>
                      <span>
                        {formatTime(
                          audioDuration.get(sentence.id) || 0,
                        )}
                      </span>
                    </div>
                  </div>
                )}
            </div>

            {sentence.notes && (
              <div className="bg-default-50 rounded-lg p-3">
                <p className="text-sm text-default-600">
                  <span className="font-medium">备注：</span>
                  {sentence.notes}
                </p>
              </div>
            )}

            {/* 准备录音的提示 */}
            {preparingRecording === sentence.id && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="bg-warning-50 dark:bg-warning-900/20 rounded-lg p-3 border border-warning-200 dark:border-warning-800"
                initial={{ opacity: 0, y: -10 }}
              >
                <div className="flex items-center gap-2">
                  <Spinner color="warning" size="sm" />
                  <span className="text-warning-700 dark:text-warning-400 text-sm font-medium">
                    准备录音中，请稍候...
                  </span>
                </div>
              </motion.div>
            )}

            {/* 录音中的提示 */}
            {recordingState.get(sentence.id) && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="bg-danger-50 dark:bg-danger-900/20 rounded-lg p-3 border border-danger-200 dark:border-danger-800"
                initial={{ opacity: 0, y: -10 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.7, 1],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                      }}
                    >
                      <div className="w-3 h-3 rounded-full bg-danger-500" />
                    </motion.div>
                    <div className="flex flex-col">
                      <span className="text-danger-700 dark:text-danger-400 text-sm font-medium">
                        正在录音...
                      </span>
                      <span className="text-danger-600 dark:text-danger-500 text-xs">
                        时长：
                        {formatRecordingDuration(
                          recordingDuration.get(sentence.id) || 0,
                        )}
                      </span>
                    </div>
                  </div>
                  <Button
                    color="danger"
                    size="md"
                    variant="flat"
                    onPress={() => stopRecording(sentence.id)}
                  >
                    停止录音
                  </Button>
                </div>
              </motion.div>
            )}

            {/* 上传中的提示 */}
            {uploadingRecording === sentence.id && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-3 border border-primary-200 dark:border-primary-800"
                initial={{ opacity: 0, y: -10 }}
              >
                <div className="flex items-center gap-2">
                  <Spinner color="primary" size="sm" />
                  <span className="text-primary-700 dark:text-primary-400 text-sm font-medium">
                    正在上传录音...
                  </span>
                </div>
              </motion.div>
            )}

            <div className="flex justify-between items-center text-sm text-default-400">
              <span>
                创建时间：{formatDate(sentence.createdAt)}
              </span>
              <Button
                size="sm"
                variant="light"
                onPress={() => toggleRecordingsExpanded(sentence.id)}
              >
                <div className="flex items-center gap-1">
                  <Volume2 className="w-4 h-4" />
                  <span>
                    我的录音
                    {sentence.recordingsCount !== undefined &&
                    sentence.recordingsCount > 0
                      ? ` (${sentence.recordingsCount})`
                      : sentenceRecordings.get(sentence.id)?.length
                        ? ` (${sentenceRecordings.get(sentence.id)?.length})`
                        : ""}
                  </span>
                  {expandedRecordings.has(sentence.id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </Button>
            </div>

            {/* 录音列表 */}
            {expandedRecordings.has(sentence.id) && (
              <div className="border-t border-default-200 pt-3 mt-3">
                {sentenceRecordings.get(sentence.id)?.length ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-default-700 mb-2">
                      我的录音记录
                    </h4>
                    {sentenceRecordings
                      .get(sentence.id)
                      ?.map((recording) => (
                        <motion.div
                          key={recording.id}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-3 bg-default-50 dark:bg-default-100/50 rounded-lg hover:bg-default-100 dark:hover:bg-default-100 transition-colors"
                          initial={{ opacity: 0, x: -20 }}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Button
                              isIconOnly
                              color={
                                playingRecording === recording.id
                                  ? "primary"
                                  : "default"
                              }
                              size="sm"
                              variant="flat"
                              onClick={() =>
                                playRecording(
                                  recording.audioUrl,
                                  recording.id,
                                )
                              }
                            >
                              {playingRecording === recording.id ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <div className="flex flex-col flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-default-600">
                                  时长：{recording.duration}秒
                                </span>
                                <span className="text-xs text-default-400">
                                  •
                                </span>
                                <span className="text-xs text-default-600">
                                  大小：
                                  {formatFileSize(
                                    recording.fileSize,
                                  )}
                                </span>
                              </div>
                              <span className="text-xs text-default-400">
                                {formatDateTime(
                                  recording.createdAt,
                                )}
                              </span>
                            </div>
                          </div>
                          <Button
                            isIconOnly
                            color="danger"
                            isDisabled={
                              deletingRecording === recording.id
                            }
                            isLoading={
                              deletingRecording === recording.id
                            }
                            size="sm"
                            variant="light"
                            onClick={() =>
                              openDeleteRecordingConfirm(
                                recording.id,
                                sentence.id,
                              )
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-default-400 text-sm">
                    <Volume2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>还没有录音记录</p>
                    <p className="text-xs mt-1">
                      点击上方的麦克风按钮开始录音
                    </p>
                  </div>
                )}
              </div>
            )}
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
                {onCancelRemoval && (
                  <Button
                    color="danger"
                    size="sm"
                    variant="light"
                    onPress={() => onCancelRemoval(sentence.id)}
                  >
                    撤销
                  </Button>
                )}
              </div>
            </motion.div>
          )}
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
            <Button color="danger" onPress={confirmDelete}>
              删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 删除录音确认对话框 */}
      <Modal
        isOpen={deleteRecordingConfirmOpen}
        onClose={() => setDeleteRecordingConfirmOpen(false)}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">确认删除录音</h2>
          </ModalHeader>
          <ModalBody>
            <p>确定要删除这条录音吗？删除后将无法恢复。</p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setDeleteRecordingConfirmOpen(false)}
            >
              取消
            </Button>
            <Button color="danger" onPress={confirmDeleteRecording}>
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
    </motion.div>
  );
}
