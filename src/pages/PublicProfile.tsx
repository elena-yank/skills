import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { GraduationCap, ArrowLeft, Loader2 } from 'lucide-react';
import castleImg from '../assets/castle.png';

interface Skill {
  id: string;
  name: string;
  progress: number;
}

const DEFAULT_SKILLS = [
  "Беспалочковая магия",
  "Невербальная магия",
  "Трансгрессия",
  "Анимагия",
  "Мортимагия"
];

export const PublicProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;

      setIsLoading(true);
      try {
        // Replace underscores with spaces to find the user in DB
        const dbName = username?.replace(/_/g, ' ');

        // 1. Find user by name (case insensitive search)
        const { data: userData, error: userError } = await supabase
          .from('wizards')
          .select('id, name')
          .ilike('name', dbName || '')
          .single();

        if (userError || !userData) {
          throw new Error('Волшебник не найден');
        }

        // 2. Fetch logs
        const { data: logsData, error: logsError } = await supabase
          .from('practice_logs')
          .select('skill_name')
          .eq('user_id', userData.id);

        if (logsError) throw logsError;

        // 3. Calculate progress
        const progressMap = new Map<string, number>();
        logsData?.forEach(log => {
          const current = progressMap.get(log.skill_name) || 0;
          progressMap.set(log.skill_name, current + 1);
        });

        const calculatedSkills = DEFAULT_SKILLS.map(name => ({
          id: name,
          name,
          progress: Math.min(progressMap.get(name) || 0, 100)
        })).sort((a, b) => b.progress - a.progress);

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

            <header className="flex flex-col md:flex-row gap-6 items-center mb-12 bg-white/90 backdrop-blur-sm p-8 rounded-lg shadow-xl border-2 border-hogwarts-gold">
                <div className="w-24 h-24 bg-hogwarts-blue rounded-full flex items-center justify-center border-4 border-hogwarts-gold shadow-lg text-hogwarts-gold shrink-0">
                    <GraduationCap className="w-12 h-12" />
                </div>
                <div className="text-center md:text-left">
                    <h2 className="text-4xl text-hogwarts-red font-magical font-serif mb-2">{username?.replace(/_/g, ' ')}</h2>
                    <p className="text-hogwarts-ink text-xl font-serif italic">
                        Карточка студента Хогвартса
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {skills.map((skill) => (
                <div 
                key={skill.id} 
                className="bg-white p-6 rounded-lg shadow-md border-2 border-hogwarts-bronze relative overflow-hidden"
                >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-magical text-hogwarts-blue font-serif">
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
                
                <div className="mt-2 flex justify-between text-sm font-bold text-hogwarts-ink/70 font-serif">
                    <span>Новичок</span>
                    <span>{skill.progress}% Мастерства</span>
                    <span>Магистр</span>
                </div>
                </div>
            ))}
            </div>
        </div>
      </div>
    </div>
  );
};
