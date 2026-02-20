import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Story, StorySegment } from '../lib/api/types';
import castleImg from '../assets/castle.png';
import frameSvg from '../assets/frame.svg';
import storyIcon from '../assets/story.svg';
import { useStore } from '../store';
import { ArrowLeft, Plus, ExternalLink, Trash2, Edit3 } from 'lucide-react';

interface SegmentForm {
  content: string;
  link: string;
}

export const StoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useStore();

  const [story, setStory] = useState<Story | null>(null);
  const [segments, setSegments] = useState<StorySegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newSegments, setNewSegments] = useState<SegmentForm[]>([{ content: '', link: '' }]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSegments, setEditSegments] = useState<SegmentForm[]>([]);

  const isOwner = !!user && !!story && story.user_id === user.id;

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
        setEditSegments(ordered.map(seg => ({ content: seg.content, link: seg.link || '' })));
      } catch (e) {
        setError('Не удалось загрузить сюжет.');
      } finally {
        setIsLoading(false);
      }
    };

    loadStory();
  }, [id]);

  const handleAddSegmentField = () => {
    setNewSegments(prev => [...prev, { content: '', link: '' }]);
  };

  const handleNewSegmentChange = (index: number, field: keyof SegmentForm, value: string) => {
    setNewSegments(prev => prev.map((seg, i) => (i === index ? { ...seg, [field]: value } : seg)));
  };

  const handleAppendSegments = async () => {
    if (!id || !user || !isOwner) return;
    const prepared = newSegments
      .map(seg => ({ content: seg.content.trim(), link: seg.link.trim() }))
      .filter(seg => seg.content.length > 0);
    if (prepared.length === 0) return;
    try {
      setIsSaving(true);
      const updated = await api.stories.appendSegments(id, user.id, prepared);
      setStory(updated);
      setSegments((updated.segments || []).slice().sort((a, b) => a.position - b.position));
      setNewSegments([{ content: '', link: '' }]);
    } catch (e) {
      setError('Не удалось дополнить сюжет.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSegmentChange = (index: number, field: keyof SegmentForm, value: string) => {
    setEditSegments(prev => prev.map((seg, i) => (i === index ? { ...seg, [field]: value } : seg)));
  };

  const handleAddEditSegment = () => {
    setEditSegments(prev => [...prev, { content: '', link: '' }]);
  };

  const handleRemoveEditSegment = (index: number) => {
    setEditSegments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async () => {
    if (!story || !user || !isOwner) return;
    const trimmedTitle = editTitle.trim();
    const prepared = editSegments
      .map(seg => ({ content: seg.content.trim(), link: seg.link.trim() }))
      .filter(seg => seg.content.length > 0);
    if (!trimmedTitle || prepared.length === 0) {
      return;
    }
    try {
      setIsSaving(true);
      const updated = await api.stories.update(story.id, {
        user_id: user.id,
        title: trimmedTitle,
        segments: prepared,
      });
      const ordered = (updated.segments || []).slice().sort((a, b) => a.position - b.position);
      setStory(updated);
      setSegments(ordered);
      setEditTitle(updated.title);
      setEditSegments(ordered.map(seg => ({ content: seg.content, link: seg.link || '' })));
      setIsEditing(false);
    } catch (e) {
      setError('Не удалось сохранить изменения сюжета.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (!story || !segments.length) {
      setIsEditing(false);
      return;
    }
    setEditTitle(story.title);
    setEditSegments(segments.map(seg => ({ content: seg.content, link: seg.link || '' })));
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!id || !user || !isOwner) return;
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
                <div>
                  <h2 className="text-xl md:text-4xl [@media(orientation:landscape)]:text-4xl font-seminaria font-bold text-hogwarts-gold mb-2">
                    {story ? story.title : 'Сюжет'}
                  </h2>
                  {story?.user_name && (
                    <p className="text-base md:text-lg text-white font-century">
                      Автор: {story.user_name}
                    </p>
                  )}
                </div>
              </div>

              {isOwner && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(prev => !prev)}
                    className="inline-flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-black/40 border border-hogwarts-gold/70 text-hogwarts-gold hover:bg-hogwarts-gold hover:text-hogwarts-ink transition-colors"
                    title={isEditing ? 'Отменить редактирование' : 'Редактировать сюжет'}
                  >
                    <Edit3 className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-black/40 border border-red-600 text-red-200 hover:bg-red-800/70 hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Удалить сюжет"
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
                  <div
                    key={segment.id}
                    className="relative p-4 md:p-6 rounded-lg shadow-md bg-white/5 border border-hogwarts-gold/40"
                  >
                    <div className="space-y-3">
                      {segment.link && (
                        <a
                          href={segment.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs md:text-sm text-hogwarts-blue/90 underline decoration-hogwarts-gold underline-offset-4 font-century"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {segment.link}
                        </a>
                      )}
                      <div className="text-sm md:text-base text-white font-century whitespace-pre-wrap leading-relaxed">
                        {segment.content}
                      </div>
                      <div className="text-[10px] text-white/70 font-nexa uppercase">
                        Часть {index + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {isOwner && (
                <>
                  {isEditing ? (
                    <div className="mb-16 bg-white/5 border border-hogwarts-gold/40 rounded-lg p-4 md:p-6">
                      <h3 className="text-lg md:text-xl font-seminaria text-hogwarts-gold mb-4 flex items-center gap-2">
                        <Edit3 className="w-5 h-5" />
                        Редактировать сюжет
                      </h3>

                      <div className="space-y-4">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          placeholder="Заголовок сюжета"
                          className="w-full px-3 py-2 rounded border border-hogwarts-bronze/60 bg-black/40 text-white font-century text-sm md:text-base mb-2"
                        />
                        {editSegments.map((segment, index) => (
                          <div
                            key={index}
                            className="border border-hogwarts-bronze/40 rounded-lg p-3 md:p-4 bg-black/30 space-y-2"
                          >
                            <input
                              type="text"
                              value={segment.link}
                              onChange={e => handleEditSegmentChange(index, 'link', e.target.value)}
                              placeholder="Ссылка (необязательно)"
                              className="w-full px-3 py-2 rounded border border-hogwarts-bronze/60 bg-black/30 text-white font-century text-xs md:text-sm"
                            />
                            <textarea
                              value={segment.content}
                              onChange={e => handleEditSegmentChange(index, 'content', e.target.value)}
                              placeholder="Текст части сюжета"
                              rows={4}
                              className="w-full px-3 py-2 rounded border border-hogwarts-bronze/60 bg-black/30 text-white font-century text-sm md:text-base resize-none"
                            />
                            {editSegments.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveEditSegment(index)}
                                className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full border border-red-500 text-red-200 hover:bg-red-700/60 text-[11px] font-nexa uppercase tracking-wide transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                Удалить часть
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-3 mt-4">
                        <button
                          type="button"
                          onClick={handleAddEditSegment}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-hogwarts-gold/60 text-hogwarts-gold hover:bg-hogwarts-gold hover:text-hogwarts-ink text-xs md:text-sm font-nexa uppercase tracking-wide transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Добавить часть
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={isSaving}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-hogwarts-gold text-hogwarts-ink hover:bg-yellow-400 text-xs md:text-sm font-nexa uppercase tracking-wide transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Сохранить изменения
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-hogwarts-bronze/60 text-white hover:bg-black/70 text-xs md:text-sm font-nexa uppercase tracking-wide transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-16 bg-white/5 border border-hogwarts-gold/40 rounded-lg p-4 md:p-6">
                      <h3 className="text-lg md:text-xl font-seminaria text-hogwarts-gold mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Дополнить сюжет
                      </h3>

                      <div className="space-y-4">
                        {newSegments.map((segment, index) => (
                          <div
                            key={index}
                            className="border border-hogwarts-bronze/40 rounded-lg p-3 md:p-4 bg-black/30 space-y-2"
                          >
                            <input
                              type="text"
                              value={segment.link}
                              onChange={e => handleNewSegmentChange(index, 'link', e.target.value)}
                              placeholder="Ссылка (необязательно)"
                              className="w-full px-3 py-2 rounded border border-hogwarts-bronze/60 bg-black/30 text-white font-century text-xs md:text-sm"
                            />
                            <textarea
                              value={segment.content}
                              onChange={e => handleNewSegmentChange(index, 'content', e.target.value)}
                              placeholder="Текст сюжета"
                              rows={4}
                              className="w-full px-3 py-2 rounded border border-hogwarts-bronze/60 bg-black/30 text-white font-century text-sm md:text-base resize-none"
                            />
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
