"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * 登录历史记录器组件
 * 在用户登录成功后自动记录登录历史
 */
// 全局标记，防止重复记录
let isRecording = false;

export default function LoginHistoryRecorder() {
  const { data: session, status } = useSession();
  const hasRecorded = useRef(false);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    // 检查用户是否发生变化（重新登录）
    const currentUserId = (session?.user as any)?.id;

    if (currentUserId && currentUserId !== lastUserId.current) {
      // 用户发生变化，重置记录状态
      hasRecorded.current = false;
      lastUserId.current = currentUserId;

      // 清除旧的localStorage记录
      if (lastUserId.current) {
        const oldRecordKey = `login_recorded_${lastUserId.current}`;

        localStorage.removeItem(oldRecordKey);
      }
    }

    // 只在用户已登录且是首次加载时记录
    if (status === "authenticated" && session?.user && !hasRecorded.current) {
      hasRecorded.current = true;
      // 添加延迟确保session完全加载
      setTimeout(() => {
        recordLoginHistory();
      }, 2000);
    }
  }, [status, session]);

  const recordLoginHistory = async () => {
    try {
      // 防止重复记录
      if (isRecording) {
        return;
      }
      isRecording = true;

      const userId = (session?.user as any)?.id;

      if (!userId) {
        isRecording = false;

        return;
      }

      // 检查是否已经记录过（通过localStorage，包含时间戳）
      const recordKey = `login_recorded_${userId}`;
      const lastRecordTime = localStorage.getItem(recordKey);
      const now = Date.now();

      // 如果距离上次记录不到10分钟，跳过
      if (lastRecordTime && now - parseInt(lastRecordTime) < 10 * 60 * 1000) {
        isRecording = false;

        return;
      }

      // 再次检查session是否稳定
      if (status !== "authenticated" || !session?.user) {
        isRecording = false;

        return;
      }

      // 获取用户代理和IP地址
      const userAgent = navigator.userAgent;

      // 获取IP地址（通过第三方服务）
      let ipAddress = null;

      try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();

        ipAddress = ipData.ip;
      } catch (error) {
        console.warn("无法获取IP地址:", error);
      }

      // 发送到API记录登录历史
      const response = await fetch("/api/auth/login-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAgent,
          ipAddress,
        }),
      });

      if (response.ok) {
        // 记录成功，保存时间戳
        localStorage.setItem(recordKey, now.toString());
        console.log("登录历史记录成功");
      } else {
        console.error("登录历史记录失败:", response.status);
      }
    } catch (error) {
      console.error("记录登录历史失败:", error);
      // 静默失败，不影响用户体验
    } finally {
      // 确保标记被重置
      isRecording = false;
    }
  };

  return null; // 这个组件不渲染任何内容
}
