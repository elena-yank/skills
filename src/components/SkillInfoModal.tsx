import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface SkillInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

export const SkillInfoModal: React.FC<SkillInfoModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-2xl bg-[#FDF6E3] rounded-lg shadow-2xl border-4 border-hogwarts-gold overflow-hidden flex flex-col max-h-[80vh]"
        style={{
          boxShadow: '0 0 20px rgba(0,0,0,0.5), inset 0 0 40px rgba(139, 69, 19, 0.1)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-hogwarts-gold/30 bg-[#F5E6D3]">
          <h2 className="text-3xl font-seminaria font-bold text-hogwarts-blue">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-hogwarts-ink/60 hover:text-hogwarts-red transition-colors rounded-full hover:bg-black/5"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar">
          <div className="prose prose-stone max-w-none">
            {description.split('\n\n').map((paragraph, index) => (
              <p 
                key={index} 
                className="mb-4 text-lg font-serif leading-relaxed text-hogwarts-ink last:mb-0"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
