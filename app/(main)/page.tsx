"use client";

import { Link } from "@heroui/link";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { motion } from "framer-motion";
import { BookOpen, Volume2, Sparkles, TrendingUp, Clock, Target } from "lucide-react";

import { title, subtitle } from "@/components/primitives";

const MotionCard = motion(Card);
const MotionDiv = motion.div;

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };


  return (
    <div className="flex flex-col items-center justify-center">
      {/* Hero Section */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="flex flex-col items-center justify-center gap-6 text-center max-w-4xl px-6 min-h-screen"
      >
        <MotionDiv variants={itemVariants} className="inline-block">
          <h1 className={title({ size: "lg" })}>
            掌握英语，从&nbsp;
            <span className={title({ color: "blue", size: "lg" })}>
              每一个句子
            </span>
            &nbsp;开始
          </h1>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <p className={subtitle({ class: "mt-4" })}>
            通过精心收集的英语句子，让你的英语学习更高效、更有趣。
            <br />
            智能分类、语音朗读、个性化管理，助你快速提升英语水平。
          </p>
        </MotionDiv>

        <MotionDiv variants={itemVariants} className="flex gap-4 mt-4">
          <Link href="/sentence">
            <Button
              color="primary"
              size="lg"
              radius="full"
              className="font-semibold"
              startContent={<BookOpen size={20} />}
            >
              开始学习
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button
              variant="bordered"
              size="lg"
              radius="full"
              className="font-semibold"
              startContent={<TrendingUp size={20} />}
            >
              查看统计
            </Button>
          </Link>
        </MotionDiv>
      </MotionDiv>

      {/* Features Section */}
      <section className="w-full max-w-6xl px-6 py-20">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center m-12"
        >
          <h2 className={title({ size: "sm" })}>
            核心
            <span className={title({ color: "violet", size: "sm" })}>
              &nbsp;功能
            </span>
          </h2>
        </MotionDiv>

        <MotionDiv
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          <MotionCard
            variants={itemVariants}
            whileHover={{ scale: 1.03, transition: { duration: 0.7 } }}
            className="w-full hover:shadow-md transition-shadow"
          >
            <CardHeader className="flex-col items-start gap-3 pb-0">
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                <BookOpen size={28} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold">智能分类</h3>
            </CardHeader>
            <CardBody className="gap-2 pt-2 p-4">
              <p className="text-default-600 text-sm">
                按主题、难度、场景分类管理句子，让学习更有条理、更系统化。
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Chip size="sm" variant="flat" color="primary">主题分类</Chip>
                <Chip size="sm" variant="flat" color="primary">难度分级</Chip>
              </div>
            </CardBody>
          </MotionCard>

          <MotionCard
            variants={itemVariants}
            whileHover={{ scale: 1.03, transition: { duration: 0.7 } }}
            className="w-full hover:shadow-md transition-shadow"
          >
            <CardHeader className="flex-col items-start gap-3 pb-0">
              <div className="w-14 h-14 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center">
                <Volume2 size={28} className="text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-bold">语音朗读</h3>
            </CardHeader>
            <CardBody className="gap-2 pt-2 p-4">
              <p className="text-default-600 text-sm">
                内置TTS语音功能，标准发音，帮助你掌握正确的英语发音。
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Chip size="sm" variant="flat" color="secondary">标准发音</Chip>
                <Chip size="sm" variant="flat" color="secondary">即时播放</Chip>
              </div>
            </CardBody>
          </MotionCard>

          <MotionCard
            variants={itemVariants}
            whileHover={{ scale: 1.03, transition: { duration: 0.7 } }}
            className="w-full hover:shadow-md transition-shadow"
          >
            <CardHeader className="flex-col items-start gap-3 pb-0">
              <div className="w-14 h-14 rounded-xl bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center">
                <Sparkles size={28} className="text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-bold">个性化管理</h3>
            </CardHeader>
            <CardBody className="gap-2 pt-2 p-4">
              <p className="text-default-600 text-sm">
                添加你喜欢的句子，标记难点，打造专属于你的学习资料库。
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Chip size="sm" variant="flat" color="success">自定义收藏</Chip>
                <Chip size="sm" variant="flat" color="success">标记重点</Chip>
              </div>
            </CardBody>
          </MotionCard>
        </MotionDiv>
      </section>

      {/* Stats Section */}
      <section className="w-full max-w-6xl px-6 py-20 pb-32">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center m-12"
        >
          <h2 className={title({ size: "sm" })}>
            学习
            <span className={title({ color: "cyan", size: "sm" })}>
              &nbsp;亮点
            </span>
          </h2>
        </MotionDiv>

        <MotionDiv
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          <MotionCard
            variants={itemVariants}
            whileHover={{ scale: 1.03, transition: { duration: 0.7 } }}
            className="w-full hover:shadow-md transition-shadow"
          >
            <CardBody className="flex flex-col items-center gap-3 p-6">
              <div className="w-14 h-14 rounded-full bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center">
                <Target size={28} className="text-orange-600 dark:text-orange-400" />
              </div>
              <h4 className="text-lg font-bold text-orange-600 dark:text-orange-400">
                系统化学习
              </h4>
              <p className="text-default-600 text-center text-sm">
                结构化的学习路径，让你从基础到进阶循序渐进
              </p>
            </CardBody>
          </MotionCard>

          <MotionCard
            variants={itemVariants}
            whileHover={{ scale: 1.03, transition: { duration: 0.7 } }}
            className="w-full hover:shadow-md transition-shadow"
          >
            <CardBody className="flex flex-col items-center gap-3 p-6">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center">
                <Clock size={28} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h4 className="text-lg font-bold text-amber-600 dark:text-amber-400">
                高效记忆
              </h4>
              <p className="text-default-600 text-center text-sm">
                碎片化时间利用，随时随地轻松学习
              </p>
            </CardBody>
          </MotionCard>

          <MotionCard
            variants={itemVariants}
            whileHover={{ scale: 1.03, transition: { duration: 0.7 } }}
            className="w-full hover:shadow-md transition-shadow"
          >
            <CardBody className="flex flex-col items-center gap-3 p-6">
              <div className="w-14 h-14 rounded-full bg-yellow-500/10 dark:bg-yellow-500/20 flex items-center justify-center">
                <TrendingUp size={28} className="text-yellow-600 dark:text-yellow-400" />
              </div>
              <h4 className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                持续进步
              </h4>
              <p className="text-default-600 text-center text-sm">
                可视化学习统计，见证你的每一步成长
              </p>
            </CardBody>
          </MotionCard>
        </MotionDiv>
      </section>
    </div>
  );
}
