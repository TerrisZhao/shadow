"use client";

import { useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { Chip } from "@heroui/chip";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { 
  Bot, 
  Brain, 
  Languages, 
  Lightbulb, 
  MessageCircle, 
  X,
  Send,
  Sparkles
} from "lucide-react";
import { addToast } from "@heroui/toast";

interface AIAssistantProps {
  sentence: string;
  isOpen: boolean;
  onClose: () => void;
}

type AIAction = "analyze" | "translate" | "advice" | "chat";

export default function AIAssistant({ sentence, isOpen, onClose }: AIAssistantProps) {
  const [selectedAction, setSelectedAction] = useState<AIAction>("analyze");
  const [userLevel, setUserLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [chatMessage, setChatMessage] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  // 显示toast消息
  const showToast = (message: string, type: "success" | "error") => {
    addToast({
      title: message,
      color: type === "success" ? "success" : "danger",
    });
  };

  // 处理AI分析
  const handleAIAnalysis = async () => {
    if (!sentence.trim()) {
      showToast("请提供要分析的句子", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sentence,
          action: selectedAction,
          userLevel: selectedAction === "advice" ? userLevel : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data.result);
        showToast("AI 分析完成", "success");
      } else {
        const error = await response.json();
        showToast(error.error || "分析失败", "error");
      }
    } catch (error) {
      showToast("网络错误，请重试", "error");
    } finally {
      setLoading(false);
    }
  };

  // 处理AI聊天
  const handleAIChat = async () => {
    if (!chatMessage.trim()) {
      showToast("请输入消息", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: chatMessage,
          context: `当前句子：${sentence}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data.result);
        setChatMessage("");
        showToast("AI 回复完成", "success");
      } else {
        const error = await response.json();
        showToast(error.error || "聊天失败", "error");
      }
    } catch (error) {
      showToast("网络错误，请重试", "error");
    } finally {
      setLoading(false);
    }
  };

  // 重置状态
  const handleClose = () => {
    setResult("");
    setChatMessage("");
    setSelectedAction("analyze");
    onClose();
  };

  const actionConfig = {
    analyze: {
      icon: <Brain className="w-4 h-4" />,
      label: "句子分析",
      description: "分析语法结构和用法",
      color: "primary" as const,
    },
    translate: {
      icon: <Languages className="w-4 h-4" />,
      label: "翻译",
      description: "翻译句子",
      color: "secondary" as const,
    },
    advice: {
      icon: <Lightbulb className="w-4 h-4" />,
      label: "学习建议",
      description: "获取学习建议",
      color: "warning" as const,
    },
    chat: {
      icon: <MessageCircle className="w-4 h-4" />,
      label: "AI 聊天",
      description: "与AI对话",
      color: "success" as const,
    },
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="4xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">AI 英语学习助手</h2>
          </div>
          <p className="text-sm text-default-500">
            当前句子：{sentence}
          </p>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-6">
            {/* 功能选择 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">选择功能</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(actionConfig).map(([key, config]) => (
                  <Button
                    key={key}
                    variant={selectedAction === key ? "solid" : "bordered"}
                    color={config.color}
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onPress={() => setSelectedAction(key as AIAction)}
                  >
                    {config.icon}
                    <div className="text-center">
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs opacity-70">{config.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* 学习水平选择（仅在学习建议时显示） */}
            {selectedAction === "advice" && (
              <div className="space-y-3">
                <h4 className="text-base font-medium">学习水平</h4>
                <Select
                  label="选择您的英语水平"
                  selectedKeys={new Set([userLevel])}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as string;
                    setUserLevel(selectedKey as "beginner" | "intermediate" | "advanced");
                  }}
                  className="w-64"
                >
                  <SelectItem key="beginner" textValue="初学者">
                    初学者
                  </SelectItem>
                  <SelectItem key="intermediate" textValue="中级">
                    中级
                  </SelectItem>
                  <SelectItem key="advanced" textValue="高级">
                    高级
                  </SelectItem>
                </Select>
              </div>
            )}

            {/* 聊天输入（仅在聊天模式时显示） */}
            {selectedAction === "chat" && (
              <div className="space-y-3">
                <h4 className="text-base font-medium">与AI对话</h4>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="输入您的问题..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="flex-1"
                    minRows={2}
                    maxRows={4}
                  />
                  <Button
                    color="primary"
                    onPress={handleAIChat}
                    isLoading={loading}
                    isDisabled={!chatMessage.trim()}
                    className="self-end"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* 操作按钮（非聊天模式） */}
            {selectedAction !== "chat" && (
              <div className="flex justify-center">
                <Button
                  color="primary"
                  size="lg"
                  onPress={handleAIAnalysis}
                  isLoading={loading}
                  startContent={!loading && <Sparkles className="w-4 h-4" />}
                >
                  {loading ? "AI 分析中..." : `开始${actionConfig[selectedAction].label}`}
                </Button>
              </div>
            )}

            {/* 结果显示 */}
            {result && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h4 className="text-base font-medium">AI 分析结果</h4>
                </div>
                <Card>
                  <CardBody className="p-4">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {result}
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            关闭
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
