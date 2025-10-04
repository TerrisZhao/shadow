"use client";

import { useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { title } from "@/components/primitives";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("邮箱或密码错误");
      } else {
        // 登录成功，重定向到仪表板
        router.push("/dashboard");
      }
    } catch (error) {
      setError("登录失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (error) {
      setError("Google 登录失败，请重试");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-1 pb-0 pt-6 px-6">
          <h1 className={title({ size: "sm" })}>登录</h1>
          <p className="text-small text-default-500">登录到您的账户以继续</p>
        </CardHeader>
        <CardBody className="gap-4 px-6 py-15">
          {error && (
            <div className="p-3 text-sm text-danger bg-danger-50 rounded-lg border border-danger-200">
              {error}
            </div>
          )}

          <Button
            className="w-full"
            isLoading={isLoading}
            variant="bordered"
            onClick={handleGoogleSignIn}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="currentColor"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="currentColor"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="currentColor"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="currentColor"
              />
            </svg>
            使用 Google 登录
          </Button>

          {/* <div className="flex items-center gap-4">
            <Divider className="flex-1" />
            <p className="text-tiny text-default-500">或</p>
            <Divider className="flex-1" />
          </div>

          <form onSubmit={handleCredentialsSignIn} className="flex flex-col gap-4">
            <Input
              type="email"
              label="邮箱"
              placeholder="输入您的邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              isRequired
            />
            <Input
              type="password"
              label="密码"
              placeholder="输入您的密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              isRequired
            />
            <Button
              type="submit"
              color="primary"
              isLoading={isLoading}
              isDisabled={!email || !password}
            >
              登录
            </Button>
          </form>

          <div className="text-center text-small text-default-500">
            默认管理员账户：
            <br />
            邮箱: admin@example.com
            <br />
            密码: admin123456
          </div> */}
        </CardBody>
      </Card>
    </div>
  );
}
