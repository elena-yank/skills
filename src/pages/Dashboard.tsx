import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Plus, LogOut, GraduationCap, Share2, Check, FileText, Users, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { SKILL_CATEGORIES } from '../store';
import { PracticeModal } from '../components/PracticeModal';
import { SkillInfoModal } from '../components/SkillInfoModal';
import { SKILL_DESCRIPTIONS } from '../data/skillDescriptions';
import { useNavigate } from 'react-router-dom';
import castleImg from '../assets/castle.png';
import scrollImg from '../assets/scroll.png';
import frameSvg from '../assets/frame.svg';

export const Dashboard: React.FC = () => {
  const { user, skills, fetchSkills, signOut } = useStore();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [selectedSkillInfo, setSelectedSkillInfo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const [adminView, setAdminView] = useState(true);
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
    if (user?.role === 'admin') {
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

  const isRealAdmin = user?.role === 'admin';
  const showAdminInterface = isRealAdmin && adminView;

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
        <div className="max-w-4xl mx-auto p-8 w-full mt-8">
        
        <div className="mb-8 text-center">
            <button
                onClick={() => navigate('/wizards')}
                className="inline-flex items-center gap-2 text-white hover:text-hogwarts-gold font-bold font-century text-lg transition-colors border-b-2 border-transparent hover:border-hogwarts-gold shadow-sm"
            >
                <Users className="w-5 h-5" />
                Список всех зарегистрированных волшебников
            </button>
        </div>

        <div className="relative mb-12">
          <img
            src={frameSvg}
            alt="Frame"
            className="absolute inset-0 w-full h-full object-fill z-0 pointer-events-none select-none"
          />
          <div className="relative z-10 flex justify-between items-center px-12 py-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-hogwarts-blue rounded-full flex items-center justify-center border-2 border-hogwarts-gold shadow-lg text-hogwarts-gold shrink-0">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-4xl text-hogwarts-gold font-seminaria font-bold">
                    {showAdminInterface ? 'Информация о навыках' : 'Личный кабинет'}
                </h2>
                <div className="flex items-center gap-4">
                  <p className="text-white text-lg font-century font-normal">
                    Добро пожаловать, {user?.name || 'Волшебник'}
                  </p>
                  {isRealAdmin && (
                    <button
                      onClick={() => setAdminView(!adminView)}
                      className="bg-hogwarts-gold text-hogwarts-ink font-century font-bold px-4 py-1 rounded-xl hover:bg-yellow-500 transition-colors shadow-md text-sm"
                    >
                      {adminView ? 'Мои навыки' : 'Панель администратора'}
                    </button>
                  )}
                </div>
                {!showAdminInterface && (
                  <button 
                      onClick={handleCopyLink}
                      className="text-xs flex items-center gap-1 text-white hover:text-hogwarts-gold mt-1 font-nexa underline uppercase"
                  >
                      {copied ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                      {copied ? 'Ссылка скопирована' : 'Поделиться профилем'}
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-hogwarts-gold hover:text-yellow-200 font-bold font-century px-4 py-2 border-2 border-transparent hover:border-hogwarts-gold rounded transition-all"
            >
              <LogOut className="w-5 h-5" />
              Выйти
            </button>
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
                 <h2 className="text-3xl font-seminaria font-bold text-hogwarts-gold group-hover:text-yellow-400 transition-colors flex items-center gap-2">
                    {category.name}
                    {expandedCategories[category.name] ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                 </h2>
                 <div className="h-[1px] bg-hogwarts-gold/50 flex-grow group-hover:bg-hogwarts-gold transition-colors"></div>
              </button>

              {expandedCategories[category.name] && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
                  {category.skills.map((skillName) => {
                     const skill = skills.find(s => s.name === skillName);
                     if (!skill) return null;
                     
                     return (
                        <div 
                          key={`${category.name}-${skill.id}`} 
                          className="p-12 rounded-lg shadow-md relative overflow-hidden group hover:shadow-xl transition-shadow bg-no-repeat bg-center bg-contain"
                          style={{ backgroundImage: `url(${scrollImg})` }}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <h3 
                                onClick={() => handleSkillClick(skill.name)}
                                className="text-2xl font-seminaria font-bold text-hogwarts-blue cursor-pointer hover:underline decoration-hogwarts-gold underline-offset-4"
                                >
                                {skill.name}
                                </h3>
                                {SKILL_DESCRIPTIONS[skill.name] && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedSkillInfo(skill.name);
                                        }}
                                        className="p-1 text-hogwarts-blue/50 hover:text-hogwarts-blue transition-colors rounded-full hover:bg-hogwarts-blue/10"
                                        title="Информация о навыке"
                                    >
                                        <Info className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                            {!showAdminInterface && (
                                <button
                                onClick={() => setSelectedSkill(skill.name)}
                                className="p-1.5 bg-hogwarts-green text-hogwarts-gold rounded-full hover:bg-green-900 transition-colors shadow-md border border-hogwarts-gold"
                                title="Практиковать этот навык"
                                >
                                <Plus className="w-5 h-5" />
                                </button>
                            )}
                          </div>

                          {showAdminInterface ? (
                              // Admin View: Numbers
                              <div 
                                className="flex items-center gap-6 cursor-pointer"
                                onClick={() => handleSkillClick(skill.name)}
                              >
                                  <div className="flex flex-col">
                                      <span className="text-xs uppercase text-hogwarts-ink/50 font-bold font-serif">Одобрено</span>
                                      <span className="text-3xl font-magical text-black">{skill.approvedCount || 0}</span>
                                  </div>
                                  <div className="flex flex-col">
                                      <span className="text-xs uppercase text-hogwarts-ink/50 font-bold font-serif">На проверке</span>
                                      <span className="text-3xl font-magical text-hogwarts-green">+{skill.pendingCount || 0}</span>
                                  </div>
                                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                      <FileText className="w-6 h-6 text-hogwarts-blue" />
                                  </div>
                              </div>
                          ) : (
                              // User View: Progress Bar
                              <>
                                <div 
                                    className="w-full h-8 bg-hogwarts-silver/20 rounded-full border border-hogwarts-bronze overflow-hidden cursor-pointer"
                                    onClick={() => handleSkillClick(skill.name)}
                                >
                                    <div
                                    className="h-full bg-gradient-to-r from-hogwarts-red to-hogwarts-gold transition-all duration-1000 ease-out relative"
                                    style={{ width: `${skill.progress}%` }}
                                    >
                                    <div className="absolute inset-0 bg-white/10 opacity-30"></div>
                                    </div>
                                </div>
                                
                                <div className="mt-2 flex justify-between text-[10px] font-bold text-hogwarts-ink/70 font-nexa uppercase">
                                    <span>Новичок</span>
                                    <span>{skill.progress}% Мастерства</span>
                                    <span>Магистр</span>
                                </div>
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
        onClose={() => setSelectedSkill(null)}
        viewAsUser={!showAdminInterface}
      />
      
      <SkillInfoModal
        isOpen={!!selectedSkillInfo}
        onClose={() => setSelectedSkillInfo(null)}
        title={selectedSkillInfo || ''}
        description={selectedSkillInfo ? SKILL_DESCRIPTIONS[selectedSkillInfo] : ''}
      />
      </div>
    </div>
  );
};
