import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, Scroll, Calendar, Feather, ChevronDown, ChevronUp, Trash2, Check, X, User as UserIcon } from 'lucide-react';
import { useStore } from '../store';
import castleImg from '../assets/castle.png';
import frameSvg from '../assets/frame.svg';
import { PracticeLog } from '../lib/api/types';

interface Log extends PracticeLog {
  // PracticeLog already has status and wizards from my update to types.ts
}

const LogItem: React.FC<{ 
    log: Log; 
    onDelete: (id: string) => void; 
    isOwner: boolean;
    onUpdateStatus: (id: string, status: 'approved' | 'rejected') => void;
}> = ({ log, onDelete, isOwner, onUpdateStatus }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { user } = useStore();
  const isAdmin = user?.role === 'admin';
  
  // Split content into paragraphs
  const paragraphs = log.content.split('\n').filter(p => p.trim().length > 0);
  const firstParagraph = paragraphs[0] || '';

  const handleDelete = () => {
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(log.id);
    setShowConfirm(false);
  };

  return (
    <article 
      className="bg-white p-8 rounded-lg shadow-md border-2 border-hogwarts-bronze relative overflow-hidden"
    >
      {/* Overlays for User Status */}
      {!isAdmin && log.status === 'pending' && (
          <div className="absolute inset-0 bg-white/60 z-30 flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
             <div className="bg-[#D3A625] text-hogwarts-red px-6 py-3 rounded-lg shadow-xl font-magical font-bold text-xl border-2 border-hogwarts-red pointer-events-auto z-40 opacity-100">
                Текст ожидает проверку
             </div>
          </div>
      )}
      {!isAdmin && log.status === 'rejected' && (
          <div className="absolute inset-0 bg-red-100/80 z-30 flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
             <div className="bg-hogwarts-red text-white px-6 py-3 rounded-lg shadow-xl font-magical text-xl border-2 border-hogwarts-gold pointer-events-auto z-40 opacity-100">
                Ваш текст был отклонён, обратитесь к администрации
             </div>
          </div>
      )}

      {showConfirm && (
        <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center rounded-lg p-8 animate-in fade-in duration-200">
            <Trash2 className="w-12 h-12 text-hogwarts-red mb-4" />
            <p className="text-xl font-magical text-center text-hogwarts-ink mb-2">{user?.name}, ты действительно хочешь удалить этот пост?</p>
            <p className="text-sm text-hogwarts-ink/60 text-center mb-6 max-w-sm">
                Даже заклинание репАро не сможет восстановить его!
            </p>
            <div className="flex gap-4">
                <button
                    onClick={() => setShowConfirm(false)}
                    className="px-4 py-2 rounded border border-hogwarts-bronze text-hogwarts-ink hover:bg-hogwarts-parchment transition-colors font-serif"
                >
                    Оставить
                </button>
                <button
                    onClick={confirmDelete}
                    className="px-4 py-2 rounded bg-hogwarts-red text-hogwarts-gold font-bold hover:bg-red-900 transition-colors shadow-md border border-hogwarts-gold font-serif"
                >
                    Удалить
                </button>
            </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-6 border-b border-hogwarts-bronze pb-4 relative z-10">
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-hogwarts-ink/70 font-bold font-serif">
            <Calendar className="w-4 h-4" />
            {new Date(log.created_at).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}
            {log.post_link && (
                <a 
                href={log.post_link.startsWith('http') ? log.post_link : `https://${log.post_link}`}
                target="_blank" 
                rel="noopener noreferrer" 
                className="ml-4 flex items-center gap-1 text-hogwarts-blue hover:text-hogwarts-red transition-colors"
                title="Открыть ссылку"
                >
                <Feather className="w-4 h-4" />
                Ссылка
                </a>
            )}
            </div>
            {isAdmin && log.wizards?.name && (
                <div className="flex items-center gap-2 text-hogwarts-purple font-magical text-lg">
                    <UserIcon className="w-4 h-4" />
                    {log.wizards.name}
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-4">
            <div className="bg-hogwarts-green/10 text-hogwarts-green px-3 py-1 rounded-full text-sm font-bold border border-hogwarts-green/30 font-serif">
            {log.word_count} слов
            </div>
            {/* Delete button available for owner or admin (if we wanted admin to delete, but sticking to owner per prompt mostly, though admin usually can) */}
            {(isOwner || isAdmin) && (
                <button 
                    onClick={handleDelete}
                    className="text-hogwarts-ink/50 hover:text-red-600 transition-colors p-1 relative z-50"
                    title="Уничтожить свиток"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            )}
        </div>
      </div>
      
      <div className="prose prose-stone max-w-none font-body text-lg leading-relaxed text-hogwarts-ink font-serif relative z-10">
        {isExpanded ? (
          paragraphs.map((paragraph, idx) => (
            <p key={idx} className="mb-4">{paragraph}</p>
          ))
        ) : (
          <div>
            <p className="mb-4 line-clamp-3">{firstParagraph}</p>
            {!isExpanded && paragraphs.length > 0 && (
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/90 to-transparent pointer-events-none rounded-b-lg" />
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-between items-center relative z-10">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-hogwarts-blue hover:text-hogwarts-red font-bold font-serif transition-colors px-4 py-2 rounded-full hover:bg-hogwarts-blue/5"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Свернуть
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Развернуть
            </>
          )}
        </button>

        {isAdmin && log.status === 'pending' && (
            <div className="flex gap-3">
                <button
                    onClick={() => onUpdateStatus(log.id, 'rejected')}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors font-bold font-serif"
                >
                    <X className="w-4 h-4" />
                    Отклонить
                </button>
                <button
                    onClick={() => onUpdateStatus(log.id, 'approved')}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg bg-hogwarts-green text-hogwarts-gold shadow-md hover:bg-green-900 transition-colors font-bold font-serif border border-hogwarts-gold"
                >
                    <Check className="w-4 h-4" />
                    Одобрить
                </button>
            </div>
        )}
         {isAdmin && log.status === 'approved' && (
            <div className="text-hogwarts-green font-bold flex items-center gap-2 px-4 py-2">
                <Check className="w-5 h-5" /> Одобрено
            </div>
        )}
         {isAdmin && log.status === 'rejected' && (
            <div className="text-hogwarts-red font-bold flex items-center gap-2 px-4 py-2">
                <X className="w-5 h-5" /> Отклонено
            </div>
        )}
      </div>
    </article>
  );
};

export const SkillDetail: React.FC = () => {
  const { skillName, username } = useParams<{ skillName: string; username?: string }>();
  const [searchParams] = useSearchParams();
  const forcePersonalView = searchParams.get('view') === 'personal';
  
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'pending' | 'approved'>('pending'); // For admin
  const navigate = useNavigate();
  const { user, deletePracticeLog, updateLogStatus } = useStore();
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' && !forcePersonalView;

  useEffect(() => {
    const fetchLogs = async () => {
      // If we have a username, we can fetch logs for that user even if not logged in.
      // If no username, we need the logged-in user.
      if (!skillName || (!user && !username)) return;

      setIsLoading(true);
      try {
        if (isAdmin) {
             // Admin fetching logs
             // If viewing pending, fetch pending. If viewing approved, fetch approved.
             // Prompt says: "Есть также кнопка 'Уже одобренные', где она может посмотреть в принципе все посты всех пользователей, которые были одобрены"
             const status = viewMode === 'pending' ? 'pending' : 'approved';
             const data = await api.logs.listAll(decodeURIComponent(skillName), status);
             setLogs(data || []);
        } else {
            // User fetching logs
            let userIdToFetch = user?.id || '';

            if (username) {
                // Fetch user by username if provided (Public Profile view)
                 const userData = await api.auth.getUserByName(username.replace(/_/g, ' '));
                 if (!userData) throw new Error('Wizard not found');
                 userIdToFetch = userData.id;
            }
            
            if (!userIdToFetch) {
                // Should not happen due to initial check, but safety
                setLogs([]);
                return;
            }

            setTargetUserId(userIdToFetch);

            const data = await api.logs.list(userIdToFetch, decodeURIComponent(skillName));
            setLogs(data || []);
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [user, skillName, username, viewMode, isAdmin]); // Re-fetch when viewMode changes

  const handleDeleteLog = async (id: string) => {
    try {
        await deletePracticeLog(id);
        // Remove locally to update UI immediately
        setLogs(logs.filter(log => log.id !== id));
    } catch (e) {
        console.error("Failed to delete log", e);
        alert("Не удалось уничтожить свиток. Магия дала сбой.");
    }
  };

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
        await updateLogStatus(id, status);
        // Remove locally from the current list since the status changed and we filter by status
        setLogs(logs.filter(log => log.id !== id));
    } catch (e) {
        console.error("Failed to update status", e);
        alert("Не удалось обновить статус свитка.");
    }
  };

  const decodedSkillName = decodeURIComponent(skillName || '');
  const isOwner = user?.id === targetUserId;

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <img 
          src={castleImg} 
          alt="Hogwarts Castle" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60 z-10"></div>
      </div>

      <div className="relative z-20 max-w-4xl mx-auto p-8">
        <button
          onClick={() => username ? navigate(`/u/${username}`) : navigate('/')}
          className="flex items-center gap-2 text-white hover:text-hogwarts-gold mb-8 font-magical font-bold transition-colors font-serif"
        >
          <ArrowLeft className="w-5 h-5" />
          {username ? 'Вернуться к профилю' : 'Вернуться в кабинет'}
        </button>

        <div className="relative mb-12">
          <img
            src={frameSvg}
            alt="Frame"
            className="absolute inset-0 w-full h-full object-fill z-0 pointer-events-none select-none"
          />
          <div className="relative z-10 flex justify-between items-start px-12 py-8">
            <div>
                <h1 className="text-4xl text-hogwarts-gold font-seminaria font-normal flex items-center gap-4">
                    <Feather className="w-12 h-12 shrink-0" />
                    <div className="flex flex-col">
                        <span>{decodedSkillName}</span>
                        <span className="text-white text-lg font-century mt-1">
                            {isAdmin ? (viewMode === 'pending' ? 'Ожидают проверки' : 'Архив одобренных') : 'История практики'}
                        </span>
                    </div>
                </h1>
            </div>
            {isAdmin && (
                <button
                    onClick={() => setViewMode(viewMode === 'pending' ? 'approved' : 'pending')}
                    className="px-6 py-2 bg-hogwarts-blue text-white rounded-lg hover:bg-blue-900 transition-colors font-normal shadow-lg border-2 border-hogwarts-gold font-century"
                >
                    {viewMode === 'pending' ? 'Уже одобренные' : 'На проверку'}
                </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-hogwarts-red border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 font-magical text-hogwarts-ink font-serif">Изучаем архивы...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 bg-white/50 rounded-lg border-2 border-hogwarts-bronze border-dashed">
            <Scroll className="w-16 h-16 mx-auto text-hogwarts-silver mb-4" />
            <p className="text-xl font-magical text-hogwarts-ink font-serif">
                {isAdmin 
                    ? (viewMode === 'pending' ? 'Все свитки проверены!' : 'Архив пуст.') 
                    : 'Пока нет записей.'}
            </p>
            {!isAdmin && isOwner && (
                <p className="text-hogwarts-ink/70 font-serif">Вернитесь в личный кабинет, чтобы начать практику.</p>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {logs.map((log) => (
              <LogItem 
                key={log.id} 
                log={log} 
                onDelete={handleDeleteLog}
                isOwner={isOwner}
                onUpdateStatus={handleUpdateStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
