import React, { useEffect, useState, useRef } from 'react';
import { Plus, LogOut, GraduationCap, Share2, Check, FileText, Users, ChevronDown, ChevronUp, Info, Maximize2, Upload } from 'lucide-react';
import { Notifications } from '../components/Notifications';
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

export const Dashboard: React.FC = () => {
  const { user, skills, fetchSkills, signOut, addPracticeLog } = useStore();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [selectedSkillInfo, setSelectedSkillInfo] = useState<string | null>(null);
  const [isExamMode, setIsExamMode] = useState(false);
  const [isApplicationMode, setIsApplicationMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const [adminView, setAdminView] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSkillClick = (skillName: string) => {
    if (isRealAdmin && !adminView) {
      navigate(`/skill/${encodeURIComponent(skillName)}?view=personal`);
    } else {
      navigate(`/skill/${encodeURIComponent(skillName)}`);
    }
  };

  const isRealAdmin = user?.role === 'admin' || user?.role === 'moderator';
  const showAdminInterface = isRealAdmin && adminView;

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
            className="absolute inset-0 w-full h-full object-fill z-0 pointer-events-none select-none hidden md:block"
          />
           <div className="absolute inset-0 border-2 border-hogwarts-gold/50 bg-black/40 md:hidden rounded-lg"></div>

          <div className="relative z-50 flex flex-col md:flex-row justify-between items-center px-4 py-6 md:px-12 md:py-6 gap-4 md:gap-0">
            <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
              <div className="relative">
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
                <div className="flex items-center gap-4 justify-center md:justify-start">
                    <h2 className="text-xl md:text-4xl text-hogwarts-gold font-seminaria font-bold">
                        {showAdminInterface ? 'Информация о навыках' : 'Личный кабинет'}
                    </h2>
                    <Notifications />
                </div>
                <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 justify-center md:justify-start">
                  <p className="text-white text-sm md:text-lg font-century font-normal">
                    Добро пожаловать, {user?.name || 'Волшебник'}
                  </p>
                  {isRealAdmin && (
                    <button
                      onClick={() => setAdminView(!adminView)}
                      className="bg-hogwarts-gold text-hogwarts-ink font-century font-bold px-4 py-1 rounded-xl hover:bg-yellow-500 transition-colors shadow-md text-xs md:text-sm mt-2 md:mt-0 w-full md:w-auto"
                    >
                      {adminView ? 'Мои навыки' : 'Панель администратора'}
                    </button>
                  )}
                </div>
                {!showAdminInterface && (
                  <button 
                      onClick={handleCopyLink}
                      className="text-xs flex items-center justify-center md:justify-start gap-1 text-white hover:text-hogwarts-gold mt-1 font-nexa underline uppercase w-full md:w-auto"
                  >
                      {copied ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                      {copied ? 'Ссылка скопирована' : 'Поделиться профилем'}
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-hogwarts-gold hover:text-yellow-200 font-bold font-century px-4 py-2 border-2 border-transparent hover:border-hogwarts-gold rounded transition-all w-full md:w-auto justify-center"
            >
              <LogOut className="w-5 h-5" />
              Выйти
            </button>
          </div>
        </div>

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 animate-fadeIn">
                  {category.skills.map((skillName) => {
                     const skill = skills.find(s => s.name === skillName);
                     if (!skill) return null;
                     
                     return (
                        <div 
                          key={`${category.name}-${skill.id}`} 
                          className="p-4 md:p-12 rounded-lg shadow-md relative overflow-hidden group hover:shadow-xl transition-shadow bg-no-repeat bg-center bg-cover md:bg-contain"
                          style={{ backgroundImage: `url(${scrollImg})` }}
                        >
                          <div className="flex flex-col justify-between items-center mb-2 gap-1 md:gap-0">
                            <div className="flex items-center justify-center w-full relative px-2 gap-1">
                                <h3 
                                onClick={() => handleSkillClick(skill.name)}
                                className={`font-seminaria font-bold text-hogwarts-blue cursor-pointer hover:underline decoration-hogwarts-gold underline-offset-4 whitespace-nowrap ${getSkillTitleClass(skill.name)}`}
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
                                    {EXAM_REQUIRED_SKILLS.includes(skill.name) && skill.progress >= 90 && skill.progress < 100 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedSkill(skill.name);
                                                setIsExamMode(true);
                                                setIsApplicationMode(false);
                                            }}
                                            className="px-3 py-1 rounded-full text-white font-bold text-xs shadow-md hover:shadow-lg transition-all hover:scale-105"
                                            style={{ backgroundColor: '#006633', fontFamily: 'RobotoforLearning-Medium_0' }}
                                        >
                                            СДАТЬ ЭКЗАМЕН
                                        </button>
                                    )}
                                    {!EXAM_REQUIRED_SKILLS.includes(skill.name) && skill.progress >= 90 && skill.progress < 100 && (
                                        <>
                                            {skill.completionStatus === 'pending' ? (
                                                 <span className="text-xs font-bold text-hogwarts-gold bg-hogwarts-ink/50 px-2 py-1 rounded">
                                                     Заявка на рассмотрении
                                                 </span>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCompletionRequest(skill.name);
                                                    }}
                                                    className="px-3 py-1 rounded-full text-white text-xs shadow-md hover:shadow-lg transition-all hover:scale-105"
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
                                className="flex items-center justify-center gap-6 cursor-pointer relative"
                                onClick={() => handleSkillClick(skill.name)}
                              >
                                  <div className="flex flex-col items-center">
                                  <span className="text-xs uppercase text-hogwarts-ink/50 font-bold font-nexa text-center">Одобрено</span>
                                  <span className="text-3xl font-magical text-black">{skill.approvedCount || 0}</span>
                              </div>
                              <div className="flex flex-col items-center">
                                  <span className="text-xs uppercase text-hogwarts-ink/50 font-bold font-nexa text-center">На проверке</span>
                                  <span className="text-3xl font-magical text-hogwarts-green">+{skill.pendingCount || 0}</span>
                              </div>
                                  <div className="absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <FileText className="w-6 h-6 text-hogwarts-blue" />
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
                                                 if (skill.applicationStatus === 'pending') return;
                                                 setSelectedSkill(skill.name);
                                                 setIsApplicationMode(true);
                                                 setIsExamMode(false);
                                             }}
                                             disabled={skill.applicationStatus === 'pending'}
                                            className={`px-4 py-1.5 rounded-full text-white font-bold text-sm shadow-md transition-all font-nexa uppercase ${
                                               skill.applicationStatus === 'pending' 
                                                 ? 'bg-gray-400 cursor-not-allowed' 
                                                 : (skill.applicationStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700 hover:shadow-lg' : 'bg-[#006633] hover:shadow-lg')
                                            }`}
                                        >
                                             {skill.applicationStatus === 'pending' 
                                                ? 'Заявка на рассмотрении' 
                                                : (skill.applicationStatus === 'rejected' ? 'Заявка отклонена (Повторить)' : 'Подать заявку')}
                                         </button>
                                         {(skill.applicationStatus === 'pending' || skill.applicationStatus === 'rejected') && (
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
                                        <div className="flex items-center justify-center gap-3 w-[95%] mx-auto md:w-full">
                                            <div 
                                                className="flex-grow h-4 md:h-5 bg-hogwarts-silver/20 rounded-full border border-hogwarts-bronze overflow-hidden cursor-pointer"
                                                onClick={() => handleSkillClick(skill.name)}
                                            >
                                                <div
                                                    className="h-full overflow-hidden transition-all duration-1000 ease-out relative"
                                                    style={{ width: `${skill.progress}%` }}
                                                >
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-hogwarts-red via-hogwarts-gold to-hogwarts-green absolute top-0 left-0"
                                                        style={{ width: `${skill.progress > 0 ? (100 / skill.progress * 100) : 0}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/10 opacity-30"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            {!skill.isLocked && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSkill(skill.name);
                                                        setIsExamMode(false);
                                                        setIsApplicationMode(false);
                                                    }}
                                                    className="shrink-0 p-1.5 bg-hogwarts-green text-hogwarts-gold rounded-full hover:bg-green-900 transition-colors shadow-md border border-hogwarts-gold"
                                                    title="Практиковать этот навык"
                                                >
                                                    <Plus className="w-4 h-4 md:w-5 md:h-5" />
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="mt-2 flex justify-center text-[10px] font-bold text-hogwarts-ink/70 font-nexa uppercase gap-2 relative z-1">
                                            {/* Tooltip positioned relative to the container (center of progress bar) */}
                                            {getSkillNextStepInfo(skill) && (
                                                <div className={`
                                                    absolute bottom-full mb-2 px-3 py-2 left-1/2 -translate-x-1/2
                                                    bg-hogwarts-ink text-white text-xs rounded-md shadow-xl whitespace-nowrap z-50
                                                    border border-hogwarts-gold/30
                                                    after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-hogwarts-ink
                                                    ${activeTooltip === skill.name ? 'block' : 'hidden group-hover:block'}
                                                `}>
                                                    {getSkillNextStepInfo(skill)}
                                                </div>
                                            )}

                                            <div 
                                                className="relative group cursor-pointer inline-flex flex-col items-center"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveTooltip(activeTooltip === skill.name ? null : skill.name);
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
