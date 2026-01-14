import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Plus, LogOut, GraduationCap, Share2, Check } from 'lucide-react';
import { PracticeModal } from '../components/PracticeModal';
import { useNavigate } from 'react-router-dom';
import castleImg from '../assets/castle.png';

export const Dashboard: React.FC = () => {
  const { user, skills, fetchSkills, signOut } = useStore();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const handleCopyLink = () => {
    const safeName = user?.name.replace(/\s+/g, '_');
    const url = `${window.location.origin}/u/${safeName}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSkillClick = (skillName: string) => {
    navigate(`/skill/${encodeURIComponent(skillName)}`);
  };

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
        <header className="flex justify-between items-center mb-12 bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-xl border-2 border-hogwarts-gold">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-hogwarts-blue rounded-full flex items-center justify-center border-2 border-hogwarts-gold shadow-lg text-hogwarts-gold shrink-0">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl text-hogwarts-red font-magical font-serif">Личный кабинет</h2>
              <p className="text-hogwarts-ink text-lg font-seminaria font-normal">
                Добро пожаловать, {user?.name || 'Волшебник'}
              </p>
              <button 
                onClick={handleCopyLink}
                className="text-xs flex items-center gap-1 text-hogwarts-blue hover:text-hogwarts-red mt-1 font-serif underline"
              >
                {copied ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                {copied ? 'Ссылка скопирована' : 'Поделиться профилем'}
              </button>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-hogwarts-red hover:text-red-900 font-bold font-magical px-4 py-2 border-2 border-transparent hover:border-hogwarts-red rounded transition-all font-serif"
          >
            <LogOut className="w-5 h-5" />
            Выйти
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {skills.map((skill) => (
            <div 
              key={skill.id} 
              className="bg-white p-6 rounded-lg shadow-md border-2 border-hogwarts-bronze relative overflow-hidden group hover:shadow-xl transition-shadow"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 
                  onClick={() => handleSkillClick(skill.name)}
                  className="text-2xl font-magical text-hogwarts-blue cursor-pointer hover:underline decoration-hogwarts-gold underline-offset-4 font-serif"
                >
                  {skill.name}
                </h3>
                <button
                  onClick={() => setSelectedSkill(skill.name)}
                  className="p-2 bg-hogwarts-green text-hogwarts-gold rounded-full hover:bg-green-900 transition-colors shadow-md border border-hogwarts-gold"
                  title="Практиковать этот навык"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

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
              
              <div className="mt-2 flex justify-between text-sm font-bold text-hogwarts-ink/70 font-serif">
                <span>Новичок</span>
                <span>{skill.progress}% Мастерства</span>
                <span>Магистр</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PracticeModal
        skillName={selectedSkill || ''}
        isOpen={!!selectedSkill}
        onClose={() => setSelectedSkill(null)}
      />
      </div>
    </div>
  );
};
