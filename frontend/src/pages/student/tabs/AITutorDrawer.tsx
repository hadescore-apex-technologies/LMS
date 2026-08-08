import React from 'react';
import { ApexAITutorCore } from '../../../components/ApexAITutorCore';
import { AnimatePresence } from 'framer-motion';

interface AITutorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: number | null;
  courseId: number;
  lessonTitle?: string;
}

export const AITutorDrawer: React.FC<AITutorDrawerProps> = ({
  isOpen,
  onClose,
  lessonId,
  courseId,
  lessonTitle
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay backdrop */}
          <div
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Slide-out Panel */}
          <aside className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[500px] bg-card border-l border-border flex flex-col justify-between shadow-2xl animate-slide-in">
            <ApexAITutorCore
              lessonId={lessonId}
              courseId={courseId}
              lessonTitle={lessonTitle}
              onClose={onClose}
            />
          </aside>
        </>
      )}
    </AnimatePresence>
  );
};

