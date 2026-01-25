import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, User, Search } from 'lucide-react';
import castleImg from '../assets/castle.png';
import frameSvg from '../assets/frame.svg';
import { User as UserType } from '../lib/api/types';
import { useStore } from '../store';

export const WizardList: React.FC = () => {
  const [wizards, setWizards] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { user } = useStore();

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

  const filteredWizards = wizards.filter(wizard => 
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

      <div className="relative z-20 max-w-4xl mx-auto p-8">
        <button
          onClick={() => navigate(user ? '/' : '/login')}
          className="flex items-center gap-2 text-white hover:text-hogwarts-gold mb-8 font-magical font-bold transition-colors font-serif"
        >
          <ArrowLeft className="w-5 h-5" />
          {user ? 'Вернуться в кабинет' : 'Вернуться ко входу'}
        </button>

        <div className="relative mb-12">
          <img
            src={frameSvg}
            alt="Frame"
            className="absolute inset-0 w-full h-full object-fill z-0 pointer-events-none select-none"
          />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4 px-12 py-8">
            <div className="flex items-center gap-4">
                <User className="w-10 h-10 text-hogwarts-gold shrink-0" />
                <div>
                    <h1 className="text-4xl text-hogwarts-gold font-seminaria font-normal">
                        Список волшебников
                    </h1>
                    <p className="text-white text-lg mt-2 font-century font-normal">
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
                    className="pl-10 pr-4 py-2 border-2 border-hogwarts-bronze rounded-lg focus:outline-none focus:border-hogwarts-gold font-serif w-full md:w-64 bg-white/80"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredWizards.map((wizard) => (
              <div 
                key={wizard.id}
                onClick={() => navigate(`/u/${wizard.name.replace(/\s+/g, '_')}`)}
                className="bg-white p-6 rounded-lg shadow-md border-2 border-hogwarts-bronze cursor-pointer hover:shadow-xl hover:border-hogwarts-gold transition-all group relative overflow-hidden"
              >
                 <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <User className="w-12 h-12 text-hogwarts-blue" />
                 </div>
                 
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-hogwarts-blue rounded-full flex items-center justify-center text-hogwarts-gold font-magical text-xl border border-hogwarts-gold">
                        {wizard.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold font-serif text-hogwarts-ink group-hover:text-hogwarts-red transition-colors">
                            {wizard.name}
                        </h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            wizard.role === 'admin' 
                                ? 'bg-hogwarts-red/10 text-hogwarts-red border border-hogwarts-red/20' 
                                : 'bg-hogwarts-green/10 text-hogwarts-green border border-hogwarts-green/20'
                        }`}>
                            {wizard.role === 'admin' ? 'Администратор' : 'Участник'}
                        </span>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
