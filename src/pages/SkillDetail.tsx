import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Scroll, Calendar, Feather, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import castleImg from '../assets/castle.png';

interface Log {
  id: string;
  content: string;
  word_count: number;
  created_at: string;
  user_id: string;
  post_link?: string;
}

const LogItem: React.FC<{ log: Log; onDelete: (id: string) => void; isOwner: boolean }> = ({ log, onDelete, isOwner }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { user } = useStore();
  
  // Split content into paragraphs
  const paragraphs = log.content.split('\n').filter(p => p.trim().length > 0);
  const firstParagraph = paragraphs[0] || '';

  const handleDelete = () => {
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(log.id);
    setShowConfirm(false);
  };

  return (
    <article 
      className="bg-white p-8 rounded-lg shadow-md border-2 border-hogwarts-bronze relative"
    >
      {showConfirm && (
        <div className="absolute inset-0 bg-white/95 z-10 flex flex-col items-center justify-center rounded-lg p-8 animate-in fade-in duration-200">
            <Trash2 className="w-12 h-12 text-hogwarts-red mb-4" />
            <p className="text-xl font-magical text-center text-hogwarts-ink mb-2">{user?.name}, ты действительно хочешь удалить этот пост?</p>
            <p className="text-sm text-hogwarts-ink/60 text-center mb-6 max-w-sm">
                Даже заклинание репАро не сможет восстановить его!
            </p>
            <div className="flex gap-4">
                <button
                    onClick={() => setShowConfirm(false)}
                    className="px-4 py-2 rounded border border-hogwarts-bronze text-hogwarts-ink hover:bg-hogwarts-parchment transition-colors font-serif"
                >
                    Оставить
                </button>
                <button
                    onClick={confirmDelete}
                    className="px-4 py-2 rounded bg-hogwarts-red text-hogwarts-gold font-bold hover:bg-red-900 transition-colors shadow-md border border-hogwarts-gold font-serif"
                >
                    Удалить
                </button>
            </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-6 border-b border-hogwarts-bronze pb-4">
        <div className="flex items-center gap-2 text-hogwarts-ink/70 font-bold font-serif">
          <Calendar className="w-4 h-4" />
          {new Date(log.created_at).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
          {log.post_link && (
            <a 
              href={log.post_link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ml-4 flex items-center gap-1 text-hogwarts-blue hover:text-hogwarts-red transition-colors"
              title="Открыть ссылку"
            >
              <Feather className="w-4 h-4" />
              Ссылка
            </a>
          )}
        </div>
        <div className="flex items-center gap-4">
            <div className="bg-hogwarts-green/10 text-hogwarts-green px-3 py-1 rounded-full text-sm font-bold border border-hogwarts-green/30 font-serif">
            {log.word_count} слов (+1%)
            </div>
            {isOwner && (
                <button 
                    onClick={handleDelete}
                    className="text-hogwarts-ink/50 hover:text-red-600 transition-colors p-1"
                    title="Уничтожить свиток"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            )}
        </div>
      </div>
      
      <div className="prose prose-stone max-w-none font-body text-lg leading-relaxed text-hogwarts-ink font-serif">
        {isExpanded ? (
          paragraphs.map((paragraph, idx) => (
            <p key={idx} className="mb-4">{paragraph}</p>
          ))
        ) : (
          <div>
            <p className="mb-4 line-clamp-3">{firstParagraph}</p>
            {!isExpanded && paragraphs.length > 0 && (
               <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/90 to-transparent pointer-events-none rounded-b-lg" />
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-hogwarts-blue hover:text-hogwarts-red font-bold font-serif transition-colors px-4 py-2 rounded-full hover:bg-hogwarts-blue/5"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Свернуть
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Развернуть
            </>
          )}
        </button>
      </div>
    </article>
  );
};

export const SkillDetail: React.FC = () => {
  const { skillName } = useParams<{ skillName: string }>();
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user, deletePracticeLog } = useStore();

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user || !skillName) return;

      try {
        const { data, error } = await supabase
          .from('practice_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('skill_name', decodeURIComponent(skillName))
          .order('created_at', { ascending: false });

        if (error) throw error;
        setLogs(data || []);
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [user, skillName]);

  const handleDeleteLog = async (id: string) => {
    try {
        await deletePracticeLog(id);
        // Remove locally to update UI immediately
        setLogs(logs.filter(log => log.id !== id));
    } catch (e) {
        console.error("Failed to delete log", e);
        alert("Не удалось уничтожить свиток. Магия дала сбой.");
    }
  };

  const decodedSkillName = decodeURIComponent(skillName || '');

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
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white hover:text-hogwarts-gold mb-8 font-magical font-bold transition-colors font-serif"
        >
          <ArrowLeft className="w-5 h-5" />
          Вернуться в кабинет
        </button>

        <header className="mb-12 border-b-4 border-hogwarts-gold pb-6 bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-xl">
          <h1 className="text-4xl text-hogwarts-red font-magical flex items-center gap-4 font-serif">
            <Feather className="w-10 h-10" />
            {decodedSkillName}
          </h1>
          <p className="text-hogwarts-ink text-lg italic mt-2 font-serif">История практики</p>
        </header>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-hogwarts-red border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 font-magical text-hogwarts-ink font-serif">Изучаем архивы...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 bg-white/50 rounded-lg border-2 border-hogwarts-bronze border-dashed">
            <Scroll className="w-16 h-16 mx-auto text-hogwarts-silver mb-4" />
            <p className="text-xl font-magical text-hogwarts-ink font-serif">Пока нет записей.</p>
            <p className="text-hogwarts-ink/70 font-serif">Вернитесь в личный кабинет, чтобы начать практику.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {logs.map((log) => (
              <LogItem 
                key={log.id} 
                log={log} 
                onDelete={handleDeleteLog}
                isOwner={user?.id === log.user_id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
