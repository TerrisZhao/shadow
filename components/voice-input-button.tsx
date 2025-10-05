"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@heroui/button";
import { addToast } from "@heroui/toast";
import { Mic } from "lucide-react";
import { motion } from "framer-motion";

interface VoiceInputButtonProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  language?: string;
}

export default function VoiceInputButton({
  onTranscript,
  language = "en-US",
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const shouldStopRef = useRef(false); // 标记是否应该停止
  const isListeningRef = useRef(false); // 使用 ref 来跟踪监听状态，避免闭包问题

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

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language;

        recognition.onresult = (event: any) => {
          // 只有在监听状态下才处理识别结果
          if (!isListeningRef.current) {
            console.log("麦克风已关闭，忽略识别结果");
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
            onTranscript(finalTranscript, true);
          } else if (interimTranscript) {
            onTranscript(interimTranscript, false);
          }
        };

        recognition.onerror = (event: any) => {
          // aborted 和 no-speech 是正常操作，不记录为错误
          if (event.error !== "no-speech" && event.error !== "aborted") {
            console.error("语音识别错误:", event.error);
          }
          
          // 只有非 no-speech 和 aborted 错误才停止
          if (event.error !== "no-speech" && event.error !== "aborted") {
            setIsListening(false);
            isListeningRef.current = false;
            shouldStopRef.current = true;
          }
          
          if (event.error === "not-allowed") {
            showToast("麦克风权限被拒绝，请在浏览器设置中允许访问", "error");
          } else if (event.error === "no-speech") {
            // 没有检测到语音，不提示错误，继续监听
            console.log("等待语音输入...");
          } else if (event.error === "aborted") {
            // 用户主动中止，这是正常操作
            console.log("语音识别已中止");
          } else {
            showToast("语音识别出错，请重试", "error");
          }
        };

        recognition.onend = () => {
          // 如果不是用户主动停止，则自动重启
          if (!shouldStopRef.current && isListeningRef.current) {
            try {
              console.log("自动重启语音识别...");
              recognition.start();
            } catch (error) {
              console.log("重启识别失败:", error);
              setIsListening(false);
              isListeningRef.current = false;
            }
          } else {
            console.log("语音识别结束");
            setIsListening(false);
            isListeningRef.current = false;
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // 忽略停止时的错误
        }
      }
    };
  }, [language, onTranscript]);

  // 切换语音识别
  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      showToast("您的浏览器不支持语音识别", "error");

      return;
    }

    if (isListening) {
      // 用户主动停止 - 先设置标志位，再中止识别
      shouldStopRef.current = true;
      isListeningRef.current = false;
      setIsListening(false);
      // 使用 abort() 立即中止，而不是 stop() 等待完成
      recognitionRef.current.abort();
      showToast("语音输入已停止", "success");
    } else {
      // 用户开始录音
      shouldStopRef.current = false;
      isListeningRef.current = true;
      try {
        recognitionRef.current.start();
        setIsListening(true);
        showToast("开始语音输入，再次点击可停止...", "success");
      } catch (error) {
        console.error("启动语音识别失败:", error);
        showToast("启动语音识别失败", "error");
        isListeningRef.current = false;
      }
    }
  };

  return (
    <Button
      isIconOnly
      color={isListening ? "danger" : "default"}
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
