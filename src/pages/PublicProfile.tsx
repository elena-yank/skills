import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { GraduationCap, ArrowLeft, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { SKILL_CATEGORIES } from '../store';
import castleImg from '../assets/castle.png';
import scrollImg from '../assets/scroll.png';
import frameSvg from '../assets/frame.svg';

interface Skill {
  id: string;
  name: string;
  progress: number;
}

const ALL_SKILLS = Array.from(new Set(SKILL_CATEGORIES.flatMap(c => c.skills)));

export const PublicProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
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

        // 2. Fetch logs
        const logsData = await api.logs.list(userData.id);

        // 3. Calculate progress
        const progressMap = new Map<string, number>();
        logsData?.forEach(log => {
          // Only approved logs count for progress? 
          // Prompt says "Текст появляется... но пока что не влияет на прогресс". 
          // So pending shouldn't count.
          // Since we are viewing public profile, maybe we should only count approved ones too.
          if (log.status === 'approved') {
              const current = progressMap.get(log.skill_name) || 0;
              progressMap.set(log.skill_name, current + 1);
          }
        });

        const calculatedSkills = ALL_SKILLS.map(name => ({
          id: name,
          name,
          progress: Math.min(progressMap.get(name) || 0, 100)
        }));

        setSkills(calculatedSkills);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

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
        <div className="max-w-4xl mx-auto p-8 w-full mt-8">
            <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-white hover:text-hogwarts-gold mb-8 font-magical font-bold transition-colors font-serif"
            >
                <ArrowLeft className="w-5 h-5" />
                На главную
            </button>

            <div className="relative mb-12">
                <img
                  src={frameSvg}
                  alt="Frame"
                  className="absolute inset-0 w-full h-full object-fill z-0 pointer-events-none select-none"
                />
                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center px-12 py-8">
                    <div className="w-24 h-24 bg-hogwarts-blue rounded-full flex items-center justify-center border-4 border-hogwarts-gold shadow-lg text-hogwarts-gold shrink-0">
                        <GraduationCap className="w-12 h-12" />
                    </div>
                    <div className="text-center md:text-left">
                        <h2 className="text-4xl text-hogwarts-gold font-seminaria font-bold mb-2">{username?.replace(/_/g, ' ')}</h2>
                        <p className="text-white text-xl font-century">
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
                                onClick={() => navigate(`/u/${username}/skill/${encodeURIComponent(skill.name)}`)}
                                className="p-12 rounded-lg shadow-md relative overflow-hidden group hover:shadow-xl transition-shadow bg-no-repeat bg-center bg-contain cursor-pointer"
                                style={{ backgroundImage: `url(${scrollImg})` }}
                                >
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-2xl font-seminaria font-bold text-hogwarts-blue">
                                        {skill.name}
                                    </h3>
                                </div>

                                <div className="w-full h-8 bg-hogwarts-silver/20 rounded-full border border-hogwarts-bronze overflow-hidden">
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
    </div>
  );
};
