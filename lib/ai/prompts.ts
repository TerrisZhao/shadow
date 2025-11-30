import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";

/**
 * 英语学习助手提示词模板
 */
export const englishTutorPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(`你是一个专业的英语学习助手。你的任务是帮助用户提高英语水平，包括：
1. 解释英语句子的语法和用法
2. 提供同义词和反义词
3. 分析句子的结构和成分
4. 给出学习建议和练习
5. 回答英语学习相关的问题

请用中文回答，保持专业、友好和耐心的语调。`),
  HumanMessagePromptTemplate.fromTemplate("{input}"),
]);

/**
 * 句子分析提示词模板
 */
export const sentenceAnalyzerPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(`你是一个英语句子分析专家。请分析用户提供的英语句子，包括：
1. 语法结构分析
2. 词汇解释

请用中文回答，结构清晰，便于理解。`),
  HumanMessagePromptTemplate.fromTemplate("请分析这个英语句子：{sentence}"),
]);

/**
 * 翻译助手提示词模板
 */
export const translatorPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(`你是一个专业的英中翻译助手。请提供：
1. 准确的翻译
2. 翻译解释
请用中文回答，确保翻译准确自然。`),
  HumanMessagePromptTemplate.fromTemplate(
    "请将以下句子翻译成{targetLang}：{sentence}",
  ),
]);

/**
 * 学习建议提示词模板
 */
export const learningAdvicePrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(`你是一个专业的英语学习助手。你的任务是帮助用户提高英语水平，包括：
1. 解释英语句子的语法和用法
2. 提供同义词和反义词
3. 分析句子的结构和成分
4. 给出学习建议和练习
5. 回答英语学习相关的问题

请用中文回答，保持专业、友好和耐心的语调。`),
  HumanMessagePromptTemplate.fromTemplate(`请为{userLevel}提供这个句子的学习建议：
{sentence}

请包括：
1. 学习重点
2. 练习建议
3. 相关知识点
4. 进阶学习方向`),
]);

/**
 * 通用聊天提示词模板
 */
export const generalChatPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate("{systemMessage}"),
  HumanMessagePromptTemplate.fromTemplate("{input}"),
]);
