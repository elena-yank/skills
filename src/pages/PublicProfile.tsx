import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { GraduationCap, ArrowLeft, Loader2, ChevronDown, ChevronUp, Info, Maximize2 } from 'lucide-react';
import { SKILL_CATEGORIES, useStore } from '../store';
import { SkillInfoModal } from '../components/SkillInfoModal';
import { ImageModal } from '../components/ImageModal';
import { GrantSkillModal } from '../components/GrantSkillModal';
import { SKILL_DESCRIPTIONS } from '../data/skillDescriptions';
import { calculateSkillProgress, calculateSpecialSkillStatus, SKILL_THRESHOLDS, EXAM_REQUIRED_SKILLS, getSkillTitleClass } from '../lib/skillUtils';
import { User } from '../lib/api/types';
import castleImg from '../assets/castle.png';
import scrollImg from '../assets/scroll.png';
import frameSvg from '../assets/frame.svg';

interface Skill {
  id: string;
  name: string;
  progress: number;
  level?: number;
  applicationStatus?: string;
  approvedCount?: number;
  hasExamPassed?: boolean;
}

const ALL_SKILLS = Array.from(new Set(SKILL_CATEGORIES.flatMap(c => c.skills)));

export const PublicProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [selectedSkillInfo, setSelectedSkillInfo] = useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user: currentUser } = useStore();
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantTargetSkill, setGrantTargetSkill] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const getDeclension = (number: number, titles: [string, string, string]) => {
      const cases = [2, 0, 1, 1, 1, 2];
      return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
  };

  const getSkillNextStepInfo = (skill: Skill) => {
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
        if (skill.hasExamPassed) return 'Максимальный уровень';

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

  const fetchProfile = async () => {
    if (!username) return;

    setIsLoading(true);
    try {
      // Replace underscores with spaces to find the user in DB
      const dbName = username?.replace(/_/g, ' ');

      // 1. Find user by name (case insensitive search)
      const userData = await api.auth.getUserByName(dbName || '');

      if (!userData) {
        throw new Error('Волшебник не найден');
      }
      setUser(userData);

      // 2. Fetch logs
      const logsData = await api.logs.list(userData.id);

      // 3. Calculate progress
      const progressMap = new Map<string, number>();
      const examPassedMap = new Map<string, boolean>();
      const applicationStatusMap = new Map<string, string>();
      
      logsData?.forEach(log => {
        if (log.status === 'approved') {
            const current = progressMap.get(log.skill_name) || 0;
            progressMap.set(log.skill_name, current + 1);
        }
        if (log.status === 'exam_passed' || log.status === 'study_completed') {
            examPassedMap.set(log.skill_name, true);
            const current = progressMap.get(log.skill_name) || 0;
            progressMap.set(log.skill_name, current + 1);
        }
        if (log.type === 'application') {
            // Prefer approved status if multiple exist (unlikely but safe)
            const existing = applicationStatusMap.get(log.skill_name);
            if (existing !== 'approved') {
                applicationStatusMap.set(log.skill_name, log.status);
            }
        }
      });

      const calculatedSkills = ALL_SKILLS.map(name => {
          const count = progressMap.get(name) || 0;
          const hasExamPassed = examPassedMap.get(name) || false;
          
          if (['Метаморфомагия', 'Провидение'].includes(name)) {
              const { level, progress } = calculateSpecialSkillStatus(count);
              
              return {
                  id: name,
                  name,
                  progress,
                  level,
                  applicationStatus: applicationStatusMap.get(name),
                  approvedCount: count
              };
          }

          return {
              id: name,
              name,
              progress: calculateSkillProgress(name, count, hasExamPassed),
              applicationStatus: applicationStatusMap.get(name),
              approvedCount: count,
              hasExamPassed
          };
      });

      setSkills(calculatedSkills);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const handleGrantSkill = async (reason: string) => {
        if (!grantTargetSkill || !user || !currentUser) return;
        await api.admin.grantSkill(user.id, grantTargetSkill, reason, currentUser.id);
        await fetchProfile();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hogwarts-blue relative">
        <div className="absolute inset-0 z-0">
            <img src={castleImg} alt="Castle" className="w-full h-full object-cover opacity-50" />
        </div>
        <div className="relative z-10 p-8 bg-white/90 rounded-lg shadow-xl">
             <Loader2 className="w-8 h-8 animate-spin text-hogwarts-red mx-auto" />
             <p className="mt-4 font-serif text-hogwarts-ink">Поиск волшебника...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-hogwarts-blue relative">
        <div className="absolute inset-0 z-0">
            <img src={castleImg} alt="Castle" className="w-full h-full object-cover opacity-50" />
        </div>
        <div className="relative z-10 p-8 bg-white/90 rounded-lg shadow-xl text-center max-w-md">
             <h2 className="text-2xl font-magical text-hogwarts-red mb-2">Ошибка</h2>
             <p className="font-serif text-hogwarts-ink mb-6">{error}</p>
             <button
               onClick={() => navigate('/')}
               className="px-6 py-2 bg-hogwarts-blue text-white rounded hover:bg-hogwarts-blue/90 font-serif"
             >
               На главную
             </button>
        </div>
      </div>
    );
  }

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
            <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-white hover:text-hogwarts-gold mb-8 font-magical font-bold transition-colors font-serif"
            >
                <ArrowLeft className="w-5 h-5" />
                На главную
            </button>

            <div className="relative mb-8 md:mb-12">
                <img
                  src={frameSvg}
                  alt="Frame"
                  className="absolute inset-0 w-full h-full object-fill z-0 pointer-events-none select-none hidden md:block"
                />
                 <div className="absolute inset-0 border-2 border-hogwarts-gold/50 bg-black/40 md:hidden rounded-lg"></div>

                <div className="relative z-10 flex flex-col md:flex-row gap-4 items-center px-4 py-6 md:px-12 md:py-8">
                    <div className="relative">
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-hogwarts-blue rounded-full flex items-center justify-center border-4 border-hogwarts-gold shadow-lg text-hogwarts-gold shrink-0 overflow-hidden relative">
                            {user?.avatar_url ? (
                                <img 
                                    src={user.avatar_url} 
                                    alt={user.name} 
                                    className="w-full h-full object-cover cursor-pointer" 
                                    onClick={() => setShowAvatarModal(true)}
                                />
                            ) : (
                                <GraduationCap className="w-8 h-8 md:w-12 md:h-12" />
                            )}
                        </div>
                        {user?.avatar_url && (
                            <button
                                onClick={() => setShowAvatarModal(true)}
                                className="absolute -bottom-1 -right-1 md:bottom-0 md:right-0 translate-x-1/4 translate-y-1/4 bg-hogwarts-gold text-hogwarts-ink p-1 md:p-1.5 rounded-full shadow-md hover:bg-yellow-400 transition-colors z-20"
                                title="Посмотреть фото"
                            >
                                <Maximize2 className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                        )}
                    </div>
                    
                    <ImageModal 
                        isOpen={showAvatarModal}
                        onClose={() => setShowAvatarModal(false)}
                        imageUrl={user?.avatar_url || ''}
                        altText={user?.name || 'Avatar'}
                    />

                    <div className="text-center md:text-left">
                        <h2 className="text-xl md:text-4xl text-hogwarts-gold font-seminaria font-bold mb-1">{username?.replace(/_/g, ' ')}</h2>
                        <p className="text-white text-base md:text-xl font-century">
                            Карточка навыков
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-12">
            {SKILL_CATEGORIES.map((category) => (
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
                            
                            const canModerate = currentUser?.role === 'admin' || (currentUser?.role === 'moderator' && currentUser?.managed_skills?.includes(skill.name));

                            return (
                                <div 
                                key={`${category.name}-${skill.id}`} 
                                onClick={() => navigate(`/u/${username}/skill/${encodeURIComponent(skill.name)}`)}
                                className="p-4 md:p-12 rounded-lg shadow-md relative overflow-hidden group hover:shadow-xl transition-shadow bg-no-repeat bg-center bg-cover md:bg-contain cursor-pointer"
                                style={{ backgroundImage: `url(${scrollImg})` }}
                                >
                                <div className="flex flex-col justify-between items-center mb-2 gap-1 md:gap-0">
                                    <div className="flex items-center gap-1 justify-center w-full relative px-1">
                                        <h3 className={`font-seminaria font-bold text-hogwarts-blue text-center whitespace-nowrap ${getSkillTitleClass(skill.name)}`}>
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
                                </div>

                                <div className="w-[95%] mx-auto md:w-full h-4 md:h-5 bg-hogwarts-silver/20 rounded-full border border-hogwarts-bronze overflow-hidden">
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
                                
                                <div className="mt-2 flex justify-center text-[10px] font-bold text-hogwarts-ink/70 font-nexa uppercase gap-2 relative z-10 w-full">
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
                                    
                                    {canModerate && skill.progress < 100 && (
                                         <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setGrantTargetSkill(skill.name);
                                                setGrantModalOpen(true);
                                            }}
                                            className="absolute right-0 top-1/2 -translate-y-1/2 bg-hogwarts-green text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-md hover:bg-hogwarts-green/90 transition-colors z-20"
                                            title="Повысить уровень до 100%"
                                        >
                                            +100%
                                        </button>
                                    )}

                                    {['Метаморфомагия', 'Провидение'].includes(skill.name) && skill.applicationStatus && skill.applicationStatus !== 'approved' && (
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`
                                                ${skill.applicationStatus === 'pending' ? 'text-hogwarts-gold' : ''}
                                                ${skill.applicationStatus === 'rejected' ? 'text-hogwarts-red' : ''}
                                            `}>
                                                {skill.applicationStatus === 'pending' && '(ЗАЯВКА НА РАССМОТРЕНИИ)'}
                                                {skill.applicationStatus === 'rejected' && '(ЗАЯВКА ОТКЛОНЕНА)'}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/u/${username}/skill/${encodeURIComponent(skill.name)}`);
                                                }}
                                                className="text-[10px] text-hogwarts-blue hover:text-hogwarts-gold underline underline-offset-2 transition-colors cursor-pointer"
                                            >
                                                Просмотреть заявку
                                            </button>
                                        </div>
                                    )}
                                </div>
                                </div>
                            );
                        })}
                        </div>
                    )}
                </div>
            ))}
            </div>
        </div>
      </div>
      
      <SkillInfoModal
        isOpen={!!selectedSkillInfo}
        onClose={() => setSelectedSkillInfo(null)}
        title={selectedSkillInfo || ''}
        description={selectedSkillInfo ? SKILL_DESCRIPTIONS[selectedSkillInfo] : ''}
      />

      <GrantSkillModal 
        isOpen={grantModalOpen}
        onClose={() => setGrantModalOpen(false)}
        onConfirm={handleGrantSkill}
        skillName={grantTargetSkill || ''}
        userName={user?.name || ''}
      />
    </div>
  );
};
