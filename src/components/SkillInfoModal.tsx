import React, { useEffect, useRef, useState } from 'react';
import { X, Pencil, Save, Bold, Italic, Underline } from 'lucide-react';
import { api } from '../lib/api';
import { SkillMetadata } from '../lib/api/types';
import { useStore } from '../store';
import { getSkillHeaderClass } from '../lib/skillUtils';
import transgressionSvg from '../assets/transgression.svg';
import patronusSvg from '../assets/patronus.svg';
import nonverbalRedSvg from '../assets/nonverbal-red.svg';
import nowandRedSvg from '../assets/nowand-red.svg';
import mortRedSvg from '../assets/mort-red.svg';
import animaRedSvg from '../assets/anima-red.svg';
import artifactsRedSvg from '../assets/artifacts-red.svg';
import spaceSvg from '../assets/space.svg';

interface SkillInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

// Helper functions for text formatting
const formatUnderline = (text: string): React.ReactNode => {
    const parts = text.split(/(<u>.*?<\/u>)/g);
    return parts.map((part, i) => {
        if (part.startsWith('<u>') && part.endsWith('</u>')) {
            const content = part.slice(3, -4);
            return <u key={i}>{content}</u>;
        }
        return part;
    });
};

const formatItalic = (text: string): React.ReactNode => {
    const parts = text.split(/(_.*?_)/g);
    return parts.map((part, i) => {
        if (part.startsWith('_') && part.endsWith('_')) {
            const content = part.slice(1, -1);
            return <em key={i}>{formatUnderline(content)}</em>;
        }
        return <React.Fragment key={i}>{formatUnderline(part)}</React.Fragment>;
    });
};

const formatText = (text: string): React.ReactNode => {
    const boldParts = text.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            const content = part.slice(2, -2);
            return <strong key={i}>{formatItalic(content)}</strong>;
        }
        return <React.Fragment key={i}>{formatItalic(part)}</React.Fragment>;
    });
};

export const SkillInfoModal: React.FC<SkillInfoModalProps> = ({
  isOpen,
  onClose,
  title,
  description: initialDescription,
}) => {
  const { user } = useStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [metadata, setMetadata] = useState<SkillMetadata | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Determine which description to show:
  // 1. If editing, show editedDescription
  // 2. If metadata has description, show it
  // 3. Fallback to prop description (initialDescription)
  const displayDescription = metadata?.description || initialDescription || '';

  useEffect(() => {
    if (isOpen && title) {
        api.skills?.getMetadata().then(allMeta => {
            const meta = allMeta.find(m => m.skill_name === title);
            setMetadata(meta || null);
            // If we have a saved description, sync edit state to it
            if (meta?.description) {
                setEditedDescription(meta.description);
            } else {
                setEditedDescription(initialDescription);
            }
        }).catch(err => console.error(err));
    } else {
        setMetadata(null);
        setIsEditing(false);
        setEditedDescription('');
    }
  }, [isOpen, title, initialDescription]);

  const handleSave = async () => {
      setIsSaving(true);
      try {
          const updated = await api.skills?.updateMetadata({
              skill_name: title,
              description: editedDescription,
              // Preserve other fields if they exist in current metadata
              responsible_person_name: metadata?.responsible_person_name,
              responsible_person_link: metadata?.responsible_person_link
          });
          setMetadata(updated || null);
          setIsEditing(false);
      } catch (error) {
          console.error('Failed to save description:', error);
          alert('Не удалось сохранить описание');
      } finally {
          setIsSaving(false);
      }
  };

  const insertFormat = (startTag: string, endTag: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const scrollTop = textarea.scrollTop;
      const text = textarea.value;
      const before = text.substring(0, start);
      const selection = text.substring(start, end);
      const after = text.substring(end);

      const newText = before + startTag + selection + endTag + after;
      setEditedDescription(newText);

      setTimeout(() => {
          textarea.focus({ preventScroll: true });
          textarea.setSelectionRange(start + startTag.length, end + startTag.length);
          textarea.scrollTop = scrollTop;
      }, 0);
  };

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
        className={`relative w-full ${isEditing ? 'max-w-4xl h-[80vh]' : 'max-w-2xl max-h-[80vh]'} bg-[#FDF6E3] rounded-lg shadow-2xl border-4 border-hogwarts-gold overflow-hidden flex flex-col transition-all duration-300`}
        style={{
          boxShadow: '0 0 20px rgba(0,0,0,0.5), inset 0 0 40px rgba(139, 69, 19, 0.1)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-hogwarts-gold/30 bg-[#F5E6D3]">
          <div className="flex items-center gap-4">
            {title === 'Трансгрессия' && (
                <img 
                    src={transgressionSvg} 
                    alt="Transgression" 
                    className="w-12 h-12 md:w-16 md:h-16 object-cover object-right select-none"
                />
            )}
            {title === 'Телесный патронус' && (
                <img 
                    src={patronusSvg} 
                    alt="Patronus" 
                    className="w-12 h-12 md:w-16 md:h-16 object-cover object-right select-none"
                />
            )}
            {title === 'Невербальная магия' && (
                <img 
                    src={nonverbalRedSvg} 
                    alt="Non-verbal Magic" 
                    className="w-12 h-12 md:w-16 md:h-16 object-cover object-right select-none"
                />
            )}
            {title === 'Беспалочковая магия' && (
                <img 
                    src={nowandRedSvg} 
                    alt="Wandless Magic" 
                    className="w-12 h-12 md:w-16 md:h-16 object-cover object-right select-none"
                />
            )}
            {title === 'Мортимагия' && (
                <img 
                    src={mortRedSvg} 
                    alt="Mortimagic" 
                    className="w-12 h-12 md:w-16 md:h-16 object-cover object-right select-none"
                />
            )}
            {title === 'Анимагия' && (
                <img 
                    src={animaRedSvg} 
                    alt="Animagus" 
                    className="w-12 h-12 md:w-16 md:h-16 object-cover object-right select-none"
                />
            )}
            {title === 'Артефакторика' && (
                <img 
                    src={artifactsRedSvg} 
                    alt="Artifacts" 
                    className="w-12 h-12 md:w-16 md:h-16 object-cover object-right select-none"
                />
            )}
            {title === 'Магия пространства' && (
                <img 
                    src={spaceSvg} 
                    alt="Space Magic" 
                    className="w-12 h-12 md:w-16 md:h-16 object-cover object-right select-none"
                />
            )}
            <div className="flex flex-col">
                 <h2 className="text-xl md:text-3xl font-seminaria font-bold text-hogwarts-blue">
                   {title}
                 </h2>
                 {metadata?.responsible_person_name && (
                     <div className="text-sm md:text-base font-nexa text-hogwarts-ink/70 mt-1 uppercase">
                         Ответственное лицо: {' '}
                         <a 
                             href={metadata.responsible_person_link} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-hogwarts-red hover:text-hogwarts-gold font-bold underline decoration-1 underline-offset-2 transition-colors"
                             onClick={(e) => e.stopPropagation()}
                         >
                             {metadata.responsible_person_name}
                         </a>
                     </div>
                 )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === 'admin' && (
                <button
                    onClick={() => {
                        if (isEditing) {
                            handleSave();
                        } else {
                            setIsEditing(true);
                            // Initialize edit state with current display value
                            setEditedDescription(displayDescription);
                        }
                    }}
                    disabled={isSaving}
                    className={`p-2 transition-colors rounded-full hover:bg-black/5 ${isEditing ? 'text-green-600 hover:text-green-700' : 'text-hogwarts-ink/60 hover:text-hogwarts-gold'}`}
                    title={isEditing ? "Сохранить" : "Редактировать описание"}
                >
                    {isEditing ? <Save className="w-6 h-6" /> : <Pencil className="w-5 h-5" />}
                </button>
            )}
            <button
                onClick={() => {
                    setIsEditing(false);
                    onClose();
                }}
                className="p-2 text-hogwarts-ink/60 hover:text-hogwarts-red transition-colors rounded-full hover:bg-black/5"
            >
                <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8 overflow-y-auto custom-scrollbar flex flex-col h-full">
          {isEditing ? (
              <div className="flex flex-col h-full gap-2">
                  <div className="flex items-center gap-2 p-2 bg-[#F5E6D3] border border-hogwarts-gold/30 rounded-lg">
                      <button
                          onClick={() => insertFormat('**', '**')}
                          className="p-1.5 hover:bg-hogwarts-gold/20 rounded transition-colors text-hogwarts-ink font-bold"
                          title="Жирный"
                      >
                          <Bold className="w-4 h-4" />
                      </button>
                      <button
                          onClick={() => insertFormat('_', '_')}
                          className="p-1.5 hover:bg-hogwarts-gold/20 rounded transition-colors text-hogwarts-ink italic"
                          title="Курсив"
                      >
                          <Italic className="w-4 h-4" />
                      </button>
                      <button
                          onClick={() => insertFormat('<u>', '</u>')}
                          className="p-1.5 hover:bg-hogwarts-gold/20 rounded transition-colors text-hogwarts-ink underline"
                          title="Подчеркнутый"
                      >
                          <Underline className="w-4 h-4" />
                      </button>
                  </div>
                  <textarea
                      ref={textareaRef}
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="w-full flex-grow p-4 border-2 border-hogwarts-gold/50 rounded-lg bg-[#F5E6D3] font-century text-base md:text-lg text-hogwarts-ink focus:outline-none focus:border-hogwarts-gold resize-none"
                      placeholder="Введите описание навыка..."
                  />
              </div>
          ) : (
            <div className="prose prose-stone max-w-none">
                {displayDescription.split(/\n\s*\n/).map((paragraph, index) => (
                <p 
                    key={index} 
                    className="mb-6 text-base md:text-lg font-century leading-relaxed text-hogwarts-ink last:mb-0 text-justify"
                >
                    {formatText(paragraph)}
                </p>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
