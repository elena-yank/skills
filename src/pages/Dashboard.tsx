import React, { useEffect, useState, useRef } from 'react';
import { Plus, LogOut, GraduationCap, Share2, Check, Users, ChevronDown, ChevronUp, Info, Maximize2, Upload, Settings } from 'lucide-react';
import { Notifications } from '../components/Notifications';
import { SettingsModal } from '../components/SettingsModal';
import { useStore, SKILL_CATEGORIES } from '../store';
import { PracticeModal } from '../components/PracticeModal';
import { SkillInfoModal } from '../components/SkillInfoModal';
import { ImageModal } from '../components/ImageModal';
import { ImageCropper } from '../components/ImageCropper';
import { api } from '../lib/api';
import { SKILL_DESCRIPTIONS } from '../data/skillDescriptions';
import { EXAM_REQUIRED_SKILLS, SKILL_THRESHOLDS, getSkillTitleClass } from '../lib/skillUtils';
import { useNavigate } from 'react-router-dom';
import castleImg from '../assets/castle.png';
import scrollImg from '../assets/scroll.png';
import frameSvg from '../assets/frame.svg';
import textSvg from '../assets/text.svg';
import addSvg from '../assets/add.svg';

export const Dashboard: React.FC = () => {
  const { user, skills, fetchSkills, signOut, addPracticeLog, isLoading } = useStore();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [selectedSkillInfo, setSelectedSkillInfo] = useState<string | null>(null);
  const [isExamMode, setIsExamMode] = useState(false);
  const [isApplicationMode, setIsApplicationMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const [adminView, setAdminView] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [animateProgress, setAnimateProgress] = useState(false);
  const initialProgressShown = useRef(false);
  const wasLoading = useRef(false);

  useEffect(() => {
    if (wasLoading.current && !isLoading && !initialProgressShown.current) {
      initialProgressShown.current = true;
      setTimeout(() => setAnimateProgress(true), 0);
    }
    wasLoading.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    const hasTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    setIsTouchDevice(hasTouch);
  }, []);

  useEffect(() => {
    if (!isTouchDevice) return;
    const handleTouchStart = (event: TouchEvent) => {
      if (!activeTooltip) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const inside = target.closest('[data-skill-tooltip-container="true"]');
      if (!inside) {
        setActiveTooltip(null);
      }
    };
    document.addEventListener('touchstart', handleTouchStart);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isTouchDevice, activeTooltip]);

  const handleCompletionRequest = async (skillName: string) => {
    if (!confirm('Вы уверены, что хотите подать заявку на завершение обучения?')) return;
    
    try {
        await addPracticeLog(skillName, 'Заявка на завершение обучения', 0, '', true, 'completion_request');
        alert('Заявка успешно отправлена!');
    } catch (error) {
        console.error(error);
        alert('Ошибка при отправке заявки');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Размер файла не должен превышать 3 МБ');
      return;
    }

    // Read file for cropping
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleCropComplete = async (croppedImage: string) => {
    setImageToCrop(null);
    setIsUploading(true);
    if (user) {
        try {
            // @ts-ignore
            const updatedUser = await api.users.updateAvatar(user.id, croppedImage);
            // We need to update the user in the store
            const { setUser } = useStore.getState(); 
            setUser({ ...user, avatar_url: updatedUser.avatar_url });
        } catch (error) {
            console.error('Failed to update avatar:', error);
            alert('Не удалось обновить фото');
        }
    }
    setIsUploading(false);
  };

  const handleCropCancel = () => {
    setImageToCrop(null);
  };

  const getDeclension = (number: number, titles: [string, string, string]) => {
      const cases = [2, 0, 1, 1, 1, 2];
      return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
  };

  const getSkillNextStepInfo = (skill: any) => {
    if (skill.ageCapMessage) return skill.ageCapMessage;
    if (skill.isLocked) return null;
    if (skill.progress >= 100) return 'Максимальный уровень';
    
    const count = skill.approvedCount || 0;
    
    // Special Skills
    if (['Метаморфомагия', 'Провидение'].includes(skill.name)) {
        if (skill.level === 1) {
            const needed = 10 - count;
            return `Ещё ${needed} ${getDeclension(needed, ['пост', 'поста', 'постов'])} до повышения уровня`;
        } else if (skill.level === 2) {
            const needed = 15 - count;
            return `Ещё ${needed} ${getDeclension(needed, ['пост', 'поста', 'постов'])} до повышения уровня`;
        } else if (skill.level === 3) {
            return 'Максимальный уровень';
        }
        return null;
    }
    
    // Standard Skills
    const threshold = SKILL_THRESHOLDS[skill.name] || 100;
    const isExamRequired = EXAM_REQUIRED_SKILLS.includes(skill.name);
    
    if (isExamRequired) {
        if (skill.hasExamPassed) return 'Максимальный уровень';
        
        if (count < threshold) {
            const needed = threshold - count;
            return `Ещё ${needed} ${getDeclension(needed, ['пост', 'поста', 'постов'])} и экзамен`;
        } else {
            return 'Требуется сдать экзамен';
        }
    } else {
        if (count < threshold) {
            const needed = threshold - count;
            return `Ещё ${needed} ${getDeclension(needed, ['пост', 'поста', 'постов'])} до завершения`;
        } else {
             return 'Максимальный уровень';
        }
    }
  };

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    SKILL_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.name]: true }), {})
  );

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => ({
        ...prev,
        [categoryName]: !prev[categoryName]
    }));
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'moderator') {
      fetchSkills(!adminView);
    } else {
      fetchSkills();
    }
  }, [fetchSkills, adminView, user?.role]);

  const handleCopyLink = () => {
    const safeName = user?.name.replace(/\s+/g, '_');
    const url = `${window.location.origin}/u/${safeName}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSkillClick = (skillName: string, initialStatus?: 'pending' | 'approved') => {
    if (isRealAdmin && !adminView) {
      navigate(`/skill/${encodeURIComponent(skillName)}?view=personal`);
    } else {
      if (isRealAdmin && adminView && initialStatus) {
        navigate(`/skill/${encodeURIComponent(skillName)}?status=${initialStatus}`);
      } else {
        navigate(`/skill/${encodeURIComponent(skillName)}`);
      }
    }
  };

  const isRealAdmin = user?.role === 'admin' || user?.role === 'moderator';
  const showAdminInterface = isRealAdmin && adminView;

  const getSkillBlockReason = (skillName: string) => {
    // Skills are NEVER blocked in admin/moderator view
    if (showAdminInterface) return null;
    
    // Check Race restrictions FIRST (requested priority)
    if (user?.race) {
        const race = user.race.toLowerCase();
        
        // Animagi restrictions
        if (skillName === 'Анимагия') {
            if (race.includes('вейла')) return 'ВЕЙЛАМ';
            if (race.includes('великан')) return 'ВЕЛИКАНАМ';
            if (race.includes('оборотень')) return 'ОБОРОТНЯМ';
        }

        // Mortimagic, Metamorphomagic, Providence restrictions
        if (['Мортимагия', 'Метаморфомагия', 'Провидение'].includes(skillName)) {
            if (race.includes('вейла')) return 'ВЕЙЛАМ';
            if (race.includes('оборотень')) return 'ОБОРОТНЯМ';
        }
        
        // Giant restrictions for multiple skills
        const blockedForGiants = [
            'Артефакторика', 
            'Магия пространства', 
            'Мортимагия', 
            'Самостоятельная левитация', 
            'Легилименция', 
            'Окклюменция', 
            'Метаморфомагия', 
            'Провидение',
            'Некромантия'
        ];
        
        // Vampire & Dhampir restrictions
        const blockedForVampires = [
            'Магия пространства', 
            'Телесный патронус', 
            'Трансгрессия', 
            'Метаморфомагия', 
            'Провидение'
        ];
        if (blockedForVampires.includes(skillName)) {
            if (race.includes('вампир')) return 'ВАМПИРАМ';
            if (race.includes('дампир')) return 'ДАМПИРАМ';
        }

        if (blockedForGiants.includes(skillName)) {
            if (race.includes('великан')) return 'ВЕЛИКАНАМ';
        }
    }

    // Check Mutually exclusive skills AFTER race checks
    const animagiaSkill = skills.find(s => s.name === 'Анимагия');
    const mortimagiaSkill = skills.find(s => s.name === 'Мортимагия');
    const spaceMagicSkill = skills.find(s => s.name === 'Магия пространства');
    const transgressionSkill = skills.find(s => s.name === 'Трансгрессия');

    if (skillName === 'Мортимагия' && animagiaSkill && (animagiaSkill.progress > 0 || animagiaSkill.level > 0)) {
        return 'АНИМАГАМ НЕДОСТУПНА МОРТИМАГИЯ';
    }
    if (skillName === 'Анимагия' && mortimagiaSkill && (mortimagiaSkill.progress > 0 || mortimagiaSkill.level > 0)) {
        return 'МОРТИМАГАМ НЕДОСТУПНА АНИМАГИЯ';
    }
    if (skillName === 'Трансгрессия' && spaceMagicSkill && (spaceMagicSkill.progress > 0 || spaceMagicSkill.level > 0)) {
        return 'МАГАМ ПРОСТРАНСТВА НЕДОСТУПНА ТРАНСГРЕССИЯ';
    }
    if (skillName === 'Магия пространства' && transgressionSkill && (transgressionSkill.progress > 0 || transgressionSkill.level > 0)) {
        return 'ТРАНСГРЕССИРУЮЩИМ НЕДОСТУПНА МАГИЯ ПРОСТРАНСТВА';
    }

    return null;
  };

  // Filter categories for Moderator view
  const visibleCategories = React.useMemo(() => {
    if (user?.role === 'moderator' && showAdminInterface) {
        return SKILL_CATEGORIES.map(cat => ({
            ...cat,
            skills: cat.skills.filter(skill => user.managed_skills?.includes(skill))
        })).filter(cat => cat.skills.length > 0);
    }
    return SKILL_CATEGORIES;
  }, [user, showAdminInterface]);

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

      {/* Content */}
      <div className="relative z-20 min-h-screen flex flex-col">
        <div className="max-w-4xl mx-auto p-4 md:p-8 w-full mt-4 md:mt-8">
        
        <div className="mb-8 text-center px-4">
            <button
                onClick={() => navigate('/wizards')}
                className="inline-flex items-center justify-center gap-2 text-white hover:text-hogwarts-gold font-bold font-century text-sm md:text-lg transition-colors border-b-2 border-transparent hover:border-hogwarts-gold shadow-sm whitespace-normal text-center leading-tight"
            >
                <Users className="w-5 h-5 shrink-0" />
                Список всех зарегистрированных волшебников
            </button>
        </div>

        <div className="relative mb-8 md:mb-12">
          <img
            src={frameSvg}
            alt="Frame"
            className="absolute inset-0 w-full h-full object-fill z-0 pointer-events-none select-none hidden md:block [@media(orientation:landscape)]:block"
          />
           <div className="absolute inset-0 border-2 border-hogwarts-gold/50 bg-black/40 md:hidden rounded-lg [@media(orientation:landscape)]:hidden"></div>

          <div className="relative z-50 flex flex-col md:flex-row [@media(orientation:landscape)]:flex-row justify-between items-center px-4 py-6 md:px-12 md:py-6 [@media(orientation:landscape)]:px-10 gap-4 md:gap-0">
            <div className="flex flex-col md:flex-row [@media(orientation:landscape)]:flex-row items-center gap-4 text-center md:text-left [@media(orientation:landscape)]:text-left [@media(orientation:landscape)]:pl-3">
              <div className="relative md:-ml-4 [@media(orientation:landscape)]:-ml-4">
                <div 
                    className={`w-12 h-12 md:w-16 md:h-16 bg-hogwarts-blue rounded-full flex items-center justify-center border-2 border-hogwarts-gold shadow-lg text-hogwarts-gold shrink-0 overflow-hidden relative ${!showAdminInterface ? 'cursor-pointer group' : ''}`}
                    onClick={!showAdminInterface ? handleAvatarClick : undefined}
                >
                  {user?.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                      <GraduationCap className="w-8 h-8" />
                  )}
                  
                  {!showAdminInterface && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Upload className="w-6 h-6 text-white" />
                      </div>
                  )}
                  
                  {isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
                      </div>
                  )}
                </div>

                {!showAdminInterface && user?.avatar_url && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowAvatarModal(true);
                        }}
                        className="absolute -bottom-2 -right-2 md:bottom-0 md:right-0 md:translate-x-1/4 md:translate-y-1/4 bg-hogwarts-gold text-hogwarts-ink p-1 rounded-full shadow-md hover:bg-yellow-400 transition-colors z-20"
                        title="Посмотреть фото"
                    >
                        <Maximize2 className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                )}
              </div>

              <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
              />

              <div>
                <div className="flex items-center gap-4 justify-center md:justify-start [@media(orientation:landscape)]:justify-start">
                    <h2 className="text-xl md:text-4xl text-hogwarts-gold font-seminaria font-bold">
                        {showAdminInterface ? 'Информация о навыках' : 'Личный кабинет'}
                    </h2>
                    <Notifications />
                </div>
                <div className="flex flex-col md:flex-row [@media(orientation:landscape)]:flex-row items-center gap-2 md:gap-4 justify-center md:justify-start [@media(orientation:landscape)]:justify-start">
                  <p className="text-white text-sm md:text-lg font-century font-normal">
                    Добро пожаловать, {user?.name || 'Волшебник'}
                  </p>
                </div>
                <div className="flex flex-col md:flex-row [@media(orientation:landscape)]:flex-row items-center gap-4 mt-1 justify-center md:justify-start [@media(orientation:landscape)]:justify-start">
                  {!showAdminInterface && (
                    <button 
                        onClick={handleCopyLink}
                        className="text-xs flex items-center justify-center md:justify-start [@media(orientation:landscape)]:justify-start gap-1 text-white hover:text-hogwarts-gold font-nexa underline uppercase w-full md:w-auto [@media(orientation:landscape)]:w-auto"
                    >
                        {copied ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                        {copied ? 'Ссылка скопирована' : 'Поделиться профилем'}
                    </button>
                  )}
                  {isRealAdmin && (
                    <button
                      onClick={() => setAdminView(!adminView)}
                      className="bg-hogwarts-gold text-hogwarts-ink font-century font-bold px-4 py-1 rounded-xl hover:bg-yellow-500 transition-colors shadow-md text-xs md:text-sm whitespace-nowrap w-full md:w-auto [@media(orientation:landscape)]:w-auto"
                    >
                      {adminView ? 'Мои навыки' : 'Панель администратора'}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto [@media(orientation:landscape)]:w-auto md:items-end [@media(orientation:landscape)]:items-end">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2 text-hogwarts-gold hover:text-yellow-200 font-bold font-century px-4 py-2 border-2 border-transparent hover:border-hogwarts-gold rounded transition-all w-full md:w-auto [@media(orientation:landscape)]:w-auto justify-center md:justify-end [@media(orientation:landscape)]:justify-end"
              >
                <Settings className="w-5 h-5" />
                Настройки
              </button>
              <button
                onClick={signOut}
                className="flex items-center gap-2 text-hogwarts-gold hover:text-yellow-200 font-bold font-century px-4 py-2 border-2 border-transparent hover:border-hogwarts-gold rounded transition-all w-full md:w-auto [@media(orientation:landscape)]:w-auto justify-center md:justify-end [@media(orientation:landscape)]:justify-end"
              >
                <LogOut className="w-5 h-5" />
                Выйти
              </button>
            </div>
          </div>
        </div>

        {showSettingsModal && (
          <SettingsModal onClose={() => setShowSettingsModal(false)} />
        )}

        <div className="space-y-12">
          {visibleCategories.map((category) => (
            <div key={category.name} className="relative">
              <button 
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center gap-4 mb-6 group text-left"
              >
                 <div className="h-[1px] bg-hogwarts-gold/50 flex-grow group-hover:bg-hogwarts-gold transition-colors"></div>
                 <h2 className="text-2xl md:text-3xl font-seminaria font-bold text-hogwarts-gold group-hover:text-yellow-400 transition-colors flex items-center gap-2">
                    {category.name}
                    {expandedCategories[category.name] ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                 </h2>
                 <div className="h-[1px] bg-hogwarts-gold/50 flex-grow group-hover:bg-hogwarts-gold transition-colors"></div>
              </button>

              {expandedCategories[category.name] && (
                <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-2 gap-3 md:gap-8 animate-fadeIn">
                  {category.skills.map((skillName) => {
                     const originalSkill = skills.find(s => s.name === skillName);
                     if (!originalSkill) return null;
                     
                     const blockReason = getSkillBlockReason(skillName);
                     const isBlocked = !!blockReason;
                     
                     // Force 0% progress if blocked
                     const skill = isBlocked ? { ...originalSkill, progress: 0 } : originalSkill;
                     
                     return (
                        <div 
                          key={`${category.name}-${skill.id}`} 
                          className={`px-8 py-4 md:p-12 rounded-lg shadow-md relative overflow-hidden group hover:shadow-xl transition-all bg-no-repeat bg-center bg-[length:100%_100%] md:bg-contain ${isBlocked ? 'opacity-60 grayscale-[0.3]' : ''} flex flex-col items-center justify-center gap-2 md:gap-3 min-h-[140px] md:min-h-[200px] [@media(orientation:portrait)]:py-5 [@media(orientation:portrait)]:min-h-[160px]`}
                          style={{ backgroundImage: `url(${scrollImg})` }}
                        >
                          {isBlocked && (
                            <div className="absolute inset-0 bg-black/30 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none px-6">
                                <span className="text-white font-bold text-center text-xs md:text-sm lg:text-base leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] uppercase" style={{ fontFamily: 'RobotoforLearning-Medium_0' }}>
                                    {blockReason.includes('НЕДОСТУПНА') || blockReason.includes('НЕДОСТУПНО') ? blockReason : `ЭТОТ НАВЫК НЕДОСТУПЕН ${blockReason}`}
                                </span>
                            </div>
                          )}
                          <div className="flex flex-col justify-center items-center gap-1 md:gap-0">
                            <div className="flex items-center justify-center w-full relative px-2 gap-1">
                                <h3 
                                onClick={() => !isBlocked && handleSkillClick(skill.name)}
                                className={`font-seminaria font-bold text-hogwarts-blue whitespace-nowrap transform translate-y-[10px] md:translate-y-[12px] ${getSkillTitleClass(skill.name)} ${isBlocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:underline decoration-hogwarts-gold underline-offset-4'}`}
                                >
                                {skill.name === 'Самостоятельная левитация' ? 'Самост. левитация' : skill.name}
                                </h3>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSkillInfo(skill.name);
                                    }}
                                    className="p-1 text-hogwarts-blue/50 hover:text-hogwarts-blue transition-colors rounded-full hover:bg-hogwarts-blue/10 shrink-0"
                                    title="Информация о навыке"
                                >
                                    <Info className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                            </div>
                            {!showAdminInterface && (
                                <div className="flex items-center gap-2 mt-2">
                                    {EXAM_REQUIRED_SKILLS.includes(skill.name) && skill.progress >= 90 && skill.progress < 100 && !isBlocked && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedSkill(skill.name);
                                                setIsExamMode(true);
                                                setIsApplicationMode(false);
                                            }}
                                            className="px-3 py-1 rounded-full text-white font-bold text-[10px] md:text-xs shadow-md hover:shadow-lg transition-all hover:scale-105"
                                            style={{ backgroundColor: '#006633', fontFamily: 'RobotoforLearning-Medium_0' }}
                                        >
                                            СДАТЬ ЭКЗАМЕН
                                        </button>
                                    )}
                                    {!EXAM_REQUIRED_SKILLS.includes(skill.name) && skill.progress >= 90 && skill.progress < 100 && !isBlocked && (
                                        <>
                                            {skill.completionStatus === 'pending' ? (
                                                 <span className="text-[10px] md:text-xs font-bold text-hogwarts-gold bg-hogwarts-ink/50 px-2 py-1 rounded">
                                                     Заявка на рассмотрении
                                                 </span>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCompletionRequest(skill.name);
                                                    }}
                                                    className="px-3 py-1 rounded-full text-white text-[10px] md:text-xs shadow-md hover:shadow-lg transition-all hover:scale-105"
                                                    style={{ backgroundColor: '#006633', fontFamily: 'RobotoforLearning-Medium_0' }}
                                                >
                                                    ПОДАТЬ ЗАЯВКУ НА ЗАВЕРШЕНИЕ
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                          </div>

                          {showAdminInterface ? (
                              // Admin View: Numbers
                              <div 
                                className={`flex items-center justify-center gap-4 cursor-pointer relative ${isBlocked ? 'opacity-50' : ''}`}
                              >
                                  <div 
                                    className="flex flex-col items-center"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isBlocked) {
                                        handleSkillClick(skill.name, 'approved');
                                      }
                                    }}
                                  >
                                      <span className="text-[10px] uppercase text-hogwarts-ink/50 font-bold font-nexa text-center">Одобрено</span>
                                      <span className="text-2xl md:text-3xl font-magical text-black">{skill.approvedCount || 0}</span>
                                  </div>
                                  <div 
                                    className="flex flex-col items-center"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isBlocked) {
                                        handleSkillClick(skill.name, 'pending');
                                      }
                                    }}
                                  >
                                      <span className="text-[10px] uppercase text-hogwarts-ink/50 font-bold font-nexa text-center">На проверке</span>
                                      <span className="text-2xl md:text-3xl font-magical text-hogwarts-green">+{skill.pendingCount || 0}</span>
                                  </div>
                              </div>
                          ) : (
                              // User View: Progress Bar
                              <>
                                {skill.isLocked ? (
                                    <div className="flex flex-col items-center gap-2">
                                         <button
                                             onClick={(e) => {
                                                 e.stopPropagation();
                                                 if (skill.applicationStatus === 'pending' || isBlocked) return;
                                                 setSelectedSkill(skill.name);
                                                 setIsApplicationMode(true);
                                                 setIsExamMode(false);
                                             }}
                                             disabled={skill.applicationStatus === 'pending' || isBlocked}
                                            className={`px-4 py-1.5 rounded-full text-white font-bold text-[10px] md:text-sm shadow-md transition-all font-nexa uppercase ${
                                               isBlocked
                                                 ? 'bg-gray-500 cursor-not-allowed'
                                                 : skill.applicationStatus === 'pending' 
                                                     ? 'bg-gray-400 cursor-not-allowed' 
                                                     : (skill.applicationStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700 hover:shadow-lg' : 'bg-[#006633] hover:shadow-lg')
                                            }`}
                                        >
                                             {isBlocked 
                                                ? 'НЕДОСТУПНО'
                                                : skill.applicationStatus === 'pending' 
                                                    ? 'Заявка на рассмотрении' 
                                                    : (skill.applicationStatus === 'rejected' ? 'Заявка отклонена (Повторить)' : 'Подать заявку')}
                                         </button>
                                         {(skill.applicationStatus === 'pending' || skill.applicationStatus === 'rejected') && !isBlocked && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/skill/${encodeURIComponent(skill.name)}`);
                                                }}
                                                className="text-xs text-hogwarts-gold/70 hover:text-hogwarts-gold underline underline-offset-2 font-serif transition-colors"
                                            >
                                                Просмотреть заявку
                                            </button>
                                         )}
                                     </div>
                            ) : (
                            <>
                                <div className="flex items-center justify-center gap-3 w-full mt-0 md:mt-0">
                                    <div className="relative shrink-0">
                                        <img
                                            src={textSvg}
                                            alt="Количество постов"
                                            className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-[0_0_4px_rgba(0,0,0,0.45)]"
                                        />
                                        <span
                                            className="absolute left-1/2 top-[78%] md:top-[78%] -translate-x-1/2 -translate-y-1/2 text-[8px] md:text-[10px] text-hogwarts-parchment leading-none drop-shadow-[0_0_2px_rgba(0,0,0,0.9)]"
                                            style={{ fontFamily: 'RobotoforLearning-Medium_0' }}
                                        >
                                            {skill.totalPosts ?? 0}
                                        </span>
                                    </div>
                                    <div 
                                        data-skill-tooltip-container="true"
                                        className={`flex-1 max-w-[55%] md:max-w-[60%] h-4 md:h-5 bg-hogwarts-silver/20 rounded-full border border-hogwarts-bronze overflow-hidden ${isBlocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        onClick={(e) => {
                                            if (isBlocked) return;
                                            if (isTouchDevice) {
                                                e.stopPropagation();
                                                if (activeTooltip !== skill.name) {
                                                    setActiveTooltip(skill.name);
                                                }
                                                return;
                                            }
                                            handleSkillClick(skill.name);
                                        }}
                                    >
                                        <div
                                            className={`h-full overflow-hidden relative ${animateProgress ? 'transition-all duration-1000 ease-out' : ''}`}
                                            style={{ width: `${skill.progress}%` }}
                                        >
                                            <div 
                                                className={`h-full bg-gradient-to-r from-hogwarts-red via-hogwarts-gold to-hogwarts-green absolute top-0 left-0 ${isBlocked ? 'grayscale' : ''}`}
                                                style={{ width: `${skill.progress > 0 ? (100 / skill.progress * 100) : 0}%` }}
                                            >
                                                <div className="absolute inset-0 bg-white/10 opacity-30"></div>
                                            </div>
                                        </div>
                                    </div>
                                    {!skill.isLocked && !isBlocked && !skill.ageCapMessage && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedSkill(skill.name);
                                                setIsExamMode(false);
                                                setIsApplicationMode(false);
                                            }}
                                            className="shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full transition-transform hover:scale-105 flex items-center justify-center"
                                            title="Practise this skill"
                                        >
                                            <img
                                                src={addSvg}
                                                alt="Добавить пост"
                                                className="w-2/3 h-2/3"
                                            />
                                        </button>
                                    )}
                                </div>
                                        
                                        <div className="mt-0 md:mt-0 flex justify-center text-[10px] font-bold text-hogwarts-ink/70 font-nexa uppercase gap-2 relative z-1 transform -translate-y-[8px]">
                                            
                                            {/* Tooltip positioned relative to the container (center of progress bar) */}
                                            {getSkillNextStepInfo(skill) && !isBlocked && (
                                                <div className={`
                                                    absolute bottom-full mb-2 px-3 py-2 left-1/2 -translate-x-1/2
                                                    bg-black text-white text-xs rounded-md shadow-xl whitespace-nowrap z-50
                                                    border border-hogwarts-gold/30
                                                    after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-black
                                                    ${activeTooltip === skill.name ? 'block' : 'hidden'}
                                                `}>
                                                    {getSkillNextStepInfo(skill)}
                                                </div>
                                            )}

                                            <div 
                                                data-skill-tooltip-container="true"
                                                className={`relative group inline-flex flex-col items-center ${isBlocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isBlocked) return;
                                                    if (isTouchDevice) {
                                                        if (activeTooltip !== skill.name) {
                                                            setActiveTooltip(skill.name);
                                                        }
                                                        return;
                                                    }
                                                    setActiveTooltip(activeTooltip === skill.name ? null : skill.name);
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.stopPropagation();
                                                    if (!isBlocked) {
                                                        setActiveTooltip(skill.name);
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.stopPropagation();
                                                    if (!isBlocked) {
                                                        setActiveTooltip(null);
                                                    }
                                                }}
                                            >
                                                <span>{skill.progress}%</span>
                                            </div>
                                            {skill.level && (
                                                <span className="text-hogwarts-blue">{skill.level}-й уровень</span>
                                            )}
                                        </div>
                                    </>
                                )}
                              </>
                          )}
                        </div>
                     );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <PracticeModal
        skillName={selectedSkill || ''}
        isOpen={!!selectedSkill}
        onClose={() => {
            setSelectedSkill(null);
            setIsExamMode(false);
        }}
        viewAsUser={!showAdminInterface}
        isExam={isExamMode}
        isApplication={isApplicationMode}
      />
      
      {imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      <SkillInfoModal
        isOpen={!!selectedSkillInfo}
        onClose={() => setSelectedSkillInfo(null)}
        title={selectedSkillInfo || ''}
        description={selectedSkillInfo ? (SKILL_DESCRIPTIONS[selectedSkillInfo] || '') : ''}
      />

      <ImageModal 
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          imageUrl={user?.avatar_url || ''}
          altText={user?.name || 'Avatar'}
      />
      </div>
    </div>
  );
};
