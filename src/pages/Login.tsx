import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Wand2, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import castleImg from '../assets/castle.png';
import parchmentImg from '../assets/parchment.png';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setUser } = useStore();

  const validateUsername = (name: string) => {
    // Only Russian letters and spaces
    const regex = /^[а-яА-ЯёЁ\s]+$/;
    return regex.test(name);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate username
    if (!username.trim()) {
      setError('Пожалуйста, введите имя.');
      setIsLoading(false);
      return;
    }

    if (!validateUsername(username)) {
      setError('Имя может содержать только русские буквы и пробелы. Никаких цифр или спецсимволов.');
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Пароль должен быть не короче 6 символов');
      setIsLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Check if wizard already exists
        const { data: existingUser } = await supabase
          .from('wizards')
          .select('id')
          .eq('name', username.trim())
          .single();

        if (existingUser) {
          throw new Error('Такой волшебник уже числится в Хогвартсе.');
        }

        // Create new wizard
        const { data, error } = await supabase
          .from('wizards')
          .insert({
            name: username.trim(),
            password: password // In a real app, hash this! But for Hogwarts, magic protects it.
          })
          .select()
          .single();
        
        if (error) throw error;
        
        if (data) {
            setUser(data);
            navigate('/');
        }
      } else {
        // Sign In
        const { data, error } = await supabase
          .from('wizards')
          .select('*')
          .eq('name', username.trim())
          .eq('password', password)
          .single();

        if (error || !data) {
           throw new Error('Неверное имя или пароль');
        }

        setUser(data);
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('JSON object requested, multiple (or no) rows returned')) {
         setError('Неверное имя или пароль');
      } else {
         setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-hogwarts-blue relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
         <img 
            src={castleImg}
            alt="Hogwarts Great Hall"
            className="w-full h-full object-cover"
         />
         <div className="absolute inset-0 bg-black/60"></div>
      </div>
      
      <div className="relative w-full max-w-md p-12 min-h-[500px] flex flex-col justify-center z-10">
        {/* Parchment Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src={parchmentImg}
            alt="Parchment"
            className="w-full h-full object-fill drop-shadow-2xl mix-blend-lighten scale-110"
          />
        </div>

        <div className="relative z-10 px-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl text-hogwarts-red mb-2 !font-seminaria font-bold leading-tight whitespace-nowrap">
              Добро пожаловать!
            </h1>
            <p className="text-hogwarts-ink italic text-sm">"Draco Dormiens Nunquam Titillandus"</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded text-sm text-center font-serif">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-hogwarts-ink mb-1">Имя волшебника</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-white border-2 border-hogwarts-bronze rounded focus:outline-none focus:border-hogwarts-red transition-colors font-serif"
              placeholder="Луна Лавгуд"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Только русские буквы и пробелы</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-hogwarts-ink mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-white border-2 border-hogwarts-bronze rounded focus:outline-none focus:border-hogwarts-red transition-colors font-serif"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-hogwarts-red text-hogwarts-gold font-serif font-bold py-3 px-4 rounded border-2 border-hogwarts-gold hover:bg-red-900 transition-colors flex items-center justify-center gap-2 shadow-md uppercase tracking-wider"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Зачислиться' : 'ВОЙТИ')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
            }}
            className="text-hogwarts-blue hover:text-hogwarts-red underline text-sm font-bold font-serif"
          >
            {isSignUp ? 'Уже учитесь? Войти' : 'Впервые здесь? Стать участником'}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};
