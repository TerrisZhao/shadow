/**
 * DeepL 翻译服务
 *
 * 提供高质量的机器翻译功能
 * - 中文翻译成英文
 * - 英文翻译成中文
 */

import * as deepl from "deepl-node";

/**
 * 创建 DeepL 翻译器实例
 */
function getTranslator(): deepl.Translator {
  const authKey = process.env.DEEPL_AUTH_KEY;

  if (!authKey) {
    throw new Error(
      "DEEPL_AUTH_KEY 环境变量未设置。请在 .env 文件中配置 DeepL API 密钥。",
    );
  }

  return new deepl.Translator(authKey);
}

/**
 * 翻译选项
 */
export interface TranslateOptions {
  /**
   * 是否保留格式（换行、标点等）
   * @default true
   */
  preserveFormatting?: boolean;

  /**
   * 翻译的正式程度
   * - 'default': 默认
   * - 'more': 更正式
   * - 'less': 更随意
   * - 'prefer_more': 倾向于更正式
   * - 'prefer_less': 倾向于更随意
   */
  formality?: "default" | "more" | "less" | "prefer_more" | "prefer_less";
}

/**
 * 中文翻译成英文
 *
 * @param text 中文文本
 * @param options 翻译选项
 * @returns 英文翻译结果
 *
 * @example
 * ```typescript
 * const result = await translateChineseToEnglish("你好，世界");
 * console.log(result); // "Hello, World"
 * ```
 */
export async function translateChineseToEnglish(
  text: string,
  options: TranslateOptions = {},
): Promise<string> {
  try {
    const translator = getTranslator();

    const result = await translator.translateText(
      text,
      "zh", // 源语言：中文
      "en-US", // 目标语言：美式英语
      {
        preserveFormatting: options.preserveFormatting ?? true,
        formality: options.formality,
      },
    );

    return result.text;
  } catch (error) {
    console.error("DeepL 中译英失败:", error);
    throw new Error("翻译服务暂时不可用，请稍后重试");
  }
}

/**
 * 英文翻译成中文
 *
 * @param text 英文文本
 * @param options 翻译选项
 * @returns 中文翻译结果
 *
 * @example
 * ```typescript
 * const result = await translateEnglishToChinese("Hello, World");
 * console.log(result); // "你好，世界"
 * ```
 */
export async function translateEnglishToChinese(
  text: string,
  options: TranslateOptions = {},
): Promise<string> {
  try {
    const translator = getTranslator();

    const result = await translator.translateText(
      text,
      "en", // 源语言：英文
      "zh", // 目标语言：中文
      {
        preserveFormatting: options.preserveFormatting ?? true,
      },
    );

    return result.text;
  } catch (error) {
    console.error("DeepL 英译中失败:", error);
    throw new Error("翻译服务暂时不可用，请稍后重试");
  }
}

/**
 * 检查 DeepL API 使用情况
 *
 * @returns 使用情况信息
 *
 * @example
 * ```typescript
 * const usage = await checkUsage();
 * console.log(`已使用: ${usage.character.count} / ${usage.character.limit}`);
 * ```
 */
export async function checkUsage(): Promise<deepl.Usage> {
  try {
    const translator = getTranslator();
    const usage = await translator.getUsage();

    return usage;
  } catch (error) {
    console.error("获取 DeepL 使用情况失败:", error);
    throw error;
  }
}

/**
 * 获取支持的语言列表
 *
 * @param type 语言类型：'source'（源语言）或 'target'（目标语言）
 * @returns 支持的语言列表
 */
export async function getSupportedLanguages(
  type: "source" | "target" = "source",
): Promise<readonly deepl.Language[]> {
  try {
    const translator = getTranslator();

    if (type === "source") {
      return await translator.getSourceLanguages();
    } else {
      return await translator.getTargetLanguages();
    }
  } catch (error) {
    console.error("获取支持的语言列表失败:", error);
    throw error;
  }
}
