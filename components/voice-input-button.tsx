"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@heroui/button";
import { addToast } from "@heroui/toast";
import { Mic } from "lucide-react";
import { motion } from "framer-motion";

interface VoiceInputButtonProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  language?: string;
  onRecordingStart?: () => void; // 录音开始时的回调
  onRecordingStop?: () => void; // 录音停止时的回调
}

export default function VoiceInputButton({
  onTranscript,
  language = "en-US",
  onRecordingStart,
  onRecordingStop,
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false); // 使用 ref 来跟踪监听状态，避免闭包问题
  const isStartingRef = useRef(false); // 标记是否正在启动，防止重复启动
  const lastTranscriptRef = useRef(""); // 保存最后的识别结果
  const hasFinalResultRef = useRef(false); // 标记是否已经有最终结果

  // 显示toast消息
  const showToast = (message: string, type: "success" | "error") => {
    addToast({
      title: message,
      color: type === "success" ? "success" : "danger",
    });
  };

  // 初始化语音识别
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();

        recognition.continuous = false; // 改为非连续模式，说完自动停止
        recognition.interimResults = true;
        recognition.lang = language;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          isStartingRef.current = false;
          lastTranscriptRef.current = "";
          hasFinalResultRef.current = false;
        };

        recognition.onresult = (event: any) => {
          // 只有在监听状态下才处理识别结果
          if (!isListeningRef.current) {
            return;
          }

          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }

          // 优先发送最终结果，否则发送临时结果
          if (finalTranscript) {
            lastTranscriptRef.current = finalTranscript;
            hasFinalResultRef.current = true;
            onTranscript(finalTranscript, true);
          } else if (interimTranscript) {
            lastTranscriptRef.current = interimTranscript;
            onTranscript(interimTranscript, false);
          }
        };

        recognition.onerror = (event: any) => {
          isStartingRef.current = false;

          if (event.error === "not-allowed") {
            showToast("麦克风权限被拒绝，请在浏览器设置中允许访问", "error");
            setIsListening(false);
            isListeningRef.current = false;
          } else if (event.error === "no-speech") {
            // 没有检测到语音
            setIsListening(false);
            isListeningRef.current = false;
          } else if (event.error === "aborted") {
            // 用户主动中止，这是正常操作
          } else {
            setIsListening(false);
            isListeningRef.current = false;
          }
        };

        recognition.onend = () => {
          isStartingRef.current = false;

          // 如果识别结束时还没有发送最终结果，但有临时结果，将临时结果作为最终结果发送
          if (!hasFinalResultRef.current && lastTranscriptRef.current) {
            onTranscript(lastTranscriptRef.current, true);
          }

          // 非连续模式下，识别结束后自动停止
          setIsListening(false);
          isListeningRef.current = false;
          lastTranscriptRef.current = "";
          hasFinalResultRef.current = false;
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          isListeningRef.current = false;
          recognitionRef.current.stop();
        } catch (error) {
          // 忽略停止时的错误
        }
      }
    };
  }, [language]);

  // 开始语音识别
  const startRecognition = () => {
    if (!recognitionRef.current) {
      showToast("您的浏览器不支持语音识别", "error");

      return;
    }

    // 防止重复启动
    if (isStartingRef.current || isListeningRef.current) {
      return;
    }

    try {
      isStartingRef.current = true;
      isListeningRef.current = true;

      // 通知父组件录音已开始
      if (onRecordingStart) {
        onRecordingStart();
      }

      recognitionRef.current.start();
      setIsListening(true);
      showToast("开始语音输入...", "success");
    } catch (error: any) {
      isStartingRef.current = false;
      isListeningRef.current = false;

      // 如果是因为已经在运行，先停止再重启
      if (error.message && error.message.includes("already")) {
        try {
          recognitionRef.current.stop();
          setTimeout(() => startRecognition(), 100);
        } catch (e) {
          showToast("启动语音识别失败", "error");
        }
      } else {
        showToast("启动语音识别失败", "error");
      }
    }
  };

  // 停止语音识别
  const stopRecognition = () => {
    if (!recognitionRef.current) return;

    try {
      isListeningRef.current = false;
      recognitionRef.current.stop();
      setIsListening(false);

      // 通知父组件录音已停止
      if (onRecordingStop) {
        onRecordingStop();
      }
    } catch (error) {
      // 静默处理错误
    }
  };

  // 切换语音识别
  const toggleVoiceInput = () => {
    if (isListening) {
      stopRecognition();
    } else {
      startRecognition();
    }
  };

  return (
    <Button
      isIconOnly
      color={isListening ? "danger" : "primary"}
      size="lg"
      variant="flat"
      onPress={toggleVoiceInput}
    >
      {isListening ? (
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
          <Mic className="w-5 h-5" />
        </motion.div>
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </Button>
  );
}
