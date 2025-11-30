import { AzureChatOpenAI } from "@langchain/openai";

/**
 * Azure OpenAI 配置接口
 */
export interface AzureOpenAIConfig {
  apiKey: string | undefined;
  endpoint: string | undefined;
  deployment: string;
  apiVersion: string;
  temperature: number;
  maxCompletionTokens: number;
}

/**
 * 创建聊天模型的选项
 */
export interface ChatModelOptions {
  deployment?: string;
  temperature?: number;
  maxCompletionTokens?: number;
}

/**
 * 获取 Azure OpenAI 配置（使用函数延迟读取环境变量）
 */
export function getAzureOpenAIConfig(): AzureOpenAIConfig {
  return {
    apiKey: process.env.AZURE_OPENAI_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5-mini",
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2025-04-01-preview",
    temperature: 1, // gpt-5-mini 只支持 temperature=1
    maxCompletionTokens: 1000,
  };
}

/**
 * 创建 Azure OpenAI 聊天模型实例
 * @param options 可选配置项
 * @returns Azure OpenAI 聊天模型实例
 */
export function createChatModel(options?: ChatModelOptions): AzureChatOpenAI {
  const config = getAzureOpenAIConfig();

  return new AzureChatOpenAI({
    azureOpenAIApiKey: config.apiKey,
    azureOpenAIApiInstanceName: config.endpoint
      ?.replace("https://", "")
      .replace(".openai.azure.com", ""),
    azureOpenAIApiDeploymentName: options?.deployment || config.deployment,
    azureOpenAIApiVersion: config.apiVersion,
    temperature: options?.temperature || config.temperature,
  });
}

/**
 * 默认聊天模型实例（懒加载）
 */
let _chatModel: AzureChatOpenAI | null = null;

/**
 * 获取默认的聊天模型实例（单例模式）
 * @returns Azure OpenAI 聊天模型实例
 */
export function getChatModel(): AzureChatOpenAI {
  if (!_chatModel) {
    _chatModel = createChatModel();
  }

  return _chatModel;
}
