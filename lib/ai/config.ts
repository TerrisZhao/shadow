import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// OpenAI 配置
export const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  model: "gpt-4o-mini", // 使用更经济的模型
  temperature: 0.7,
  maxTokens: 1000,
};

// 创建 OpenAI 聊天模型实例
export const createChatModel = (options?: {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}) => {
  return new ChatOpenAI({
    openAIApiKey: openaiConfig.apiKey,
    configuration: {
      baseURL: openaiConfig.baseURL,
    },
    modelName: options?.model || openaiConfig.model,
    temperature: options?.temperature || openaiConfig.temperature,
    maxTokens: options?.maxTokens || openaiConfig.maxTokens,
  });
};

// 默认聊天模型实例
export const chatModel = createChatModel();

// 系统消息模板
export const systemMessages = {
  // 英语学习助手
  englishTutor: new SystemMessage(`
你是一个专业的英语学习助手。你的任务是帮助用户提高英语水平，包括：
1. 解释英语句子的语法和用法
2. 提供同义词和反义词
3. 分析句子的结构和成分
4. 给出学习建议和练习
5. 回答英语学习相关的问题

请用中文回答，保持专业、友好和耐心的语调。
`),

  // 句子分析助手
  sentenceAnalyzer: new SystemMessage(`
你是一个英语句子分析专家。请分析用户提供的英语句子，包括：
1. 语法结构分析
2. 词汇解释
3. 句型特点
4. 使用场景
5. 学习要点

请用中文回答，结构清晰，便于理解。
`),

  // 翻译助手
  translator: new SystemMessage(`
你是一个专业的英中翻译助手。请提供：
1. 准确的翻译
2. 翻译解释
3. 文化背景说明
4. 使用建议

请用中文回答，确保翻译准确自然。
`),
};

// 工具函数：发送消息到 OpenAI
export const sendMessage = async (
  messages: (HumanMessage | SystemMessage)[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
) => {
  try {
    const model = options ? createChatModel(options) : chatModel;
    const response = await model.invoke(messages);
    return response.content as string;
  } catch (error) {
    console.error("OpenAI API 调用失败:", error);
    throw new Error("AI 服务暂时不可用，请稍后重试");
  }
};

// 工具函数：分析英语句子
export const analyzeSentence = async (sentence: string) => {
  const messages = [
    systemMessages.sentenceAnalyzer,
    new HumanMessage(`请分析这个英语句子：${sentence}`),
  ];

  return await sendMessage(messages);
};

// 工具函数：翻译句子
export const translateSentence = async (sentence: string, targetLang: "zh" | "en" = "zh") => {
  const messages = [
    systemMessages.translator,
    new HumanMessage(`请将以下句子翻译成${targetLang === "zh" ? "中文" : "英文"}：${sentence}`),
  ];

  return await sendMessage(messages);
};

// 工具函数：获取学习建议
export const getLearningAdvice = async (sentence: string, userLevel: "beginner" | "intermediate" | "advanced" = "intermediate") => {
  const messages = [
    systemMessages.englishTutor,
    new HumanMessage(`
请为${userLevel === "beginner" ? "初学者" : userLevel === "intermediate" ? "中级学习者" : "高级学习者"}提供这个句子的学习建议：
${sentence}

请包括：
1. 学习重点
2. 练习建议
3. 相关知识点
4. 进阶学习方向
`),
  ];

  return await sendMessage(messages);
};
