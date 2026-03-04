import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Story, StorySegment } from '../lib/api/types';
import castleImg from '../assets/castle.png';
import frameSvg from '../assets/frame.svg';
import storyIcon from '../assets/story.svg';
import owlSvg from '../assets/owl.svg';
import { useStore } from '../store';
import { ArrowLeft, Plus, ExternalLink, Trash2, Edit3, Check, X } from 'lucide-react';

interface SegmentForm {
  content: string;
  link: string;
  author: string;
}

const StorySegmentItem: React.FC<{
  segment: StorySegment;
  index: number;
  isOwner: boolean;
  ownerName: string;
  onEdit: (segment: StorySegment) => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
}> = ({ segment, index, isOwner, ownerName, onEdit, onDelete, isSaving }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showScrollbar, setShowScrollbar] = useState(false);

  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const progress = scrollTop / (scrollHeight - clientHeight);
      setScrollProgress(isNaN(progress) ? 0 : progress);
      setShowScrollbar(scrollHeight > clientHeight);
    }
  };

  useEffect(() => {
    // Initial check and on content update
    handleScroll();
    // Add resize listener
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [segment.content]);

  useEffect(() => {
    let rafId: number;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !scrollTrackRef.current || !contentRef.current) return;
      
      const track = scrollTrackRef.current.getBoundingClientRect();
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const relativeY = clientY - track.top;
      const percentage = Math.max(0, Math.min(1, relativeY / track.height));
      
      const content = contentRef.current;
      const targetScroll = percentage * (content.scrollHeight - content.clientHeight);
      
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        content.scrollTop = targetScroll;
      });
    };

    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMove, { passive: false });
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
      // Блокируем скролл на body на мобильных
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      // Возвращаем скролл
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      cancelAnimationFrame(rafId);
    };
  }, [isDragging]);

  return (
    <div className="relative p-4 md:p-6 rounded-lg shadow-md bg-white/5 border border-hogwarts-gold/40 max-h-[420px] md:max-h-[480px] flex flex-col transition-all duration-300">
      <div className="flex-1 overflow-hidden relative flex gap-4 pr-6">
        <div
          ref={contentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto pr-2 hide-scrollbar"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {segment.link && (
                <a
                  href={segment.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs md:text-sm text-hogwarts-gold hover:text-yellow-400 visited:text-hogwarts-gold underline decoration-hogwarts-gold/60 underline-offset-4 font-century transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Пост
                </a>
              )}
            </div>
            <div className="text-sm md:text-base text-white font-century whitespace-pre-wrap leading-relaxed pb-2">
              {segment.content}
            </div>
          </div>
        </div>

        {showScrollbar && (
          <div className="w-1.5 shrink-0 my-8 relative">
            <div
              ref={scrollTrackRef}
              className="absolute inset-0 bg-hogwarts-gold/10 rounded-full cursor-pointer touch-none"
              onClick={(e) => {
                if (scrollTrackRef.current && contentRef.current) {
                  const track = scrollTrackRef.current.getBoundingClientRect();
                  const percentage = (e.clientY - track.top) / track.height;
                  contentRef.current.scrollTop = percentage * (contentRef.current.scrollHeight - contentRef.current.clientHeight);
                }
              }}
            >
              <div
                className="absolute top-0 w-full bg-hogwarts-gold/40 rounded-full"
                style={{ height: `${scrollProgress * 100}%` }}
              />
              <div
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                onTouchStart={(e) => { e.stopPropagation(); setIsDragging(true); }}
                className="absolute left-1/2 -translate-x-1/2 z-20 cursor-grab active:cursor-grabbing touch-none"
                style={{ top: `${scrollProgress * 100}%` }}
              >
                <div className="bg-white rounded-full border border-hogwarts-gold shadow-lg p-1 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center -translate-y-1/2">
                  <img src={owlSvg} alt="Owl" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-hogwarts-gold/20 flex justify-between items-center shrink-0">
        <div className="text-[10px] text-white/70 font-nexa uppercase flex items-center gap-2">
          <span>Часть {index + 1}</span>
          <span className="text-hogwarts-gold/40">•</span>
          <span className="text-hogwarts-gold uppercase font-nexa">
            {segment.author || ownerName}
          </span>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(segment)}
              className="text-white/50 hover:text-hogwarts-gold transition-colors"
              title="Редактировать часть"
            >
              <Edit3 className="w-3 h-3 md:w-4 md:h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(segment.id)}
              disabled={isSaving}
              className="text-white/50 hover:text-red-500 transition-colors disabled:opacity-30"
              title="Удалить часть"
            >
              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const StoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useStore();

  const [story, setStory] = useState<Story | null>(null);
  const [segments, setSegments] = useState<StorySegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newSegments, setNewSegments] = useState<SegmentForm[]>([{ content: '', link: '', author: '' }]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthors, setEditAuthors] = useState('');
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [segmentEditContent, setSegmentEditContent] = useState('');
  const [segmentEditLink, setSegmentEditLink] = useState('');
  const [segmentEditAuthor, setSegmentEditAuthor] = useState('');

  const isOwner = !!user && !!story && story.user_id === user.id;

  const authorsList = [
    ...(story?.user_name ? [story.user_name] : []),
    ...(isEditing ? editAuthors : story?.authors || '')
      .split(',')
      .map(a => a.trim())
      .filter(a => a.length > 0 && a !== story?.user_name)
  ];

  useEffect(() => {
    const loadStory = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.stories.get(id);
        setStory(data);
        const ordered = (data.segments || []).slice().sort((a, b) => a.position - b.position);
        setSegments(ordered);
        setEditTitle(data.title);
        setEditAuthors(data.authors || '');
        // Initialize new segment with owner or first author
        const defaultAuthor = data.user_name || (data.authors || '').split(',')[0]?.trim() || '';
        setNewSegments([{ content: '', link: '', author: defaultAuthor }]);
      } catch (e) {
        setError('Не удалось загрузить сюжет.');
      } finally {
        setIsLoading(false);
      }
    };

    loadStory();
  }, [id]);

  const handleAddSegmentField = () => {
    const defaultAuthor = authorsList[0] || '';
    setNewSegments(prev => [...prev, { content: '', link: '', author: defaultAuthor }]);
  };

  const handleNewSegmentChange = (index: number, field: keyof SegmentForm, value: string) => {
    setNewSegments(prev => prev.map((seg, i) => (i === index ? { ...seg, [field]: value } : seg)));
  };

  const handleAppendSegments = async () => {
    if (!id || !user || !isOwner) return;
    const prepared = newSegments
      .map(seg => ({ 
        content: seg.content.trim(), 
        link: seg.link.trim(),
        author: seg.author.trim()
      }))
      .filter(seg => seg.content.length > 0);
    if (prepared.length === 0) return;
    try {
      setIsSaving(true);
      const updated = await api.stories.appendSegments(id, user.id, prepared);
      setStory(updated);
      setSegments((updated.segments || []).slice().sort((a, b) => a.position - b.position));
      const defaultAuthor = (updated.authors || '').split(',')[0]?.trim() || '';
      setNewSegments([{ content: '', link: '', author: defaultAuthor }]);
    } catch (e) {
      setError('Не удалось дополнить сюжет.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSegment = async (segmentId: string) => {
    if (!story || !user || !isOwner) return;
    const content = segmentEditContent.trim();
    if (!content) return;
    try {
      setIsSaving(true);
      const updatedSegments = segments.map(seg => 
        seg.id === segmentId ? { ...seg, content, link: segmentEditLink.trim(), author: segmentEditAuthor.trim() } : seg
      );
      const updated = await api.stories.update(story.id, {
        user_id: user.id,
        title: story.title,
        authors: story.authors,
        segments: updatedSegments.map(seg => ({ 
          content: seg.content, 
          link: seg.link || '',
          author: seg.author || ''
        })),
      });
      setStory(updated);
      setSegments((updated.segments || []).slice().sort((a, b) => a.position - b.position));
      setEditingSegmentId(null);
    } catch (e) {
      setError('Не удалось обновить часть сюжета.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSegment = async (segmentId: string) => {
    if (!story || !user || !isOwner) return;
    if (segments.length <= 1) {
      setError('Сюжет должен содержать хотя бы одну часть. Чтобы удалить весь сюжет, используйте иконку в заголовке.');
      return;
    }
    if (!window.confirm('Удалить эту часть сюжета?')) return;
    try {
      setIsSaving(true);
      const updatedSegments = segments.filter(seg => seg.id !== segmentId);
      const updated = await api.stories.update(story.id, {
        user_id: user.id,
        title: story.title,
        authors: story.authors,
        segments: updatedSegments.map(seg => ({ 
          content: seg.content, 
          link: seg.link || '',
          author: seg.author || ''
        })),
      });
      setStory(updated);
      setSegments((updated.segments || []).slice().sort((a, b) => a.position - b.position));
    } catch (e) {
      setError('Не удалось удалить часть сюжета.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!story || !user || !isOwner) return;
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) return;
    try {
      setIsSaving(true);
      const updated = await api.stories.update(story.id, {
        user_id: user.id,
        title: trimmedTitle,
        authors: editAuthors.trim(),
        segments: segments.map(seg => ({ 
          content: seg.content, 
          link: seg.link || '',
          author: seg.author || ''
        })),
      });
      setStory(updated);
      setEditTitle(updated.title);
      setEditAuthors(updated.authors || '');
      setIsEditing(false);
    } catch (e) {
      setError('Не удалось сохранить заголовок сюжета.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (!story) {
      setIsEditing(false);
      return;
    }
    setEditTitle(story.title);
    setEditAuthors(story.authors || '');
    setIsEditing(false);
  };

  const handleStartEditSegment = (segment: StorySegment) => {
     setIsEditing(false);
     setEditingSegmentId(segment.id);
     setSegmentEditContent(segment.content);
     setSegmentEditLink(segment.link || '');
     setSegmentEditAuthor(segment.author || '');
   };

  const handleDelete = async () => {
    if (!id || !user || !isOwner) return;
    if (!window.confirm('Вы уверены, что хотите полностью удалить этот сюжет?')) return;
    try {
      setIsDeleting(true);
      await api.stories.delete(id, user.id);
      navigate('/my-stories');
    } catch (e) {
      setError('Не удалось удалить сюжет.');
      setIsDeleting(false);
    }
  };

  const handleBack = () => {
    if (user && isOwner) {
      navigate('/my-stories');
    } else if (story?.user_name) {
      const username = story.user_name.replace(/\s+/g, '_');
      navigate(`/u/${username}/stories`);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 z-0">
        <img src={castleImg} alt="Hogwarts Castle" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60 z-10" />
      </div>

      <div className="relative z-20 min-h-screen flex flex-col">
        <div className="max-w-4xl mx-auto p-4 md:p-8 w-full mt-4 md:mt-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-white hover:text-hogwarts-gold mb-8 font-magical font-bold transition-colors font-serif"
          >
            <ArrowLeft className="w-5 h-5" />
            Назад
          </button>

          <div className="relative mb-8 md:mb-12">
            <img
              src={frameSvg}
              alt="Frame"
              className="absolute inset-0 w-full h-full object-fill z-0 pointer-events-none select-none hidden md:block [@media(orientation:landscape)]:block"
            />
            <div className="absolute inset-0 border-2 border-hogwarts-gold/50 bg-black/40 md:hidden [@media(orientation:landscape)]:hidden rounded-lg" />

            <div className="relative z-10 flex flex-col md:flex-row [@media(orientation:landscape)]:flex-row justify-between items-center gap-4 px-6 py-6 md:px-14 md:py-8 [@media(orientation:landscape)]:px-12 [@media(orientation:landscape)]:py-8">
              <div className="flex items-center gap-4 flex-1 text-center md:text-left [@media(orientation:landscape)]:text-left justify-center md:justify-start [@media(orientation:landscape)]:justify-start">
                <div className="flex items-center justify-center shrink-0">
                  <img
                    src={storyIcon}
                    alt="Сюжет"
                    className="w-12 h-12 md:w-16 md:h-16 object-contain select-none"
                  />
                </div>
                <div className="flex-1 w-full">
                  {isEditing ? (
                    <div className="flex flex-col gap-3 w-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-nexa text-hogwarts-gold/60 mb-1 uppercase">
                            Заголовок
                          </label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="w-full px-3 py-2 rounded border border-hogwarts-gold/50 bg-black/60 text-white font-seminaria text-lg md:text-2xl focus:outline-none focus:border-hogwarts-gold transition-colors"
                            placeholder="Заголовок сюжета"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-nexa text-hogwarts-gold/60 mb-1 uppercase">
                            Соавторы (через запятую)
                          </label>
                          <input
                            type="text"
                            value={editAuthors}
                            onChange={e => setEditAuthors(e.target.value)}
                            className="w-full px-3 py-2 rounded border border-hogwarts-gold/50 bg-black/60 text-white font-seminaria text-lg md:text-2xl focus:outline-none focus:border-hogwarts-gold transition-colors"
                            placeholder="Авторы..."
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveTitle}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-hogwarts-gold text-hogwarts-ink hover:bg-yellow-400 text-[10px] md:text-xs font-nexa uppercase tracking-wide transition-colors disabled:opacity-60"
                        >
                          <Check className="w-3 h-3" />
                          Сохранить
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/40 border border-hogwarts-gold/40 text-white hover:bg-black/60 text-[10px] md:text-xs font-nexa uppercase tracking-wide transition-colors disabled:opacity-60"
                        >
                          <X className="w-3 h-3" />
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl md:text-4xl [@media(orientation:landscape)]:text-4xl font-seminaria font-bold text-hogwarts-gold mb-2">
                        {story ? story.title : 'Сюжет'}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        {story?.user_name && (
                          <p className="text-base md:text-lg text-white font-century">
                            Автор: {story.user_name}
                          </p>
                        )}
                        {story?.authors && (
                          <>
                            <span className="text-hogwarts-gold/40">•</span>
                            <p className="text-sm md:text-base text-hogwarts-gold font-century italic">
                              Соавторы: {story.authors}
                            </p>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {isOwner && (
                <div className="flex items-center gap-2">
                  {!isEditing && (
                     <button
                       type="button"
                       onClick={() => {
                         setEditingSegmentId(null);
                         setIsEditing(true);
                       }}
                       className="inline-flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-black/40 border border-hogwarts-gold/70 text-hogwarts-gold hover:bg-hogwarts-gold hover:text-hogwarts-ink transition-colors"
                       title="Редактировать заголовок"
                     >
                       <Edit3 className="w-3 h-3 md:w-4 md:h-4" />
                     </button>
                   )}
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-black/40 border border-red-600 text-red-200 hover:bg-red-800/70 hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Удалить сюжет целиком"
                  >
                    <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded border border-red-500 bg-red-500/10 text-sm text-red-100 font-century">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-hogwarts-gold border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 font-magical text-hogwarts-ink font-serif">Свиток открывается...</p>
            </div>
          ) : !story ? (
            <div className="text-center py-12 bg-white/10 rounded-lg border-2 border-hogwarts-bronze/60 border-dashed">
              <p className="text-lg md:text-xl font-magical text-hogwarts-ink font-serif mb-2">
                Сюжет не найден.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-6 mb-10">
                {segments.map((segment, index) => (
                  <div key={segment.id} className="relative group">
                    {editingSegmentId === segment.id ? (
                      <div className="p-4 md:p-6 rounded-lg bg-black/40 border border-hogwarts-gold space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-nexa text-hogwarts-gold/60 mb-1 uppercase">
                              Автор этой части
                            </label>
                            <select
                              value={segmentEditAuthor}
                              onChange={e => setSegmentEditAuthor(e.target.value)}
                              className="w-full px-3 py-1.5 rounded border border-hogwarts-bronze/60 bg-black/30 text-white/70 font-century text-xs md:text-sm focus:outline-none focus:border-hogwarts-gold appearance-none"
                            >
                              {authorsList.length > 0 ? (
                                authorsList.map((a, i) => (
                                  <option key={i} value={a} className="bg-white text-hogwarts-red font-bold">{a}</option>
                                ))
                              ) : (
                                <option value="" className="bg-white text-hogwarts-red font-bold">Укажите соавторов в заголовке</option>
                              )}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-nexa text-hogwarts-gold/60 mb-1 uppercase">
                              Ссылка (необязательно)
                            </label>
                            <input
                              type="text"
                              value={segmentEditLink}
                              onChange={e => setSegmentEditLink(e.target.value)}
                              className="w-full px-3 py-1.5 rounded border border-hogwarts-gold/30 bg-black/40 text-white font-century text-xs md:text-sm focus:outline-none focus:border-hogwarts-gold transition-colors"
                              placeholder="Ссылка..."
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-nexa text-hogwarts-gold/60 mb-1 uppercase">
                            Текст
                          </label>
                          <textarea
                            value={segmentEditContent}
                            onChange={e => setSegmentEditContent(e.target.value)}
                            className="w-full px-3 py-2 rounded border border-hogwarts-gold/30 bg-black/40 text-white font-century text-sm md:text-base focus:outline-none focus:border-hogwarts-gold transition-colors resize-none"
                            rows={6}
                            placeholder="Текст сюжета..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateSegment(segment.id)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-hogwarts-gold text-hogwarts-ink hover:bg-yellow-400 text-xs font-nexa uppercase tracking-wide transition-colors disabled:opacity-60"
                          >
                            <Check className="w-4 h-4" />
                            Сохранить
                          </button>
                          <button
                            onClick={() => setEditingSegmentId(null)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-black/40 border border-hogwarts-gold/40 text-white hover:bg-black/60 text-xs font-nexa uppercase tracking-wide transition-colors disabled:opacity-60"
                          >
                            <X className="w-4 h-4" />
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <StorySegmentItem
                    segment={segment}
                    index={index}
                    isOwner={isOwner}
                    ownerName={story?.user_name || ''}
                    onEdit={handleStartEditSegment}
                    onDelete={handleDeleteSegment}
                    isSaving={isSaving}
                  />
                    )}
                  </div>
                ))}
              </div>

              {isOwner && (
                <div className="mb-16 bg-white/5 border border-hogwarts-gold/40 rounded-lg p-4 md:p-6">
                  <h3 className="text-lg md:text-xl font-seminaria text-hogwarts-gold mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Дополнить сюжет
                  </h3>

                  <div className="space-y-4">
                  {newSegments.map((segment, index) => (
                    <div
                      key={index}
                      className="border border-hogwarts-bronze/40 rounded-lg p-3 md:p-4 bg-black/30 space-y-3"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-nexa text-hogwarts-gold/60 mb-1 uppercase">
                            Автор этой части
                          </label>
                          <select
                            value={segment.author}
                            onChange={e => handleNewSegmentChange(index, 'author', e.target.value)}
                            className="w-full px-3 py-1.5 rounded border border-hogwarts-bronze/60 bg-black/30 text-white/70 font-century text-xs md:text-sm focus:outline-none focus:border-hogwarts-gold appearance-none"
                          >
                            {authorsList.length > 0 ? (
                              authorsList.map((a, i) => (
                                <option key={i} value={a} className="bg-white text-hogwarts-red font-bold">{a}</option>
                              ))
                            ) : (
                              <option value="" className="bg-white text-hogwarts-red font-bold">Укажите соавторов в заголовке</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-nexa text-hogwarts-gold/60 mb-1 uppercase">
                            Ссылка (необязательно)
                          </label>
                          <input
                            type="text"
                            value={segment.link}
                            onChange={e => handleNewSegmentChange(index, 'link', e.target.value)}
                            placeholder="https://..."
                            className="w-full px-3 py-1.5 rounded border border-hogwarts-bronze/60 bg-black/30 text-white font-century text-xs md:text-sm focus:outline-none focus:border-hogwarts-gold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-nexa text-hogwarts-gold/60 mb-1 uppercase">
                          Текст
                        </label>
                        <textarea
                          value={segment.content}
                          onChange={e => handleNewSegmentChange(index, 'content', e.target.value)}
                          placeholder="Текст части сюжета..."
                          rows={4}
                          className="w-full px-3 py-2 rounded border border-hogwarts-bronze/60 bg-black/30 text-white font-century text-sm md:text-base resize-none focus:outline-none focus:border-hogwarts-gold"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                  <div className="flex flex-wrap gap-3 mt-4">
                    <button
                      type="button"
                      onClick={handleAddSegmentField}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-hogwarts-gold/60 text-hogwarts-gold hover:bg-hogwarts-gold hover:text-hogwarts-ink text-xs md:text-sm font-nexa uppercase tracking-wide transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Добавить ещё часть
                    </button>
                    <button
                      type="button"
                      onClick={handleAppendSegments}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-hogwarts-gold text-hogwarts-ink hover:bg-yellow-400 text-xs md:text-sm font-nexa uppercase tracking-wide transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Сохранить дополнение
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
