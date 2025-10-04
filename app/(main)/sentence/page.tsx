'use client';

import { useState } from 'react';
import { Button } from '@heroui/button';
import { Tabs, Tab } from '@heroui/tabs';
import { Plus } from 'lucide-react';
import AddSentenceModal from '@/components/add-sentence-modal';
import SentenceList from '@/components/sentence-list';

export default function SentencePage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTab, setSelectedTab] = useState('shared');

  const handleAddSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Tabs 和添加按钮 */}
      <div className="flex justify-center items-center relative">
        <Tabs
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(key as string)}
          aria-label="句子库选项"
          size="lg"
          color="primary"
        >
          <Tab key="shared" title="共享库" />
          <Tab key="custom" title="自定义" />
          <Tab key="favorite" title="收藏" />
        </Tabs>
        <div className="absolute right-0">
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={() => setIsAddModalOpen(true)}
          >
            添加句子
          </Button>
        </div>
      </div>

      {/* 句子列表 */}
      <SentenceList 
        key={`${refreshKey}-${selectedTab}`} 
        onRefresh={handleAddSuccess}
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
