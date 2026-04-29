import React, { useState } from 'react';
import { X, Feather, Scroll } from 'lucide-react';
import { useStore } from '../store';

interface PracticeModalProps {
  skillName: string;
  isOpen: boolean;
  onClose: () => void;
  viewAsUser?: boolean;
  isExam?: boolean;
  isRegistration?: boolean;
  isApplication?: boolean;
}

export const PracticeModal: React.FC<PracticeModalProps> = ({ skillName, isOpen, onClose, viewAsUser, isExam = false, isRegistration = false, isApplication = false }) => {
  const [content, setContent] = useState('');
  const [postLink, setPostLink] = useState('');
  const { addPracticeLog } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  // For application, no word count limit specified, "любое количество слов". 
  // Let's assume just not empty.
  const isValid = isApplication 
    ? (content.trim().length > 0)
    : (wordCount >= 200 && postLink.trim().length > 0);

  const handleSubmit = async () => {
    if (!isValid) return;
    
    setIsSubmitting(true);
    try {
      await addPracticeLog(
          skillName, 
          content, 
          wordCount, 
          postLink, 
          viewAsUser, 
          isApplication ? 'application' : ((isExam || isRegistration) ? 'exam' : 'practice')
      );
      setContent('');
      setPostLink('');
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
      if (isApplication) return `Подать заявку на навык "${skillName}"`;
      if (isRegistration) return `Регистрация: ${skillName}`;
      if (isExam) return `Экзамен: ${skillName}`;
      return `Практика: ${skillName}`;
  };

  const getDescription = () => {
      if (isApplication) return "Опиши свой план на сюжет. Зачем твоему персонажу этот навык, какие планы на его использование? Укажи всё, что считаешь нужным.";
      if (isRegistration) return "Напишите здесь текст для прохождения регистрации...";
      if (isExam) return "Напишите здесь ответ на экзаменационное задание...";
      return "Напиши здесь свой пост... (минимум 200 слов)";
  };

  const getButtonText = () => {
      if (isSubmitting) return 'Сохранение...';
      if (isApplication) return 'Отправить заявку';
      if (isRegistration) return 'Отправить на регистрацию';
      if (isExam) return 'Отправить на проверку';
      return 'СОХРАНИТЬ ПРОГРЕСС';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-hogwarts-parchment w-full max-w-2xl rounded-lg shadow-2xl border-4 border-hogwarts-gold relative flex flex-col max-h-[90vh]">
        <div className="p-4 md:p-6 border-b-2 border-hogwarts-bronze flex justify-between items-center bg-hogwarts-parchment rounded-t-lg">
          <h2 className="text-xl md:text-2xl font-seminaria text-hogwarts-red flex items-center gap-2 font-bold">
            <Feather className="w-5 h-5 md:w-6 md:h-6" />
            {getTitle()}
          </h2>
          <button onClick={onClose} className="text-hogwarts-ink hover:text-hogwarts-red">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 md:p-6 flex-1 overflow-auto space-y-4">
          {isApplication && (
             <p className="text-hogwarts-ink font-serif italic mb-4">
                 {getDescription()}
             </p>
          )}
          
          {!isApplication && (
            <div>
                <label className="block text-sm font-bold text-hogwarts-ink mb-1 font-nexa uppercase">Ссылка на пост</label>
                <input
                type="url"
                value={postLink}
                onChange={(e) => setPostLink(e.target.value)}
                className="w-full px-4 py-2 bg-white border-2 border-hogwarts-bronze rounded focus:outline-none focus:border-hogwarts-red transition-colors font-century"
                placeholder="https://..."
                required
                />
            </div>
          )}

          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-48 md:h-64 p-4 bg-white border-2 border-hogwarts-bronze rounded-lg resize-none focus:outline-none focus:border-hogwarts-red font-century text-base md:text-lg leading-relaxed"
              placeholder={!isApplication ? getDescription() : "Текст заявки..."}
            />
            <Scroll className="absolute bottom-4 right-4 text-hogwarts-bronze opacity-50 pointer-events-none" />
          </div>
          
          {!isApplication && (
              <div className="flex justify-between items-center text-hogwarts-ink font-bold font-nexa uppercase">
                <span className={`${wordCount < 200 ? 'text-hogwarts-red' : 'text-hogwarts-green'}`}>
                  Количество слов: {wordCount} / 200
                </span>
              </div>
          )}
        </div>

        <div className="p-4 md:p-6 border-t-2 border-hogwarts-bronze bg-hogwarts-parchment rounded-b-lg flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 text-hogwarts-ink font-magical hover:bg-hogwarts-bronze/10 rounded border border-hogwarts-bronze transition-colors font-nexa uppercase"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className={`px-6 py-2 font-magical font-bold rounded border-2 border-hogwarts-gold shadow-md transition-all font-nexa uppercase
              ${isValid && !isSubmitting 
                ? 'bg-hogwarts-red text-hogwarts-gold hover:bg-red-900' 
                : 'bg-gray-400 text-gray-200 cursor-not-allowed border-gray-400'}`}
          >
            {getButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
};
