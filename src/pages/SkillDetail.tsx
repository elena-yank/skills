import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, Scroll, Calendar, Feather, ChevronDown, ChevronUp, Trash2, Check, X, User as UserIcon, ArrowDown, ArrowUp, GraduationCap } from 'lucide-react';
import { useStore } from '../store';
import castleImg from '../assets/castle.png';
import frameSvg from '../assets/frame.svg';
import { PracticeLog } from '../lib/api/types';
import { ImageModal } from '../components/ImageModal';
import transgressionSvg from '../assets/transgression.svg';
import patronusGoldSvg from '../assets/patronus_gold.svg';
import nonverbalGoldSvg from '../assets/nonverbal-gold.svg';
import nowandGoldSvg from '../assets/nowand-gold.svg';
import mortGoldSvg from '../assets/mort-gold.svg';
import animaGoldSvg from '../assets/anima-gold.svg';
import artifactsGoldSvg from '../assets/artifacts-gold.svg';
import spaceSvg from '../assets/space.svg';

interface Log extends PracticeLog {
  // PracticeLog already has status and wizards from my update to types.ts
}

const LogItem: React.FC<{ 
    log: Log; 
    onDelete: (id: string) => void; 
    isOwner: boolean;
    onUpdateStatus: (id: string, status: 'approved' | 'rejected' | 'exam_passed') => void;
}> = ({ log, onDelete, isOwner, onUpdateStatus }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const { user } = useStore();
  
  const isGlobalAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator' && user.managed_skills?.includes(log.skill_name);
  const canModerate = isGlobalAdmin || isModerator;
  
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
      className="bg-white p-4 md:p-8 rounded-lg shadow-md border-2 border-hogwarts-bronze relative overflow-hidden"
    >
      {/* Overlays for User Status */}
      {!canModerate && log.status === 'pending' && (
          <div className="absolute inset-0 bg-white/60 z-30 flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
             <div className="bg-[#D3A625] text-hogwarts-red px-6 py-3 rounded-lg shadow-xl font-magical font-bold text-xl border-2 border-hogwarts-red pointer-events-auto z-40 opacity-100 text-center mx-4">
                {log.type === 'exam' ? 'Экзаменационная работа ожидает проверки' : 'Текст ожидает проверку'}
             </div>
          </div>
      )}
      {!canModerate && log.status === 'rejected' && (
          <div className="absolute inset-0 bg-red-100/80 z-30 flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
             <div className="bg-hogwarts-red text-white px-6 py-3 rounded-lg shadow-xl font-magical text-xl border-2 border-hogwarts-gold pointer-events-auto z-40 opacity-100 text-center mx-4">
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

      <div className="flex flex-col md:flex-row justify-between items-start mb-6 border-b border-hogwarts-bronze pb-4 relative z-10 gap-4 md:gap-0">
        <div className="flex flex-col gap-1 w-full md:w-auto">
            <div className="flex flex-wrap items-center gap-2 text-hogwarts-ink/70 font-bold font-serif">
            {log.type === 'exam' && (
                <span className="bg-hogwarts-purple text-white px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                    Экзамен
                </span>
            )}
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
                className="ml-0 md:ml-4 flex items-center gap-1 text-hogwarts-blue hover:text-hogwarts-red transition-colors w-full md:w-auto mt-2 md:mt-0"
                title="Открыть ссылку"
                >
                <Feather className="w-4 h-4" />
                Ссылка
                </a>
            )}
            </div>
            {log.wizards?.name && (
                <div className="flex items-center gap-2 text-hogwarts-purple font-magical text-lg mt-2 md:mt-0">
                    {log.wizards.avatar_url ? (
                        <>
                            <img 
                                src={log.wizards.avatar_url} 
                                alt={log.wizards.name} 
                                className="w-8 h-8 rounded-full border border-hogwarts-gold object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setShowAvatarModal(true)}
                            />
                            <ImageModal 
                                isOpen={showAvatarModal}
                                onClose={() => setShowAvatarModal(false)}
                                imageUrl={log.wizards.avatar_url}
                                altText={log.wizards.name}
                            />
                        </>
                    ) : (
                        <UserIcon className="w-4 h-4" />
                    )}
                    {log.wizards.name}
                </div>
            )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto">
            {log.type === 'application' && (
                <div className="bg-hogwarts-green/10 text-hogwarts-green px-3 py-1 rounded-full text-sm font-bold border border-hogwarts-green/30 font-serif">
                    Заявка на освоение
                </div>
            )}
            {log.type === 'exam' && (
                <div className="bg-hogwarts-purple/10 text-hogwarts-purple px-3 py-1 rounded-full text-sm font-bold border border-hogwarts-purple/30 font-serif">
                    Экзамен
                </div>
            )}
            <div className="bg-hogwarts-green/10 text-hogwarts-green px-3 py-1 rounded-full text-sm font-bold border border-hogwarts-green/30 font-serif">
            {log.word_count} слов
            </div>
            {(isOwner || canModerate) && (
                <button 
                    onClick={handleDelete}
                    className="text-hogwarts-ink/50 hover:text-red-600 transition-colors p-1 relative z-50 ml-auto md:ml-0"
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

        {canModerate && log.status === 'pending' && (
            <div className="flex flex-col items-end gap-2">
                {/* Если админ и есть назначенные модераторы, но нет одобрения */}
                {isGlobalAdmin && log.assigned_moderators && !log.moderator_approval_id ? (
                     <div className="text-hogwarts-ink/60 font-bold font-serif text-right">
                        Ожидается одобрение экзаменатора: {log.assigned_moderators}
                     </div>
                ) : (
                    <>
                        {log.moderator_name && (
                            <div className="text-hogwarts-gold text-sm font-bold">
                                Одобрено экзаменатором: {log.moderator_name}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => onUpdateStatus(log.id, 'rejected')}
                                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors font-bold font-serif"
                            >
                                <X className="w-4 h-4" />
                                Отклонить
                            </button>
                            
                            {!(isModerator && log.moderator_approval_id === user?.id) ? (
                                <button
                                    onClick={() => onUpdateStatus(log.id, 'approved')}
                                    className="flex items-center gap-1 px-4 py-2 rounded-lg bg-hogwarts-green text-hogwarts-gold shadow-md hover:bg-green-900 transition-colors font-bold font-serif border border-hogwarts-gold"
                                    title={isModerator ? "Одобрить как экзаменатор" : "Принять: Добавить в историю"}
                                >
                                    <Check className="w-4 h-4" />
                                    {isModerator ? 'Одобрить' : 'Принять'}
                                </button>
                            ) : (
                                <span className="text-hogwarts-green font-bold text-sm flex items-center gap-1 self-center px-4 py-2 border border-transparent">
                                    <Check className="w-4 h-4" /> Вы одобрили
                                </span>
                            )}

                            {log.type === 'exam' && (
                                <button
                                    onClick={() => onUpdateStatus(log.id, 'exam_passed')}
                                    className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#006633] text-white shadow-md hover:shadow-lg transition-colors font-bold font-serif border border-hogwarts-gold"
                                    title="Экзамен сдан: Прогресс станет 100%"
                                >
                                    <GraduationCap className="w-4 h-4" />
                                    Экзамен сдан
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        )}
         {canModerate && log.status === 'approved' && (
            <div className="text-hogwarts-green font-bold flex items-center gap-2 px-4 py-2">
                <Check className="w-5 h-5" /> Одобрено
            </div>
        )}
         {canModerate && log.status === 'exam_passed' && (
            <div className="text-[#006633] font-bold flex items-center gap-2 px-4 py-2">
                <GraduationCap className="w-5 h-5" /> Экзамен сдан
            </div>
        )}
         {canModerate && log.status === 'rejected' && (
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
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationLog, setApplicationLog] = useState<Log | null>(null);

  // If username is present, we are viewing a specific user's history (Public Profile mode),
  // so we should NOT show the global admin dashboard even if the user is an admin.
  // const isAdmin = user?.role === 'admin' && !forcePersonalView && !username;
  
  const isGlobalAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator' && skillName && user.managed_skills?.includes(decodeURIComponent(skillName));
  const isAdmin = (isGlobalAdmin || isModerator) && !forcePersonalView && !username;

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
             // Admin needs to see application logs in the list (especially pending)
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
            
            // Find application log for user
            if (data) {
                const appLogs = data.filter(l => l.type === 'application');
                // Sort by date desc to get latest to show the relevant one
                appLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                
                if (appLogs.length > 0) {
                    setApplicationLog(appLogs[0]);
                }
            }
            
            // Filter out application logs for user view (displayed separately if needed)
            setLogs(data?.filter(l => l.type !== 'application') || []);
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
    const logToDelete = logs.find(log => log.id === id);
    if (!logToDelete) return;

    // Optimistically remove locally
    setLogs(prevLogs => prevLogs.filter(log => log.id !== id));

    try {
        await deletePracticeLog(id);
    } catch (e) {
        console.error("Failed to delete log", e);
        alert("Не удалось уничтожить свиток. Магия дала сбой.");
        // Rollback
        setLogs(prevLogs => [...prevLogs, logToDelete]);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected' | 'exam_passed') => {
    const logToUpdate = logs.find(log => log.id === id);
    if (!logToUpdate) return;

    // Logic to determine optimistic update behavior
    const isModerator = user?.role === 'moderator' && user.managed_skills?.includes(decodeURIComponent(skillName || ''));
    const isApproval = status === 'approved' || status === 'exam_passed';
    // If moderator approves, it stays in pending list (just marked), unless we are viewing approved logs (unlikely for action)
    const shouldKeepInList = isModerator && isApproval && viewMode === 'pending';

    if (shouldKeepInList) {
         setLogs(prevLogs => prevLogs.map(l => l.id === id ? { 
             ...l, 
             moderator_approval_id: user?.id,
             moderator_name: user?.name
         } : l));
    } else {
         setLogs(prevLogs => prevLogs.filter(log => log.id !== id));
    }

    try {
        await updateLogStatus(id, status);
    } catch (e: any) {
        console.error("Failed to update status", e);
        alert(e.message || "Не удалось обновить статус свитка.");
        // Rollback
        if (shouldKeepInList) {
             setLogs(prevLogs => prevLogs.map(l => l.id === id ? logToUpdate : l));
        } else {
             setLogs(prevLogs => [...prevLogs, logToUpdate]);
        }
    }
  };

  const decodedSkillName = decodeURIComponent(skillName || '');
  const isOwner = user?.id === targetUserId;

  const sortedLogs = [...logs].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

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

      <div className="relative z-20 max-w-4xl mx-auto p-4 md:p-8">
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
            className="absolute inset-0 w-full h-full object-fill z-0 pointer-events-none select-none hidden md:block"
          />
           <div className="absolute inset-0 border-2 border-hogwarts-gold/50 bg-black/40 md:hidden rounded-lg"></div>

          <div className={`relative z-10 flex flex-col md:flex-row justify-between px-6 py-6 md:px-12 md:py-8 gap-4 md:gap-0 ${isAdmin ? 'items-center md:items-start' : 'items-center md:items-end'}`}>
            <div>
                <h1 className="text-2xl md:text-4xl text-hogwarts-gold font-seminaria font-normal flex items-center gap-4">
                    {decodedSkillName === 'Трансгрессия' ? (
                        <img 
                            src={transgressionSvg} 
                            alt="Transgression" 
                            className="w-12 h-12 md:w-16 md:h-16 shrink-0 object-cover object-right select-none"
                        />
                    ) : decodedSkillName === 'Телесный патронус' ? (
                        <img 
                            src={patronusGoldSvg} 
                            alt="Patronus" 
                            className="w-12 h-12 md:w-16 md:h-16 shrink-0 object-cover object-right select-none"
                        />
                    ) : decodedSkillName === 'Невербальная магия' ? (
                        <img 
                            src={nonverbalGoldSvg} 
                            alt="Non-verbal Magic" 
                            className="w-12 h-12 md:w-16 md:h-16 shrink-0 object-cover object-right select-none"
                        />
                    ) : decodedSkillName === 'Беспалочковая магия' ? (
                        <img 
                            src={nowandGoldSvg} 
                            alt="Wandless Magic" 
                            className="w-12 h-12 md:w-16 md:h-16 shrink-0 object-cover object-right select-none"
                        />
                    ) : decodedSkillName === 'Мортимагия' ? (
                        <img 
                            src={mortGoldSvg} 
                            alt="Mortimagic" 
                            className="w-12 h-12 md:w-16 md:h-16 shrink-0 object-cover object-right select-none"
                        />
                    ) : decodedSkillName === 'Анимагия' ? (
                        <img 
                            src={animaGoldSvg} 
                            alt="Animagus" 
                            className="w-12 h-12 md:w-16 md:h-16 shrink-0 object-cover object-right select-none"
                        />
                    ) : decodedSkillName === 'Артефакторика' ? (
                        <img 
                            src={artifactsGoldSvg} 
                            alt="Artifacts" 
                            className="w-12 h-12 md:w-16 md:h-16 shrink-0 object-cover object-right select-none"
                        />
                    ) : decodedSkillName === 'Магия пространства' ? (
                        <img 
                            src={spaceSvg} 
                            alt="Space Magic" 
                            className="w-12 h-12 md:w-16 md:h-16 shrink-0 object-cover object-right select-none"
                        />
                    ) : (
                        <Feather className="w-12 h-12 shrink-0" />
                    )}
                    <div className="flex flex-col">
                        <span>{decodedSkillName}</span>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-white text-base md:text-lg font-century">
                                {isAdmin ? (viewMode === 'pending' ? 'Ожидают проверки' : 'Архив одобренных') : 'История практики'}
                            </span>
                            {!isAdmin && (
                                <button
                                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                    className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-hogwarts-gold hover:text-white"
                                    title={sortOrder === 'desc' ? "Сначала новые" : "Сначала старые"}
                                >
                                    {sortOrder === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                                </button>
                            )}
                        </div>
                    </div>
                </h1>
            </div>
            {isAdmin && (
                <button
                    onClick={() => setViewMode(viewMode === 'pending' ? 'approved' : 'pending')}
                    className="px-6 py-2 bg-hogwarts-blue text-white rounded-lg hover:bg-blue-900 transition-colors font-normal shadow-lg border-2 border-hogwarts-gold font-century mt-4 md:mt-0 w-full md:w-auto"
                >
                    {viewMode === 'pending' ? 'Уже одобренные' : 'На проверку'}
                </button>
            )}
            {!isAdmin && applicationLog && (
                <button
                    onClick={() => setShowApplicationModal(true)}
                    className="flex items-center gap-2 text-hogwarts-gold hover:text-white transition-colors font-century text-base md:text-lg mt-4 md:mt-0"
                >
                    <Scroll className="w-4 h-4" />
                    Просмотреть заявку
                </button>
            )}
          </div>
        </div>

        {/* Application Modal Popup */}
        {showApplicationModal && applicationLog && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-hogwarts-parchment w-full max-w-2xl rounded-lg shadow-2xl border-4 border-hogwarts-gold relative flex flex-col max-h-[90vh]">
                    <div className="p-4 md:p-6 border-b-2 border-hogwarts-bronze flex justify-between items-center bg-hogwarts-parchment rounded-t-lg">
                        <h2 className="text-xl md:text-2xl font-seminaria text-hogwarts-red flex items-center gap-2 font-bold">
                            <Feather className="w-5 h-5 md:w-6 md:h-6" />
                            Заявка на навык
                        </h2>
                        <button onClick={() => setShowApplicationModal(false)} className="text-hogwarts-ink hover:text-hogwarts-red">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-4 md:p-8 overflow-auto">
                        <div className="prose prose-stone max-w-none font-body text-base md:text-lg leading-relaxed text-hogwarts-ink font-serif">
                             <p className="whitespace-pre-wrap">{applicationLog.content}</p>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                            Статус: 
                            <span className={`
                                ${applicationLog.status === 'approved' ? 'text-hogwarts-green' : ''}
                                ${applicationLog.status === 'pending' ? 'text-hogwarts-gold' : ''}
                                ${applicationLog.status === 'rejected' ? 'text-hogwarts-red' : ''}
                            `}>
                                {applicationLog.status === 'approved' && 'Одобрено'}
                                {applicationLog.status === 'pending' && 'На рассмотрении'}
                                {applicationLog.status === 'rejected' && 'Отклонено'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        )}

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
            {sortedLogs.map((log) => (
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
