"use client";

import { useState } from "react";
import { Button } from "@heroui/button";
import { Tabs, Tab } from "@heroui/tabs";
import { Plus } from "lucide-react";

import AddSentenceModal from "@/components/add-sentence-modal";
import SentenceListWithAI from "@/components/sentence-list-with-ai";

export default function SentencePage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTab, setSelectedTab] = useState("shared");
  const [newSentenceId, setNewSentenceId] = useState<number | null>(null);

  const handleAddSuccess = (sentenceId?: number) => {
    if (sentenceId) {
      setNewSentenceId(sentenceId);
    }
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Tabs 和添加按钮 */}
      <div className="flex justify-center items-center relative">
        <Tabs
          aria-label="句子库选项"
          color="primary"
          selectedKey={selectedTab}
          size="lg"
          onSelectionChange={(key) => setSelectedTab(key as string)}
        >
          <Tab key="shared" title="共享库" />
          <Tab key="custom" title="自定义" />
          <Tab key="favorite" title="收藏" />
        </Tabs>
        <div className="absolute right-0">
          <Button
            isIconOnly
            className="md:w-auto md:h-auto md:px-3 md:py-2"
            color="primary"
            onPress={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline md:ml-2">添加句子</span>
          </Button>
        </div>
      </div>

      {/* 句子列表 */}
      <SentenceListWithAI
        key={`${refreshKey}-${selectedTab}`}
        newSentenceId={newSentenceId}
        tab={selectedTab}
      />

      {/* 添加句子模态框 */}
      <AddSentenceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
