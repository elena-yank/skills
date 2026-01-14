import React, { useState } from 'react';
import { X, Feather, Scroll } from 'lucide-react';
import { useStore } from '../store';

interface PracticeModalProps {
  skillName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PracticeModal: React.FC<PracticeModalProps> = ({ skillName, isOpen, onClose }) => {
  const [content, setContent] = useState('');
  const { addPracticeLog } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const isValid = wordCount >= 200;

  const handleSubmit = async () => {
    if (!isValid) return;
    
    setIsSubmitting(true);
    try {
      await addPracticeLog(skillName, content, wordCount);
      setContent('');
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-hogwarts-parchment w-full max-w-2xl rounded-lg shadow-2xl border-4 border-hogwarts-gold relative flex flex-col max-h-[90vh]">
        <div className="p-6 border-b-2 border-hogwarts-bronze flex justify-between items-center bg-hogwarts-parchment rounded-t-lg">
          <h2 className="text-2xl font-magical text-hogwarts-red flex items-center gap-2 font-serif">
            <Feather className="w-6 h-6" />
            Практика: {skillName}
          </h2>
          <button onClick={onClose} className="text-hogwarts-ink hover:text-hogwarts-red">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-64 p-4 bg-white border-2 border-hogwarts-bronze rounded-lg resize-none focus:outline-none focus:border-hogwarts-red font-body text-lg leading-relaxed bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] font-serif"
              placeholder="Напишите здесь своё эссе о практике... (Минимум 200 слов)"
            />
            <Scroll className="absolute bottom-4 right-4 text-hogwarts-bronze opacity-50 pointer-events-none" />
          </div>
          
          <div className="mt-4 flex justify-between items-center text-hogwarts-ink font-bold font-serif">
            <span className={`${wordCount < 200 ? 'text-hogwarts-red' : 'text-hogwarts-green'}`}>
              Количество слов: {wordCount} / 200
            </span>
          </div>
        </div>

        <div className="p-6 border-t-2 border-hogwarts-bronze bg-hogwarts-parchment rounded-b-lg flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 text-hogwarts-ink font-magical hover:bg-hogwarts-bronze/10 rounded border border-hogwarts-bronze transition-colors font-serif"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className={`px-6 py-2 font-magical font-bold rounded border-2 border-hogwarts-gold shadow-md transition-all font-serif
              ${isValid && !isSubmitting 
                ? 'bg-hogwarts-red text-hogwarts-gold hover:bg-red-900' 
                : 'bg-gray-400 text-gray-200 cursor-not-allowed border-gray-400'}`}
          >
            {isSubmitting ? 'Сохранение...' : 'Сохранить прогресс (+1%)'}
          </button>
        </div>
      </div>
    </div>
  );
};
