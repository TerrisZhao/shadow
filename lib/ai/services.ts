import { getChatModel } from "./config";
import {
  sentenceAnalyzerPrompt,
  translatorPrompt,
  learningAdvicePrompt,
  generalChatPrompt,
  itQuestionTranslatorPrompt,
} from "./prompts";

/**
 * 用户英语水平
 */
export type UserLevel = "beginner" | "intermediate" | "advanced";

/**
 * 目标语言
 */
export type TargetLanguage = "zh" | "en";

/**
 * 发送消息到 AI（通用方法）
 */
export async function sendMessage(
  systemMessage: string,
  userInput: string,
): Promise<string> {
  try {
    const model = getChatModel();
    const prompt = await generalChatPrompt.formatMessages({
      systemMessage,
      input: userInput,
    });

    const response = await model.invoke(prompt);

    return response.content as string;
  } catch (error) {
    console.error("Azure OpenAI API 调用失败:", error);
    throw new Error("AI 服务暂时不可用，请稍后重试");
  }
}

/**
 * 分析英语句子
 * @param sentence 要分析的英语句子
 * @returns 句子分析结果
 */
export async function analyzeSentence(sentence: string): Promise<string> {
  try {
    const model = getChatModel();
    const prompt = await sentenceAnalyzerPrompt.formatMessages({ sentence });
    const response = await model.invoke(prompt);

    return response.content as string;
  } catch (error) {
    console.error("句子分析失败:", error);
    throw new Error("句子分析服务暂时不可用，请稍后重试");
  }
}

/**
 * 翻译句子
 * @param sentence 要翻译的句子
 * @param targetLang 目标语言 (zh: 中文, en: 英文)
 * @returns 翻译结果
 */
export async function translateSentence(
  sentence: string,
  targetLang: TargetLanguage = "zh",
): Promise<string> {
  try {
    const model = getChatModel();
    const targetLangText = targetLang === "zh" ? "中文" : "英文";
    const prompt = await translatorPrompt.formatMessages({
      sentence,
      targetLang: targetLangText,
    });
    const response = await model.invoke(prompt);

    return response.content as string;
  } catch (error) {
    console.error("翻译失败:", error);
    throw new Error("翻译服务暂时不可用，请稍后重试");
  }
}

/**
 * 获取学习建议
 * @param sentence 要学习的句子
 * @param userLevel 用户英语水平
 * @returns 学习建议
 */
export async function getLearningAdvice(
  sentence: string,
  userLevel: UserLevel = "intermediate",
): Promise<string> {
  try {
    const model = getChatModel();
    const userLevelText =
      userLevel === "beginner"
        ? "初学者"
        : userLevel === "intermediate"
          ? "中级学习者"
          : "高级学习者";

    const prompt = await learningAdvicePrompt.formatMessages({
      sentence,
      userLevel: userLevelText,
    });
    const response = await model.invoke(prompt);

    return response.content as string;
  } catch (error) {
    console.error("获取学习建议失败:", error);
    throw new Error("学习建议服务暂时不可用，请稍后重试");
  }
}

/**
 * IT面试题翻译结果
 */
export interface ITQuestionTranslation {
  english: string;
  note?: string;
}

/**
 * 翻译IT面试题（中文翻译成英文）
 * @param question 中文IT面试题
 * @returns 翻译结果（JSON格式）
 */
export async function translateITQuestion(
  question: string,
): Promise<ITQuestionTranslation> {
  try {
    const model = getChatModel();
    const prompt = await itQuestionTranslatorPrompt.formatMessages({
      question,
    });
    const response = await model.invoke(prompt);

    // 解析JSON响应
    const content = response.content as string;
    // 尝试提取JSON（可能包含markdown代码块）
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("模型返回的不是有效的JSON格式");
    }

    const result = JSON.parse(jsonMatch[0]) as ITQuestionTranslation;

    return result;
  } catch (error) {
    console.error("IT面试题翻译失败:", error);
    throw new Error("IT面试题翻译服务暂时不可用，请稍后重试");
  }
}
