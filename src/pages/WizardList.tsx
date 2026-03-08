import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, User, Search } from 'lucide-react';
import castleImg from '../assets/castle.png';
import frameSvg from '../assets/frame.svg';
import gryffindorEmblem from '../assets/gryffindor.svg';
import ravenclawEmblem from '../assets/ravenclaw.svg';
import hufflepuffEmblem from '../assets/hufflepuff.svg';
import slytherinEmblem from '../assets/slytherin.svg';
import mdEmblem from '../assets/md.svg';
import mmEmblem from '../assets/mm.svg';
import avatarSvg from '../assets/avatar.svg';
import { User as UserType } from '../lib/api/types';
import { useStore } from '../store';
import { ImageModal } from '../components/ImageModal';

export const WizardList: React.FC = () => {
  const [wizards, setWizards] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { user } = useStore();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchWizards = async () => {
      try {
        const data = await api.auth.listAllUsers();
        if (data && data.length > 0) {
            setWizards(data);
        } else {
            console.warn('No wizards found via api.auth.listAllUsers');
            // Fallback to admin list if regular list fails (temporary fix)
            if (user?.role === 'admin') {
                try {
                    const adminData = await api.admin?.listUsers();
                    if (adminData) setWizards(adminData);
                } catch (e) {
                    console.error('Fallback admin fetch failed', e);
                }
            }
        }
      } catch (error) {
        console.error('Error fetching wizards:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWizards();
  }, [user]);

  const filteredWizards = wizards
    .filter(wizard => wizard.name !== 'Admin')
    .filter(wizard => 
      wizard.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
          onClick={() => navigate(user ? '/' : '/login')}
          className="flex items-center gap-2 text-white hover:text-hogwarts-gold mb-8 font-magical font-bold transition-colors font-serif w-full justify-center md:w-auto md:justify-start"
        >
          <ArrowLeft className="w-5 h-5" />
          {user ? 'Вернуться в кабинет' : 'Вернуться ко входу'}
        </button>

        <div className="relative mb-8 md:mb-12">
          <div className="absolute inset-0 bg-black/50 hidden md:block"></div>
          <img
            src={frameSvg}
            alt="Frame"
            className="absolute inset-0 w-full h-full object-fill z-10 pointer-events-none select-none hidden md:block"
          />
          <div className="absolute inset-0 border-2 border-hogwarts-gold/50 bg-black/40 md:hidden rounded-lg"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4 px-4 py-6 md:px-12 md:py-8">
            <div className="flex items-center gap-4">
                <img src={avatarSvg} alt="Wizards Icon" className="w-10 h-10 md:w-14 md:h-14 shrink-0" />
                <div>
                    <h1 className="text-xl md:text-4xl text-hogwarts-gold font-seminaria font-normal">
                        Список волшебников
                    </h1>
                    <p className="text-white text-sm md:text-lg mt-2 font-century font-normal">
                        Все зарегистрированные участники
                    </p>
                </div>
            </div>
            
            <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-hogwarts-ink/50 w-5 h-5" />
                <input 
                    type="text" 
                    placeholder="Найти волшебника..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border-2 border-hogwarts-bronze rounded-lg focus:outline-none focus:border-hogwarts-gold font-century w-full md:w-64 bg-white/80"
                />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-hogwarts-red border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 font-magical text-hogwarts-ink font-serif">Поиск свитков с именами...</p>
          </div>
        ) : filteredWizards.length === 0 ? (
          <div className="text-center py-12 bg-white/50 rounded-lg border-2 border-hogwarts-bronze border-dashed">
            <p className="text-xl font-magical text-hogwarts-ink font-serif">
               Волшебники не найдены
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-2 gap-4">
            {filteredWizards.map((wizard) => {
              const isGryffindor = wizard.faculty === 'Гриффиндор';
              const isRavenclaw = wizard.faculty === 'Когтевран';
              const isHufflepuff = wizard.faculty === 'Пуффендуй';
              const isSlytherin = wizard.faculty === 'Слизерин';
              const isAdmin = wizard.role === 'admin';
              const isMD = wizard.age === 'МД' && !isAdmin;
              const hasFaculty = isGryffindor || isRavenclaw || isHufflepuff || isSlytherin;
              const hasSpecialStyle = hasFaculty || isMD || isAdmin;
              
              return (
                <div 
                  key={wizard.id}
                  onClick={() => navigate(`/u/${wizard.name.replace(/\s+/g, '_')}`)}
                  className={`py-4 px-6 rounded-lg shadow-md border-2 cursor-pointer transition-all group relative overflow-hidden
                    ${isAdmin
                      ? 'bg-[#4c1d95] border-hogwarts-gold hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]'
                      : isGryffindor 
                        ? 'bg-[#5c0000] border-hogwarts-gold hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]' 
                        : isRavenclaw
                          ? 'bg-[#0e1a40] border-hogwarts-gold hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]'
                          : isHufflepuff
                            ? 'bg-[#ecb939] border-hogwarts-ink hover:shadow-[0_0_20px_rgba(0,0,0,0.2)]'
                            : isSlytherin
                              ? 'bg-[#1a472a] border-hogwarts-gold hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]'
                              : isMD
                                ? 'bg-[#cbd5e1] border-hogwarts-gold hover:shadow-[0_0_20px_rgba(225,177,47,0.5)]'
                                : 'bg-white border-hogwarts-bronze hover:shadow-xl hover:border-hogwarts-gold'}`}
                >
                  {/* Glass effect gradient for Special Styles */}
                  {hasSpecialStyle && (
                    <>
                      <div className={`absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none z-0 
                         ${isMD ? 'from-white/100' : 'from-white/10'}`}></div>
                       {/* Animated Shimmer */}
                       <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                         <div className={`absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent to-transparent animate-glass-shimmer
                           ${isMD ? 'via-white/100' : 'via-white/20'}`}></div>
                       </div>
                    </>
                  )}

                  {/* Special Emblem / User Icon */}
                  <div className={`absolute transition-all duration-300 z-10
                    ${isAdmin
                      ? 'p-0 -right-16 -top-10 opacity-60 group-hover:opacity-80 group-hover:-right-12 group-hover:-top-6'
                      : hasSpecialStyle 
                        ? 'p-0 -right-4 -top-4 opacity-40 group-hover:opacity-60 group-hover:-right-2 group-hover:-top-2' 
                        : 'p-2 top-0 right-0 opacity-10 group-hover:opacity-20'}`}>
                    {isAdmin ? (
                      <img
                        src={mmEmblem}
                        alt="Администратор"
                        className="w-44 h-44 object-contain"
                        style={{ filter: 'brightness(0) saturate(100%) invert(8%) sepia(46%) saturate(7400%) hue-rotate(265deg) brightness(70%) contrast(110%)' }}
                      />
                    ) : isGryffindor ? (
                      <img src={gryffindorEmblem} alt="Gryffindor" className="w-32 h-32 object-contain" />
                    ) : isRavenclaw ? (
                      <img src={ravenclawEmblem} alt="Ravenclaw" className="w-32 h-32 object-contain" />
                    ) : isHufflepuff ? (
                      <img src={hufflepuffEmblem} alt="Hufflepuff" className="w-32 h-32 object-contain" />
                    ) : isSlytherin ? (
                      <img src={slytherinEmblem} alt="Slytherin" className="w-32 h-32 object-contain" />
                    ) : isMD ? (
                      <img src={mdEmblem} alt="MD" className="w-32 h-32 object-contain opacity-70 group-hover:opacity-100" />
                    ) : (
                      <User className="w-12 h-12 text-hogwarts-blue" />
                    )}
                  </div>

                  <div className="flex items-center gap-4 mb-2 relative z-20">
                    <div className={`w-12 h-12 flex items-center justify-center shrink-0 overflow-hidden relative
                      ${wizard.avatar_url ? (hasSpecialStyle ? (isHufflepuff || isMD ? 'bg-black/5 border-hogwarts-gold text-hogwarts-gold rounded-full border' : 'bg-hogwarts-gold/20 border-hogwarts-gold text-hogwarts-gold rounded-full border') : 'bg-hogwarts-blue border-hogwarts-gold text-hogwarts-gold rounded-full border') : ''}`}>
                        {wizard.avatar_url ? (
                            <img 
                                src={wizard.avatar_url} 
                                alt={wizard.name} 
                                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImage(wizard.avatar_url!);
                                }}
                            />
                        ) : (
                            <img src={avatarSvg} alt="Default Avatar" className="w-full h-full object-contain" />
                        )}
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className={`text-xl font-bold font-seminaria transition-colors
                          ${hasSpecialStyle 
                            ? isAdmin
                              ? 'text-white group-hover:text-hogwarts-gold'
                              : isHufflepuff || isMD
                                ? 'text-hogwarts-ink group-hover:text-hogwarts-red' 
                                : isSlytherin || isRavenclaw
                                  ? 'text-white group-hover:text-hogwarts-gold'
                                  : 'text-hogwarts-gold group-hover:text-white' 
                            : 'text-hogwarts-ink group-hover:text-hogwarts-red'}`}>
                            {wizard.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full font-nexa ${
                              hasSpecialStyle 
                                ? isHufflepuff || isMD
                                  ? 'bg-black/5 text-hogwarts-ink border border-black/10'
                                  : 'bg-white/10 text-white border border-white/20' 
                                : 'bg-hogwarts-blue/10 text-hogwarts-blue border border-hogwarts-blue/20'
                            }`}>
                                {wizard.race || 'Человек'}
                            </span>
                             {wizard.age && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full font-nexa ${
                                  hasSpecialStyle 
                                    ? isHufflepuff || isMD
                                      ? 'bg-black/5 text-hogwarts-ink border border-black/10'
                                      : 'bg-white/10 text-white border border-white/20' 
                                    : 'bg-hogwarts-bronze/10 text-hogwarts-bronze border border-hogwarts-bronze/20'
                                }`}>
                                    {wizard.age === 'Школа' ? 'Хогвартс' : wizard.age}
                                </span>
                            )}
                        </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ImageModal 
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageUrl={selectedImage || ''}
        altText="Wizard Avatar"
      />
    </div>
  );
};
