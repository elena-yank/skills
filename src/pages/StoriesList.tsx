import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Story } from '../lib/api/types';
import castleImg from '../assets/castle.png';
import frameSvg from '../assets/frame.svg';
import scrollImg from '../assets/scroll.png';
import storyIcon from '../assets/story.svg';
import { useStore } from '../store';
import { Plus, ArrowLeft, Trash2, ExternalLink } from 'lucide-react';
import { inflectName } from '../lib/utils/inflection';

interface SegmentForm {
  content: string;
  link: string;
  author: string;
}

export const StoriesList: React.FC = () => {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  const { user } = useStore();

  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetUserName, setTargetUserName] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [segments, setSegments] = useState<SegmentForm[]>([{ content: '', link: '', author: '' }]);
  const [isSaving, setIsSaving] = useState(false);

  const isMyStories = !username;
  const isOwner = isMyStories || (!!user && !!targetUserId && user.id === targetUserId);

  const ownerName = isMyStories ? user?.name : targetUserName;

  // Parse authors string into array for selection
  const authorsList = [
    ...(ownerName ? [ownerName] : []),
    ...authors
      .split(',')
      .map(a => a.trim())
      .filter(a => a.length > 0 && a !== ownerName)
  ];

  useEffect(() => {
    const loadUserAndStories = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let userId = targetUserId;
        let userName = targetUserName;

        if (!userId) {
          if (username) {
            const decodedName = username.replace(/_/g, ' ');
            const fetchedUser = await api.auth.getUserByName(decodedName);
            if (!fetchedUser) {
              setError('Волшебник не найден.');
              setIsLoading(false);
              return;
            }
            userId = fetchedUser.id;
            userName = fetchedUser.name;
          } else {
            if (!user) {
              setError('Необходимо войти, чтобы просматривать свои сюжеты.');
              setIsLoading(false);
              return;
            }
            userId = user.id;
            userName = user.name;
          }
          setTargetUserId(userId);
          setTargetUserName(userName || null);
          // Set default author if creating my stories
          if (userName && authors === '') {
            setAuthors(userName);
            setSegments(prev => prev.map(seg => ({ ...seg, author: userName })));
          }
        }

        if (!userId) {
          setError('Не удалось определить волшебника.');
          setIsLoading(false);
          return;
        }

        const data = await api.stories.list(userId);
        setStories(data || []);
      } catch (e) {
        setError('Не удалось загрузить сюжеты.');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserAndStories();
  }, [username, user, targetUserId, targetUserName]);

  const handleAddSegment = () => {
    // Default author for new segment is the first one in the list or the user's name
    const defaultAuthor = authorsList.length > 0 ? authorsList[0] : (user?.name || '');
    setSegments(prev => [...prev, { content: '', link: '', author: defaultAuthor }]);
  };

  const handleSegmentChange = (index: number, field: keyof SegmentForm, value: string) => {
    setSegments(prev => prev.map((seg, i) => (i === index ? { ...seg, [field]: value } : seg)));
  };

  const handleCreate = async () => {
    if (!user || !targetUserId || user.id !== targetUserId) return;
    const trimmedTitle = title.trim();
    const preparedSegments = segments
      .map(seg => ({ 
        content: seg.content.trim(), 
        link: seg.link.trim(),
        author: seg.author.trim()
      }))
      .filter(seg => seg.content.length > 0);

    if (!trimmedTitle || preparedSegments.length === 0) {
      return;
    }

    try {
      setIsSaving(true);
      const created = await api.stories.create({
        user_id: user.id,
        title: trimmedTitle,
        authors: authors.trim(),
        segments: preparedSegments,
      });
      setStories(prev => [created, ...prev]);
      setTitle('');
      setAuthors(user.name || '');
      setSegments([{ content: '', link: '', author: user.name || '' }]);
    } catch (e) {
      setError('Не удалось сохранить сюжет.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !isOwner) return;
    const original = stories;
    setStories(prev => prev.filter(s => s.id !== id));
    try {
      await api.stories.delete(id, user.id);
    } catch (e) {
      setStories(original);
      setError('Не удалось удалить сюжет.');
    }
  };

  const handleOpenStory = (id: string) => {
    navigate(`/stories/${id}`);
  };

  const displayName = isMyStories ? user?.name || 'Моя история' : targetUserName || username?.replace(/_/g, ' ');

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 z-0">
        <img src={castleImg} alt="Hogwarts Castle" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60 z-10" />
      </div>

      <div className="relative z-20 min-h-screen flex flex-col">
        <div className="max-w-4xl mx-auto p-4 md:p-8 w-full mt-4 md:mt-8">
          <button
            onClick={() => navigate(isMyStories ? '/' : `/u/${username}`)}
            className="flex items-center gap-2 text-white hover:text-hogwarts-gold mb-8 font-magical font-bold transition-colors font-serif"
          >
            <ArrowLeft className="w-5 h-5" />
            {isMyStories ? 'Вернуться в кабинет' : 'Назад к профилю'}
          </button>

          <div className="relative mb-8 md:mb-12">
            <img
              src={frameSvg}
              alt="Frame"
              className="absolute inset-0 w-full h-full object-fill z-0 pointer-events-none select-none hidden md:block [@media(orientation:landscape)]:block"
            />
            <div className="absolute inset-0 border-2 border-hogwarts-gold/50 bg-black/40 md:hidden [@media(orientation:landscape)]:hidden rounded-lg" />

            <div className="relative z-10 flex flex-col md:flex-row [@media(orientation:landscape)]:flex-row items-center gap-4 px-6 py-6 md:px-14 md:py-8 [@media(orientation:landscape)]:px-12 [@media(orientation:landscape)]:py-8">
              <div className="flex items-center gap-4 flex-1 text-center md:text-left [@media(orientation:landscape)]:text-left justify-center md:justify-start [@media(orientation:landscape)]:justify-start">
                <div className="flex items-center justify-center shrink-0">
                  <img
                    src={storyIcon}
                    alt="Сюжет"
                    className="w-12 h-12 md:w-16 md:h-16 object-contain select-none"
                  />
                </div>
                <div>
                  <h2 className="text-xl md:text-4xl [@media(orientation:landscape)]:text-4xl font-seminaria font-bold text-hogwarts-gold mb-1">
                    {isMyStories ? 'Моя история' : `Сюжеты ${inflectName(displayName || '')}`}
                  </h2>
                  <p className="text-base md:text-xl [@media(orientation:landscape)]:text-xl text-white font-century">
                    Заголовки всех сохранённых сюжетов
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded border border-red-500 bg-red-500/10 text-sm text-red-100 font-century">
              {error}
            </div>
          )}

          {isOwner && (
            <div className="mb-10 bg-white/5 border border-hogwarts-gold/40 rounded-lg p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-seminaria text-hogwarts-gold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Добавить новый сюжет
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-nexa text-hogwarts-gold/80 mb-1 uppercase tracking-wider">
                      Заголовок сюжета
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Название истории..."
                      className="w-full px-3 py-2 rounded border border-hogwarts-bronze/60 bg-black/40 text-white font-century text-sm md:text-base focus:outline-none focus:border-hogwarts-gold transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-nexa text-hogwarts-gold/80 mb-1 uppercase tracking-wider">
                      Соавторы (через запятую)
                    </label>
                    <input
                      type="text"
                      value={authors}
                      onChange={e => setAuthors(e.target.value)}
                      placeholder="Амелия Уизли, Бетти Марлоу..."
                      className="w-full px-3 py-2 rounded border border-hogwarts-bronze/60 bg-black/40 text-white font-century text-sm md:text-base focus:outline-none focus:border-hogwarts-gold transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {segments.map((segment, index) => (
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
                            onChange={e => handleSegmentChange(index, 'author', e.target.value)}
                            className="w-full px-3 py-1.5 rounded border border-hogwarts-bronze/60 bg-black/30 text-white/70 font-century text-xs md:text-sm focus:outline-none focus:border-hogwarts-gold appearance-none"
                          >
                            {authorsList.length > 0 ? (
                              authorsList.map((a, i) => (
                                <option key={i} value={a} className="bg-white text-hogwarts-red font-bold">{a}</option>
                              ))
                            ) : (
                              <option value="" className="bg-white text-hogwarts-red font-bold">Укажите соавторов выше</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-nexa text-hogwarts-gold/60 mb-1 uppercase">
                            Ссылка на пост (необязательно)
                          </label>
                          <input
                            type="text"
                            value={segment.link}
                            onChange={e => handleSegmentChange(index, 'link', e.target.value)}
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
                          onChange={e => handleSegmentChange(index, 'content', e.target.value)}
                          placeholder="Напишите здесь часть вашего сюжета..."
                          rows={4}
                          className="w-full px-3 py-2 rounded border border-hogwarts-bronze/60 bg-black/30 text-white font-century text-sm md:text-base resize-none focus:outline-none focus:border-hogwarts-gold"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleAddSegment}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-hogwarts-gold/60 text-hogwarts-gold hover:bg-hogwarts-gold hover:text-hogwarts-ink text-xs md:text-sm font-nexa uppercase tracking-wide transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить сюжет
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-hogwarts-gold text-hogwarts-ink hover:bg-yellow-400 text-xs md:text-sm font-nexa uppercase tracking-wide transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-hogwarts-gold border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 font-magical text-hogwarts-ink font-serif">Загружаем сюжеты...</p>
            </div>
          ) : stories.length === 0 ? (
            <div className="text-center py-12 bg-white/10 rounded-lg border-2 border-hogwarts-bronze/60 border-dashed">
              <p className="text-lg md:text-xl font-magical text-white font-serif mb-4">
                Пока нет ни одного сохранённого сюжета.
              </p>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-hogwarts-gold text-hogwarts-ink hover:bg-yellow-400 text-xs md:text-sm font-nexa uppercase tracking-wide transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить первый сюжет
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {stories.map(story => (
                <div
                  key={story.id}
                  className="relative p-4 md:p-6 rounded-lg shadow-md bg-black/40 border border-hogwarts-gold/40 cursor-pointer hover:bg-black/60 transition-colors"
                  onClick={() => handleOpenStory(story.id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg md:text-2xl font-seminaria font-bold text-hogwarts-gold mb-1">
                        {story.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs md:text-sm text-white font-century flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          Открыть сюжет
                        </p>
                        {story.authors && (
                          <>
                            <span className="text-hogwarts-gold/40">•</span>
                            <p className="text-xs md:text-sm text-hogwarts-gold font-century italic">
                              Авторы: {story.authors}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleDelete(story.id);
                        }}
                        className="p-2 rounded-full bg-black/40 hover:bg-black/70 text-hogwarts-gold hover:text-red-300 transition-colors"
                        title="Удалить сюжет"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
