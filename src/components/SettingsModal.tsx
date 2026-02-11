import React, { useState, useEffect } from 'react';
import { X, Settings, Send } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../lib/api';

interface SettingsModalProps {
  onClose: () => void;
}

const RACES = [
  'Человек',
  'Оборотень',
  'Дампир',
  'Вейла',
  'Великан',
  'Вампир'
];

const FRACTIONS = ['½', '¼', '⅛'];

const FACULTIES = [
  'Гриффиндор',
  'Когтевран',
  'Пуффендуй',
  'Слизерин'
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { user, updateProfile } = useStore();
  
  // Parse initial race and fraction
  const getInitialRaceState = () => {
    if (!user?.race) return { base: 'Человек', fraction: '¼' };
    
    if (user.race.includes('вейла')) return { base: 'Вейла', fraction: user.race.match(/(½|¼|⅛)/)?.[0] || '¼' };
    if (user.race.includes('великан')) return { base: 'Великан', fraction: user.race.match(/(½|¼|⅛)/)?.[0] || '¼' };
    if (user.race.includes('вампир')) return { base: 'Вампир', fraction: '¼' };
    
    return { base: user.race, fraction: '¼' };
  };

  const initialState = getInitialRaceState();
  const [race, setRace] = useState(initialState.base);
  const [age, setAge] = useState(user?.age || 'Хогвартс');
  const [faculty, setFaculty] = useState(user?.faculty || 'Гриффиндор');
  const [fraction, setFraction] = useState(initialState.fraction);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Request related state
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestExplanation, setRequestExplanation] = useState('');
  const [requestStatus, setRequestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const isAdmin = user?.role === 'admin';

  const getFinalRace = () => {
    let finalRace = race;
    if (race === 'Вейла') {
      finalRace = `На ${fraction} вейла`;
    } else if (race === 'Великан') {
      finalRace = `На ${fraction} великан`;
    } else if (race === 'Вампир') {
      finalRace = `На ¼ вампир`;
    }
    return finalRace;
  };

  const handleRequestRaceChange = async () => {
    if (!user) return;
    if (!requestReason || !requestExplanation) {
      alert('Пожалуйста, заполните причину и обоснование.');
      return;
    }

    setRequestStatus('loading');
    try {
      await api.raceRequests.create({
        user_id: user.id,
        requested_race: getFinalRace(),
        reason: requestReason,
        explanation: requestExplanation
      });
      setRequestStatus('success');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error(error);
      setRequestStatus('error');
    }
  };

  const handleSubmit = async () => {
    // Only admins can directly change race. 
    // Non-admins must go through the request flow if the race is being changed.
    const isRaceChanged = getFinalRace() !== user?.race;
    
    if (!isAdmin && isRaceChanged) {
      setShowRequestForm(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // If it's not an admin and the race is NOT changed (only age changed), 
      // or if it IS an admin, they can proceed with updateProfile.
      await updateProfile(getFinalRace(), age, age === 'Хогвартс' ? faculty : undefined);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Ошибка при сохранении настроек');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-hogwarts-parchment w-full max-w-md rounded-lg shadow-2xl border-4 border-hogwarts-gold relative flex flex-col max-h-[90vh]">
        <div className="p-4 md:p-6 border-b-2 border-hogwarts-bronze flex justify-between items-center bg-hogwarts-parchment rounded-t-lg">
          <h2 className="text-xl md:text-2xl font-seminaria text-hogwarts-red flex items-center gap-2 font-bold">
            <Settings className="w-5 h-5 md:w-6 md:h-6" />
            Личный кабинет
          </h2>
          <button onClick={onClose} className="text-hogwarts-ink hover:text-hogwarts-red">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 md:p-6 flex-1 overflow-auto space-y-6">
          {showRequestForm ? (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-hogwarts-blue/10 border-l-4 border-hogwarts-blue p-4 mb-4">
                <p className="text-sm text-hogwarts-ink font-century">
                  Вы меняете расу с <span className="font-bold text-hogwarts-blue">"{user?.race || 'Человек'}"</span> на <span className="font-bold text-hogwarts-blue">"{getFinalRace()}"</span>. 
                  Для этого необходимо подать заявку администрации.
                </p>
              </div>

              {requestStatus === 'success' ? (
                <div className="bg-green-100 border border-green-500 text-green-700 p-4 rounded text-center font-century">
                  Заявка успешно отправлена! Ожидайте уведомления.
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-bold text-hogwarts-ink mb-2 font-nexa uppercase">
                      Причина смены
                    </label>
                    <input
                      type="text"
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder="Например: Сюжетное событие"
                      className="w-full px-4 py-2 bg-white border-2 border-hogwarts-bronze rounded focus:outline-none focus:border-hogwarts-red transition-colors font-century"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-hogwarts-ink mb-2 font-nexa uppercase">
                      Обоснование (лор/история)
                    </label>
                    <textarea
                      value={requestExplanation}
                      onChange={(e) => setRequestExplanation(e.target.value)}
                      placeholder="Объясните, почему эта раса играет роль в истории персонажа..."
                      rows={4}
                      className="w-full px-4 py-2 bg-white border-2 border-hogwarts-bronze rounded focus:outline-none focus:border-hogwarts-red transition-colors font-century resize-none"
                    />
                  </div>
                  {requestStatus === 'error' && (
                    <p className="text-sm text-hogwarts-red font-century">
                      Ошибка при отправке заявки. Попробуйте позже.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              {/* Race Selection */}
              <div>
                <label className="block text-sm font-bold text-hogwarts-ink mb-2 font-nexa uppercase">
                  Раса
                </label>
                <select
                  value={race}
                  onChange={(e) => {
                    setRace(e.target.value);
                    if (e.target.value === 'Вампир') setFraction('¼');
                  }}
                  className="w-full px-4 py-2 bg-white border-2 border-hogwarts-bronze rounded focus:outline-none focus:border-hogwarts-red transition-colors font-century"
                >
                  {RACES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                
                {race === 'Оборотень' && (
                  <p className="text-xs text-hogwarts-red mt-1 font-serif italic">
                    Примечание: магическая болезнь
                  </p>
                )}

                {(race === 'Вейла' || race === 'Великан') && (
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-hogwarts-ink mb-1 font-nexa uppercase">
                      Доля крови
                    </label>
                    <select
                      value={fraction}
                      onChange={(e) => setFraction(e.target.value)}
                      className="w-full px-4 py-2 bg-white border-2 border-hogwarts-bronze rounded focus:outline-none focus:border-hogwarts-red transition-colors font-century"
                    >
                      {FRACTIONS.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {race === 'Вампир' && (
                  <div className="mt-4">
                    <p className="text-sm font-century text-hogwarts-ink">
                      Для вампиров автоматически устанавливается доля <span className="font-bold">¼</span>.
                    </p>
                  </div>
                )}
              </div>

              {/* Age Selection */}
              <div>
                <label className="block text-sm font-bold text-hogwarts-ink mb-2 font-nexa uppercase">
                  Возраст
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="age"
                      value="Хогвартс"
                      checked={age === 'Хогвартс'}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-4 h-4 text-hogwarts-red border-hogwarts-bronze focus:ring-hogwarts-red"
                    />
                    <span className="font-century text-hogwarts-ink group-hover:text-hogwarts-red transition-colors">Хогвартс</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="age"
                      value="МД"
                      checked={age === 'МД'}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-4 h-4 text-hogwarts-red border-hogwarts-bronze focus:ring-hogwarts-red"
                    />
                    <span className="font-century text-hogwarts-ink group-hover:text-hogwarts-red transition-colors">МД</span>
                  </label>
                </div>
              </div>

              {/* Faculty Selection (only if Hogwarts is selected) */}
              {age === 'Хогвартс' && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-bold text-hogwarts-ink mb-2 font-nexa uppercase">
                    Факультет
                  </label>
                  <select
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    className="w-full px-4 py-2 bg-white border-2 border-hogwarts-bronze rounded focus:outline-none focus:border-hogwarts-red transition-colors font-century"
                  >
                    {FACULTIES.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 md:p-6 border-t-2 border-hogwarts-bronze bg-hogwarts-parchment rounded-b-lg flex justify-end gap-4">
          <button
            onClick={showRequestForm ? () => setShowRequestForm(false) : onClose}
            className="px-6 py-2 text-hogwarts-ink font-magical hover:bg-hogwarts-bronze/10 rounded border border-hogwarts-bronze transition-colors font-nexa uppercase"
          >
            {showRequestForm ? 'Назад' : 'Отмена'}
          </button>
          
          {showRequestForm ? (
            requestStatus !== 'success' && (
              <button
                onClick={handleRequestRaceChange}
                disabled={requestStatus === 'loading'}
                className={`px-6 py-2 font-magical font-bold rounded border-2 border-hogwarts-gold shadow-md transition-all font-nexa uppercase flex items-center gap-2
                  ${requestStatus !== 'loading'
                    ? 'bg-hogwarts-blue text-white hover:bg-blue-900' 
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed border-gray-400'}`}
              >
                <Send className="w-4 h-4" />
                {requestStatus === 'loading' ? 'Отправка...' : 'Отправить заявку'}
              </button>
            )
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-6 py-2 font-magical font-bold rounded border-2 border-hogwarts-gold shadow-md transition-all font-nexa uppercase
                ${!isSubmitting 
                  ? 'bg-hogwarts-red text-hogwarts-gold hover:bg-red-900' 
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed border-gray-400'}`}
            >
              {isSubmitting ? 'Сохранение...' : (isAdmin ? 'СОХРАНИТЬ' : (getFinalRace() !== user?.race ? 'ДАЛЕЕ' : 'СОХРАНИТЬ'))}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
