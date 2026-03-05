import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, Scroll, Calendar, Feather, ChevronDown, ChevronUp, Trash2, Check, X, User as UserIcon, ArrowDown, ArrowUp, GraduationCap, Shield, BookOpen, Upload } from 'lucide-react';
import { useStore } from '../store';
import { getSkillHeaderClass, SKILL_THRESHOLDS, EXAM_REQUIRED_SKILLS } from '../lib/skillUtils';
import castleImg from '../assets/castle.png';
import frameSvg from '../assets/frame.svg';
import owlSvg from '../assets/owl.svg';
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
import divinationGoldSvg from '../assets/divination_gold.svg';
import legilimentGoldSvg from '../assets/legiliment_gold.svg';
import occlumGoldSvg from '../assets/occlum_gold.svg';
import levitGoldSvg from '../assets/levit_gold.svg';
import necroGoldSvg from '../assets/necro_gold.svg';
import morfGoldSvg from '../assets/morf_gold.svg';
import avatarSvg from '../assets/avatar.svg';

interface Log extends PracticeLog {
  // PracticeLog already has status and wizards from my update to types.ts
}

const LogItem: React.FC<{ 
    log: Log; 
    onDelete: (id: string) => void; 
    isOwner: boolean; 
    onUpdateStatus: (id: string, status: 'approved' | 'rejected' | 'exam_passed' | 'study_completed', rejectionReason?: string) => void;
    indexInTotal?: number;
    totalNonRejected?: number;
}> = ({ log, onDelete, isOwner, onUpdateStatus, indexInTotal, totalNonRejected }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const { user } = useStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  
  const isGlobalAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator' && user.managed_skills?.includes(log.skill_name);
  const canModerate = isGlobalAdmin || isModerator;

  // Update owl position on scroll
  const handleContentScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const progress = scrollTop / (scrollHeight - clientHeight);
      setScrollProgress(isNaN(progress) ? 0 : progress);
    }
  };

  // Drag logic
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const rafIdRef = useRef<number | null>(null);
  const latestClientYRef = useRef<number | null>(null);

  useEffect(() => {
    const applyScrollByOwl = () => {
      if (!scrollTrackRef.current || !contentRef.current || latestClientYRef.current == null) return;
      const track = scrollTrackRef.current.getBoundingClientRect();
      const clientY = latestClientYRef.current;
      const relativeY = clientY - track.top;
      const percentage = Math.max(0, Math.min(1, relativeY / track.height));
      const content = contentRef.current;
      content.scrollTop = percentage * (content.scrollHeight - content.clientHeight);
      rafIdRef.current = null;
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      if (e.cancelable) e.preventDefault();
      latestClientYRef.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
      if (rafIdRef.current == null) {
        rafIdRef.current = requestAnimationFrame(applyScrollByOwl);
      }
    };

    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMove, { passive: false });
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
      
      // Блокируем скролл на body через CSS
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      
      // Возвращаем скролл
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isDragging]);

  const handleScroll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contentRef.current) {
        const container = contentRef.current;
        const scrollAmount = 200; 
        const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
        
        if (isAtBottom) {
            container.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        }
    }
  };

  // Logic for "Complete Study" button
  const threshold = SKILL_THRESHOLDS[log.skill_name] || 100;
  const approvedCount = log.user_approved_count || 0;
  const isExamRequired = EXAM_REQUIRED_SKILLS.includes(log.skill_name);
  const isAlreadyCompleted = log.has_completed_status;
  const isExamLog = (log.type === 'exam') || (log.status === 'exam_passed') || (log.moderator_proposed_status === 'exam_passed');
  const isExamSkillPage = EXAM_REQUIRED_SKILLS.includes(log.skill_name);
  
  // Show button if user reached threshold (90%), exam is not required, and not already completed
  const showCompleteStudy = canModerate && !isExamRequired && approvedCount >= threshold && !isAlreadyCompleted;
  
  // Split content into paragraphs
  const paragraphs = log.content.split('\n').filter(p => p.trim().length > 0);
  const firstParagraph = paragraphs[0] || '';

  const handleDelete = () => {
    setShowConfirm(true);
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    setIsDeleting(true);
    // Wait for animation to play
    setTimeout(() => {
        onDelete(log.id);
        setShowConfirm(false);
    }, 500);
  };

  const handleReject = () => {
    onUpdateStatus(log.id, 'rejected', rejectionReason);
    setShowRejectModal(false);
    setRejectionReason('');
  };

  const isGranted = log.status === 'exam_passed' && log.word_count === 0 && !!log.moderator_approval_id;

  return (
    <article 
      className={`bg-white p-4 md:p-8 rounded-lg shadow-md border-2 border-hogwarts-bronze relative overflow-hidden transition-all duration-500 ${isDeleting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100'} ${isGranted ? 'border-hogwarts-green/50 bg-green-50/30' : ''}`}
    >
      {/* Overlays for User Status */}
      {!canModerate && log.status === 'pending' && (
          <div className="absolute inset-0 bg-white/60 z-30 flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
             <div className="bg-[#D3A625] text-hogwarts-red px-6 py-3 rounded-lg shadow-xl font-magical font-bold text-xl border-2 border-hogwarts-red pointer-events-auto z-40 opacity-100 text-center mx-4">
                {log.type === 'exam' ? 'Экзаменационная работа ожидает проверки' : 'Текст ожидает проверку'}
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

      {showRejectModal && (
        <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center rounded-lg p-8 animate-in fade-in duration-200">
            <h3 className="text-xl font-serif font-bold text-hogwarts-red mb-4">Укажите причину отказа</h3>
            <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full max-w-md p-3 border-2 border-hogwarts-bronze rounded-lg mb-4 font-century focus:outline-none focus:border-hogwarts-gold resize-none"
                rows={4}
                placeholder="Почему этот пост отклонен?"
            />
            <div className="flex gap-4">
                <button
                    onClick={() => {
                        setShowRejectModal(false);
                        setRejectionReason('');
                    }}
                    className="px-4 py-2 rounded border border-hogwarts-bronze text-hogwarts-ink hover:bg-hogwarts-parchment transition-colors font-serif"
                >
                    Отмена
                </button>
                <button
                    onClick={handleReject}
                    disabled={!rejectionReason.trim()}
                    className="px-4 py-2 rounded bg-hogwarts-red text-white font-bold hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-serif"
                >
                    Отклонить
                </button>
            </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start mb-6 border-b border-hogwarts-bronze pb-4 relative z-40 gap-4 md:gap-0">
        <div className="flex flex-col gap-1 w-full md:w-auto">
            <div className="md:hidden flex items-center gap-2 text-hogwarts-ink/70 font-bold font-serif flex-wrap">
                {isExamLog && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-hogwarts-purple text-hogwarts-purple bg-white">
                        Экзамен
                    </span>
                )}
                {!isGranted && (
                    <span className="bg-hogwarts-green/10 text-hogwarts-green px-3 py-1 rounded-full text-xs font-bold border border-hogwarts-green/30 font-serif">
                        {log.word_count} слов
                    </span>
                )}
                {typeof indexInTotal === 'number' && typeof totalNonRejected === 'number' && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-hogwarts-ink/5 text-hogwarts-ink tracking-wide">
                        {indexInTotal} из {totalNonRejected}
                    </span>
                )}
                {log.post_link && log.status !== 'rejected' && (
                    <a 
                    href={log.post_link.startsWith('http') ? log.post_link : `https://${log.post_link}`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-1 text-hogwarts-gold hover:text-yellow-400 visited:text-hogwarts-gold transition-colors underline decoration-hogwarts-gold/40 underline-offset-4 text-xs"
                    title="Открыть ссылку"
                    >
                    <Feather className="w-3 h-3" />
                    Ссылка
                    </a>
                )}
                {(isOwner || canModerate) && (
                    <button 
                        onClick={handleDelete}
                        className="ml-auto text-hogwarts-ink/50 hover:text-red-600 transition-colors p-1"
                        title="Уничтожить свиток"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-hogwarts-ink/70 font-bold font-serif mt-1 md:mt-0">
            {isGranted && log.moderator_name ? (
                <div className="text-hogwarts-green font-bold flex items-center gap-2 text-lg">
                    <span>Выдал:</span>
                    {log.moderator_avatar && (
                         <img 
                            src={log.moderator_avatar} 
                            alt={log.moderator_name} 
                            className="w-6 h-6 rounded-full border border-hogwarts-green object-cover"
                        />
                    )}
                    <span>{log.moderator_name}</span>
                </div>
            ) : (
                <>
                    {isExamLog && (
                        <span className="hidden md:inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-hogwarts-purple text-hogwarts-purple bg-white">
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
                    {typeof indexInTotal === 'number' && typeof totalNonRejected === 'number' && (
                        <span className="hidden md:inline-flex ml-2 px-2 py-0.5 rounded-full text-xs md:text-sm bg-hogwarts-ink/5 text-hogwarts-ink tracking-wide">
                            {indexInTotal} из {totalNonRejected}
                        </span>
                    )}
                </>
            )}
            
            {log.post_link && log.status !== 'rejected' && (
                <a 
                href={log.post_link.startsWith('http') ? log.post_link : `https://${log.post_link}`}
                target="_blank" 
                rel="noopener noreferrer" 
                className="hidden md:flex items-center gap-1 text-hogwarts-gold hover:text-yellow-400 visited:text-hogwarts-gold transition-colors w-full md:w-auto underline decoration-hogwarts-gold/40 underline-offset-4"
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
                        <img src={avatarSvg} alt="Default Avatar" className="w-8 h-8 object-contain" />
                    )}
                    <span className="text-hogwarts-red">{log.wizards.name}</span>
                </div>
            )}
        </div>
        
        <div className="hidden md:flex flex-wrap items-center gap-2 md:gap-4">
            {log.type === 'application' && (
                <div className="bg-hogwarts-green/10 text-hogwarts-green px-3 py-1 rounded-full text-sm font-bold border border-hogwarts-green/30 font-serif">
                    Заявка на освоение
                </div>
            )}
            {!isGranted && (
                <div className="bg-hogwarts-green/10 text-hogwarts-green px-3 py-1 rounded-full text-sm font-bold border border-hogwarts-green/30 font-serif">
                {log.word_count} слов
                </div>
            )}
            {(isOwner || canModerate) && (
                <button 
                    onClick={handleDelete}
                    className="text-hogwarts-ink/50 hover:text-red-600 transition-colors p-1"
                    title="Уничтожить свиток"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            )}
        </div>
      </div>
      
      {!canModerate && log.status === 'rejected' && (
        <div className="relative z-10 mb-3">
            <div className="bg-hogwarts-red text-white px-4 py-3 rounded-lg shadow font-magical text-base md:text-lg border-2 border-hogwarts-gold text-center max-w-full mx-auto">
                Ваш текст был отклонён, обратитесь к администрации
            </div>
            {log.rejection_reason && (
                <div className="mt-2 bg-white text-hogwarts-red px-4 py-3 rounded-lg shadow font-serif text-base border border-hogwarts-red text-center max-w-full mx-auto">
                    <span className="font-bold">Причина:</span> {log.rejection_reason}
                </div>
            )}
        </div>
      )}
      
      <div className="relative z-10 flex gap-2">
        <div 
          ref={contentRef}
          onScroll={handleContentScroll}
          className={`prose prose-stone max-w-none font-body text-lg leading-relaxed text-hogwarts-ink font-serif ${isDragging ? '' : 'scroll-smooth'} flex-grow ${isExpanded ? 'max-h-[50vh] overflow-y-auto md:max-h-none md:overflow-visible hide-scrollbar' : ''}`}
        >
          {isExpanded || isGranted ? (
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

        {/* Custom Owl Scrollbar for Mobile */}
        {isExpanded && !isGranted && (
          <div 
            ref={scrollTrackRef}
            className="md:hidden w-1.5 bg-hogwarts-bronze/20 rounded-full relative my-4 mx-2 overflow-visible"
            style={{ height: 'calc(50vh - 32px)' }}
          >
            {/* The "Yellow Line" (Filled Track) - Moves with owl */}
            <div 
              className="absolute top-0 w-full bg-hogwarts-gold rounded-full transition-all duration-100 ease-out"
              style={{ 
                height: `${scrollProgress * 100}%`, 
                boxShadow: '0 0 8px rgba(225, 177, 47, 0.4)'
              }}
            />
            {/* The Owl Icon - Draggable Handle, attached to the end of the line */}
            <div
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
              className={`absolute left-1/2 -translate-x-1/2 z-50 cursor-grab active:cursor-grabbing transition-transform ${isDragging ? 'scale-110' : 'hover:scale-105'}`}
              style={{ 
                top: `${scrollProgress * 100}%`, 
                marginTop: '0px'
              }}
            >
              <div className="bg-white rounded-full border-2 border-hogwarts-gold shadow-lg p-1 w-[42px] h-[42px] flex items-center justify-center -translate-y-1/2">
                <img src={owlSvg} alt="Owl Scroll" className="w-8 h-8 object-contain pointer-events-none" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row justify-between items-center relative z-10 gap-4">
        {!isGranted && (
            <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-hogwarts-blue hover:text-hogwarts-red font-bold font-serif transition-colors px-4 py-2 rounded-full hover:bg-hogwarts-blue/5 self-start sm:self-auto"
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
        )}
        {isGranted && <div />} {/* Spacer */}

        {canModerate && log.status === 'pending' && (
            <div className="flex flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
                {/* Если админ и есть назначенные модераторы, но нет одобрения */}
                {/* СПЕЦИАЛЬНЫЙ ОБХОД: если загрузивший из Хогвартса и навык НЕ Трансгрессия, админ может одобрить сразу */}
                {isGlobalAdmin && log.assigned_moderators && !log.moderator_approval_id && 
                 !((log.wizards?.age?.toLowerCase() === 'хогвартс' || log.wizards?.age?.toLowerCase() === 'школа') && log.skill_name !== 'Трансгрессия') ? (
                     <div className="text-hogwarts-ink/60 font-bold font-serif text-center sm:text-right">
                        Ожидается одобрение экзаменатора: <span className="text-hogwarts-gold">{log.assigned_moderators}</span>
                     </div>
                ) : (
                    <>
                        {log.moderator_name && (
                            <div className="text-hogwarts-gold text-sm font-bold text-center sm:text-right">
                                Одобрено экзаменатором: <span className="text-hogwarts-gold">{log.moderator_name}</span>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                            <button
                                onClick={() => setShowRejectModal(true)}
                                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors font-bold font-serif whitespace-nowrap"
                            >
                                <X className="w-4 h-4" />
                                Отклонить
                            </button>
                            
                            {isGlobalAdmin && log.moderator_approval_id ? (
                                // Admin View when Moderator has already acted
                                <>
                                    {(!log.moderator_proposed_status || log.moderator_proposed_status === 'approved') && (
                                        <button
                                            onClick={() => onUpdateStatus(log.id, 'approved')}
                                            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-hogwarts-green text-hogwarts-gold shadow-md hover:bg-green-900 transition-colors font-bold font-serif border border-hogwarts-gold whitespace-nowrap"
                                        >
                                            <Check className="w-4 h-4" />
                                            Принять
                                        </button>
                                    )}
                                    {log.moderator_proposed_status === 'exam_passed' && (
                                        <button
                                            onClick={() => onUpdateStatus(log.id, 'exam_passed')}
                                            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#006633] text-white shadow-md hover:shadow-lg transition-colors font-bold font-serif border border-hogwarts-gold whitespace-nowrap"
                                        >
                                            <GraduationCap className="w-4 h-4" />
                                            Экзамен сдан
                                        </button>
                                    )}
                                     {log.moderator_proposed_status === 'study_completed' && (
                                        <button
                                            onClick={() => onUpdateStatus(log.id, 'study_completed')}
                                            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-hogwarts-gold text-hogwarts-ink shadow-md hover:shadow-lg transition-colors font-bold font-serif border border-hogwarts-bronze whitespace-nowrap"
                                        >
                                            <BookOpen className="w-4 h-4" />
                                            Завершить изучение
                                        </button>
                                    )}
                                </>
                            ) : (
                                // Standard View (Moderator or Admin without prior moderation)
                                <>
                                    {!(isModerator && log.moderator_approval_id === user?.id) ? (
                                        <button
                                            onClick={() => onUpdateStatus(log.id, 'approved')}
                                            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-hogwarts-green text-hogwarts-gold shadow-md hover:bg-green-900 transition-colors font-bold font-serif border border-hogwarts-gold whitespace-nowrap"
                                            title={isModerator ? "Одобрить как экзаменатор" : "Принять: Добавить в историю"}
                                        >
                                            <Check className="w-4 h-4" />
                                            {isModerator ? 'Одобрить' : 'Принять'}
                                        </button>
                                    ) : (
                                        <span className="text-hogwarts-green font-bold text-sm flex items-center gap-1 self-center px-4 py-2 border border-transparent whitespace-nowrap">
                                            <Check className="w-4 h-4" /> Вы одобрили
                                        </span>
                                    )}

                                    {log.type === 'exam' && (
                                        <button
                                            onClick={() => onUpdateStatus(log.id, 'exam_passed')}
                                            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#006633] text-white shadow-md hover:shadow-lg transition-colors font-bold font-serif border border-hogwarts-gold whitespace-nowrap"
                                            title="Экзамен сдан: Прогресс станет 100%"
                                        >
                                            <GraduationCap className="w-4 h-4" />
                                            Экзамен сдан
                                        </button>
                                    )}

                                    {showCompleteStudy && (
                                        <button
                                            onClick={() => onUpdateStatus(log.id, 'study_completed')}
                                            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-hogwarts-gold text-hogwarts-ink shadow-md hover:shadow-lg transition-colors font-bold font-serif border border-hogwarts-bronze whitespace-nowrap"
                                            title="Завершить изучение: Прогресс станет 100%"
                                        >
                                            <BookOpen className="w-4 h-4" />
                                            Завершить изучение
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        )}
         {((canModerate && log.status === 'approved') || (canModerate && log.status === 'exam_passed')) && (
            <div className="flex items-center gap-2">
                <div className={`font-bold flex items-center gap-2 px-4 py-2 ${log.status === 'approved' ? 'text-hogwarts-green' : 'text-[#006633]'}`}>
                    {log.status === 'approved' ? <Check className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                    {log.status === 'approved' ? 'Одобрено' : 'Экзамен сдан'}
                </div>
            </div>
        )}
         {canModerate && log.status === 'study_completed' && (
            <div className="text-hogwarts-gold font-bold flex items-center gap-2 px-4 py-2">
                <BookOpen className="w-5 h-5" /> Изучение завершено
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
  const { skillName, username: routeUsername } = useParams<{ skillName: string; username?: string }>();
  const [searchParams] = useSearchParams();
  const forcePersonalView = searchParams.get('view') === 'personal';
  const initialStatusParam = searchParams.get('status');
  const initialViewMode: 'pending' | 'approved' = initialStatusParam === 'approved' ? 'approved' : 'pending';
  const queryUsername = searchParams.get('username');
  const username = routeUsername || queryUsername; // Support both route and query param
  
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'pending' | 'approved'>(initialViewMode); // For admin
  const navigate = useNavigate();
  const { user, deletePracticeLog, updateLogStatus, fetchSkills } = useStore();
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetUserName, setTargetUserName] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('asc');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationLog, setApplicationLog] = useState<Log | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const [showCompletionRejectModal, setShowCompletionRejectModal] = useState(false);
  const [completionRejectionReason, setCompletionRejectionReason] = useState('');

  // If username is present, we are viewing a specific user's history (Public Profile mode),
  // so we should NOT show the global admin dashboard even if the user is an admin.
  // const isAdmin = user?.role === 'admin' && !forcePersonalView && !username;
  
  const isGlobalAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator' && skillName && user.managed_skills?.includes(decodeURIComponent(skillName));
  const canModerate = isGlobalAdmin || isModerator;
  const isAdmin = canModerate && !forcePersonalView && !username;

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
                 setTargetUserName(userData.name);
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

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected' | 'exam_passed' | 'study_completed', rejectionReason?: string) => {
    const logToUpdate = logs.find(log => log.id === id);
    if (!logToUpdate) return;

    // Logic to determine optimistic update behavior
    const isModerator = user?.role === 'moderator' && user.managed_skills?.includes(decodeURIComponent(skillName || ''));
    const isApproval = status === 'approved' || status === 'exam_passed' || status === 'study_completed';
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
        await updateLogStatus(id, status, rejectionReason);
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

  const handleRejectCompletion = async () => {
      const completionRequestLog = logs.find(l => l.type === 'completion_request' && l.status === 'pending');
      if (!completionRequestLog) return;
      
      setShowCompletionRejectModal(false);
      await handleUpdateStatus(completionRequestLog.id, 'rejected', completionRejectionReason);
      setCompletionRejectionReason('');
  };

  const escapeXml = (value: string) => {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const createZipBlob = (files: { name: string; content: string }[]) => {
    const encoder = new TextEncoder();
    const crcTable = (() => {
      const table = new Uint32Array(256);
      for (let i = 0; i < 256; i += 1) {
        let c = i;
        for (let k = 0; k < 8; k += 1) {
          c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
      }
      return table;
    })();

    const crc32 = (data: Uint8Array) => {
      let crc = 0xFFFFFFFF;
      for (let i = 0; i < data.length; i += 1) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
      }
      return (crc ^ 0xFFFFFFFF) >>> 0;
    };

    const fileParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;

    files.forEach(file => {
      const nameBytes = encoder.encode(file.name);
      const dataBytes = encoder.encode(file.content);
      const crc = crc32(dataBytes);

      const localHeader = new Uint8Array(30 + nameBytes.length);
      const localView = new DataView(localHeader.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, 0, true);
      localView.setUint16(12, 0, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, dataBytes.length, true);
      localView.setUint32(22, dataBytes.length, true);
      localView.setUint16(26, nameBytes.length, true);
      localView.setUint16(28, 0, true);
      localHeader.set(nameBytes, 30);

      fileParts.push(localHeader, dataBytes);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, 0, true);
      centralView.setUint16(14, 0, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, dataBytes.length, true);
      centralView.setUint32(24, dataBytes.length, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      centralHeader.set(nameBytes, 46);

      centralParts.push(centralHeader);

      offset += localHeader.length + dataBytes.length;
    });

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const centralOffset = offset;

    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, centralOffset, true);
    endView.setUint16(20, 0, true);

    const allParts = [...fileParts, ...centralParts, endRecord];
    return new Blob(allParts as BlobPart[], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  };

  type DocxParagraph = { text: string; style?: 'Heading1' | 'Heading2' | 'Heading3' };

  const createDocxBlob = (paragraphs: DocxParagraph[]) => {
    const paragraphXml = paragraphs.map(paragraph => {
      if (!paragraph.text && !paragraph.style) {
        return '<w:p/>';
      }
      const styleXml = paragraph.style ? `<w:pPr><w:pStyle w:val="${paragraph.style}"/></w:pPr>` : '';
      const textXml = paragraph.text
        ? `<w:r><w:t xml:space="preserve">${escapeXml(paragraph.text)}</w:t></w:r>`
        : '<w:r/>';
      return `<w:p>${styleXml}${textXml}</w:p>`;
    }).join('');

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphXml}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>
  </w:body>
</w:document>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

    return createZipBlob([
      { name: '[Content_Types].xml', content: contentTypesXml },
      { name: '_rels/.rels', content: relsXml },
      { name: 'word/document.xml', content: documentXml },
      { name: 'word/_rels/document.xml.rels', content: documentRelsXml }
    ]);
  };

  const splitIntoParagraphs = (text: string) => {
    const lines = text.split(/\r?\n/);
    return lines.length ? lines : [''];
  };

  const handleExportSkill = async () => {
    if (isExporting) return;
    const resolvedSkillName = decodeURIComponent(skillName || '');
    const userIdToFetch = targetUserId || user?.id || '';
    if (!resolvedSkillName || !userIdToFetch) return;
    setIsExporting(true);
    try {
      const data = await api.logs.list(userIdToFetch, resolvedSkillName);
      const visibleLogs = (data || [])
        .filter(log => log.status !== 'rejected' && log.type !== 'completion_request' && log.type !== 'application')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const authorName = targetUserName || (username ? username.replace(/_/g, ' ') : user?.name) || 'Автор';
      const exportedAt = new Date().toLocaleString('ru-RU');
      const paragraphs: DocxParagraph[] = [];

      paragraphs.push({ text: resolvedSkillName, style: 'Heading1' });
      paragraphs.push({ text: `Автор: ${authorName}` });
      paragraphs.push({ text: `Экспортировано: ${exportedAt}` });
      paragraphs.push({ text: '' });

      if (!visibleLogs.length) {
        paragraphs.push({ text: 'Нет данных для экспорта.' });
      } else {
        visibleLogs.forEach((log, index) => {
          const date = new Date(log.created_at).toLocaleDateString('ru-RU');
          paragraphs.push({ text: `Пост ${index + 1}`, style: 'Heading3' });
          paragraphs.push({ text: `Дата: ${date}` });
          if (log.post_link) {
            paragraphs.push({ text: `Ссылка: ${log.post_link}` });
          }
          splitIntoParagraphs(log.content).forEach(line => {
            paragraphs.push({ text: line });
          });
          paragraphs.push({ text: '' });
        });
      }

      const blob = createDocxBlob(paragraphs);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${resolvedSkillName}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const decodedSkillName = decodeURIComponent(skillName || '');
  const isOwner = user?.id === targetUserId;

  const sortedLogs = [...logs].sort((a, b) => {
    // 1. Pinned (Granted) skills first
    const isGrantedA = a.status === 'exam_passed' && a.word_count === 0 && a.moderator_approval_id;
    const isGrantedB = b.status === 'exam_passed' && b.word_count === 0 && b.moderator_approval_id;
    
    if (isGrantedA && !isGrantedB) return -1;
    if (!isGrantedA && isGrantedB) return 1;

    // 2. Date sort
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const completionRequestLog = logs.find(l => l.type === 'completion_request' && l.status === 'pending');
  const visibleLogs = sortedLogs.filter(log => log.type !== 'completion_request');
  
  // Нумерация постов всегда должна быть хронологической (№1 - самый ранний)
  const nonRejectedForIndexing = [...logs]
    .filter(log => log.type !== 'completion_request' && log.status !== 'rejected')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
  const totalNonRejected = nonRejectedForIndexing.length;
  const logIndexMap = new Map(nonRejectedForIndexing.map((log, index) => [log.id, index + 1]));

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
          className="flex items-center gap-2 text-white hover:text-hogwarts-gold mb-8 font-magical font-bold transition-colors font-serif w-full justify-center md:w-auto md:justify-start"
        >
          <ArrowLeft className="w-5 h-5" />
          {username ? 'Вернуться к профилю' : 'Вернуться в кабинет'}
        </button>

        <div className="relative mb-12">
          <div className="absolute inset-0 bg-black/50 hidden md:block"></div>
          <img
            src={frameSvg}
            alt="Frame"
            className="absolute inset-0 w-full h-full object-fill z-10 pointer-events-none select-none hidden md:block"
          />
           <div className="absolute inset-0 border-2 border-hogwarts-gold/50 bg-black/40 md:hidden rounded-lg"></div>

          <div className={`relative z-10 flex flex-col md:flex-row justify-between px-6 py-6 md:px-12 md:py-8 gap-4 md:gap-0 ${isAdmin ? 'items-center md:items-start' : 'items-center md:items-end'}`}>
            <div className="w-full md:w-auto">
                <h1 className="font-seminaria font-normal flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-4 text-hogwarts-gold text-center md:text-left px-2 md:px-0">
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
                    ) : decodedSkillName === 'Провидение' ? (
                        <img 
                            src={divinationGoldSvg} 
                            alt="Divination" 
                            className="w-12 h-12 md:w-16 md:h-16 shrink-0 object-cover object-right select-none"
                        />
                    ) : decodedSkillName === 'Легилименция' ? (
                        <img 
                            src={legilimentGoldSvg} 
                            alt="Legilimency" 
                            className="w-12 h-12 md:w-16 md:h-16 shrink-0 object-cover object-right select-none"
                        />
                    ) : decodedSkillName === 'Окклюменция' ? (
                        <img 
                            src={occlumGoldSvg} 
                            alt="Occlumency" 
                            className="w-12 h-12 md:w-16 md:h-16 shrink-0 object-cover object-right select-none"
                        />
                    ) : decodedSkillName === 'Самостоятельная левитация' ? (
                        <img 
                            src={levitGoldSvg} 
                            alt="Self-Levitation" 
                            className="w-12 h-12 md:w-16 md:h-16 shrink-0 object-cover object-right select-none"
                        />
                    ) : decodedSkillName === 'Некромантия' ? (
                        <img 
                            src={necroGoldSvg} 
                            alt="Necromancy" 
                            className="w-12 h-12 md:w-16 md:h-16 shrink-0 object-cover object-right select-none"
                        />
                    ) : decodedSkillName === 'Метаморфомагия' ? (
                        <img 
                            src={morfGoldSvg} 
                            alt="Metamorphmagy" 
                            className="w-12 h-12 md:w-16 md:h-16 shrink-0 object-cover object-right select-none"
                        />
                    ) : (
                        <Feather className="w-12 h-12 shrink-0" />
                    )}
                    <div className="flex flex-col items-center md:items-start">
                        <span className={`whitespace-nowrap ${getSkillHeaderClass(decodedSkillName)}`}>{decodedSkillName}</span>
                        <div className="flex items-center justify-center md:justify-start gap-2 mt-1 flex-wrap">
                            <span className="text-white text-base md:text-lg font-century">
                                {isAdmin ? (viewMode === 'pending' ? 'Ожидают проверки' : 'Архив одобренных') : 'История практики'}
                            </span>
                            {!isAdmin && (
                                <span className="text-xs md:text-sm text-hogwarts-gold font-century">
                                    Всего постов: {totalNonRejected}
                                </span>
                            )}
                            {!isAdmin && (
                                <button
                                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                    className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-hogwarts-gold hover:text-white"
                                    title={sortOrder === 'asc' ? "Сначала старые (по умолчанию)" : "Сначала новые"}
                                >
                                    {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                                </button>
                            )}
                            {!isAdmin && !username && (
                                <button
                                    onClick={handleExportSkill}
                                    disabled={isExporting || (!targetUserId && !user?.id)}
                                    className={`flex items-center gap-2 text-hogwarts-gold hover:text-yellow-200 font-bold font-century px-4 py-2 border-2 border-transparent hover:border-hogwarts-gold rounded transition-all text-sm ${
                                      isExporting || (!targetUserId && !user?.id) ? 'opacity-60 cursor-not-allowed' : ''
                                    }`}
                                >
                                    <Upload className="w-5 h-5" />
                                    Экспорт
                                </button>
                            )}
                        </div>
                    </div>
                </h1>
            </div>
            {isAdmin && (
                <button
                    onClick={() => setViewMode(viewMode === 'pending' ? 'approved' : 'pending')}
                    className={`px-6 py-2 ${viewMode === 'pending' ? 'bg-[#004d26] hover:bg-[#003d1e]' : 'bg-hogwarts-blue hover:bg-blue-900'} text-white rounded-lg transition-colors font-normal shadow-lg border-2 border-hogwarts-gold font-century mt-4 md:mt-0 w-full md:w-auto`}
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
            {visibleLogs.map((log) => (
              <LogItem 
                key={log.id} 
                log={log} 
                onDelete={handleDeleteLog}
                isOwner={isOwner}
                onUpdateStatus={handleUpdateStatus}
                indexInTotal={logIndexMap.get(log.id)}
                totalNonRejected={totalNonRejected}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Buttons for Completion Request */}
      {completionRequestLog && canModerate && (
         <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
             <button
                 onClick={() => handleUpdateStatus(completionRequestLog.id, 'study_completed')}
                 className="px-8 py-4 rounded-full bg-[#006633] text-white font-bold text-lg shadow-[0_0_20px_rgba(0,255,0,0.5)] hover:shadow-[0_0_30px_rgba(0,255,0,0.7)] transition-all animate-pulse-slow border-2 border-green-400/50 backdrop-blur-sm hover:scale-105"
                 style={{ fontFamily: 'RobotoforLearning-Medium_0' }}
             >
                 Одобрить завершение обучения
             </button>
             
             <button
                 onClick={() => setShowCompletionRejectModal(true)}
                 className="px-6 py-3 rounded-full bg-hogwarts-red/90 text-white font-bold text-base shadow-[0_0_15px_rgba(255,0,0,0.4)] hover:shadow-[0_0_25px_rgba(255,0,0,0.6)] transition-all border-2 border-red-400/50 backdrop-blur-sm hover:scale-105"
                 style={{ fontFamily: 'RobotoforLearning-Medium_0' }}
             >
                 Отклонить завершение обучения
             </button>
         </div>
      )}

      {/* Completion Rejection Modal */}
      {showCompletionRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-2xl border-2 border-hogwarts-red animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-serif font-bold text-hogwarts-red mb-4">Укажите причину отказа</h3>
                <textarea
                    value={completionRejectionReason}
                    onChange={(e) => setCompletionRejectionReason(e.target.value)}
                    className="w-full p-3 border-2 border-hogwarts-bronze rounded-lg mb-6 font-century focus:outline-none focus:border-hogwarts-red resize-none min-h-[100px]"
                    placeholder="Почему обучение не может быть завершено?"
                />
                <div className="flex gap-4 justify-end">
                    <button
                        onClick={() => {
                            setShowCompletionRejectModal(false);
                            setCompletionRejectionReason('');
                        }}
                        className="px-4 py-2 rounded-lg border border-hogwarts-bronze text-hogwarts-ink hover:bg-hogwarts-parchment transition-colors font-serif font-bold"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleRejectCompletion}
                        disabled={!completionRejectionReason.trim()}
                        className="px-6 py-2 rounded-lg bg-hogwarts-red text-white font-bold hover:bg-red-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-serif"
                    >
                        Отклонить
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
