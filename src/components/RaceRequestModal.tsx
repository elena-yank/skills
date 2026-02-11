import React, { useState, useEffect } from 'react';
import { X, Send, Check, XCircle, Clock, User as UserIcon } from 'lucide-react';
import { api } from '../lib/api';
import { RaceChangeRequest } from '../lib/api/types';
import { useStore } from '../store';

interface RaceRequestModalProps {
    requestId: string;
    onClose: () => void;
    onProcessed: () => void;
}

export const RaceRequestModal: React.FC<RaceRequestModalProps> = ({ requestId, onClose, onProcessed }) => {
    const { user } = useStore();
    const [request, setRequest] = useState<RaceChangeRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRequest = async () => {
            try {
                const requests = await api.raceRequests.list();
                const found = requests.find(r => r.id === requestId);
                if (found) {
                    setRequest(found);
                } else {
                    setError('Заявка не найдена или уже обработана');
                }
            } catch (err) {
                console.error('Error fetching race request:', err);
                setError('Ошибка при загрузке данных заявки');
            } finally {
                setLoading(false);
            }
        };

        fetchRequest();
    }, [requestId]);

    const handleProcess = async (status: 'approved' | 'rejected') => {
        if (!user || !request) return;

        if (status === 'rejected' && !rejectionReason) {
            alert('Пожалуйста, укажите причину отказа');
            return;
        }

        setProcessing(true);
        try {
            await api.raceRequests.process(requestId, {
                status,
                admin_id: user.id,
                rejection_reason: status === 'rejected' ? rejectionReason : undefined
            });
            onProcessed();
            onClose();
        } catch (err) {
            console.error('Error processing race request:', err);
            alert('Ошибка при обработке заявки');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                <div className="bg-hogwarts-parchment p-8 rounded-lg border-4 border-hogwarts-gold shadow-2xl">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-hogwarts-gold border-t-transparent rounded-full animate-spin"></div>
                        <p className="font-serif text-hogwarts-ink">Загрузка данных заявки...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                <div className="bg-hogwarts-parchment w-full max-w-md rounded-lg border-4 border-hogwarts-gold shadow-2xl relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-hogwarts-ink hover:text-hogwarts-red">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="p-8 text-center">
                        <XCircle className="w-16 h-16 text-hogwarts-red mx-auto mb-4" />
                        <p className="font-serif text-lg text-hogwarts-ink mb-6">{error || 'Заявка не найдена'}</p>
                        <button 
                            onClick={onClose}
                            className="px-6 py-2 bg-hogwarts-ink text-white rounded font-nexa uppercase text-sm hover:bg-black transition-colors"
                        >
                            Закрыть
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-2 md:p-4">
            <div className="bg-hogwarts-parchment w-full max-w-4xl rounded-lg shadow-2xl border-4 border-hogwarts-gold relative flex flex-col h-[98vh] max-h-[600px] md:h-auto md:max-h-[90vh]">
                {/* Header - Fixed Height */}
                <div className="p-2 md:p-4 border-b-2 border-hogwarts-bronze flex justify-between items-center bg-hogwarts-parchment rounded-t-lg shrink-0 landscape-compact-header">
                    <h2 className="text-base md:text-2xl font-seminaria text-hogwarts-red flex items-center gap-2 md:gap-3 font-bold">
                        <Clock className="w-4 h-4 md:w-6 md:h-6" />
                        Заявка на смену расы
                    </h2>
                    <button onClick={onClose} className="text-hogwarts-ink hover:text-hogwarts-red transition-colors p-1">
                        <X className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>

                {/* Main Content - Two columns in landscape */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
                    {/* Left Column: Info & Details (Scrollable on mobile) */}
                    <div className="w-full md:w-1/2 p-2 md:p-6 space-y-2 md:space-y-4 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-hogwarts-bronze/30 bg-white/20 landscape-compact-p">
                        {/* User Info */}
                        <div className="flex items-center gap-3 bg-white/40 p-2 md:p-3 rounded-lg border border-hogwarts-bronze/30 shadow-sm landscape-compact-p">
                            <div className="w-8 h-8 md:w-12 md:h-12 bg-hogwarts-blue/10 rounded-full flex items-center justify-center overflow-hidden border-2 border-hogwarts-gold/30 shrink-0">
                                {request.user_avatar ? (
                                    <img src={request.user_avatar} alt={request.user_name} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-4 h-4 md:w-6 md:h-6 text-hogwarts-blue" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-hogwarts-ink/60 uppercase font-nexa">Отправитель</p>
                                <p className="text-sm md:text-lg font-serif font-bold text-hogwarts-ink truncate leading-tight landscape-compact-text">{request.user_name || 'Волшебник'}</p>
                            </div>
                        </div>

                        {/* Race & Date */}
                        <div className="grid grid-cols-2 gap-2 landscape-compact-gap">
                            <div className="bg-white/40 p-2 md:p-3 rounded-lg border border-hogwarts-bronze/30 shadow-sm landscape-compact-p">
                                <p className="text-[10px] font-bold text-hogwarts-ink/60 uppercase font-nexa mb-0.5">Раса</p>
                                <p className="text-sm md:text-lg font-serif font-bold text-hogwarts-blue leading-tight truncate landscape-compact-text">{request.requested_race}</p>
                            </div>
                            <div className="bg-white/40 p-2 md:p-3 rounded-lg border border-hogwarts-bronze/30 shadow-sm landscape-compact-p">
                                <p className="text-[10px] font-bold text-hogwarts-ink/60 uppercase font-nexa mb-0.5">Дата</p>
                                <p className="text-sm md:text-lg font-serif text-hogwarts-ink leading-tight landscape-compact-text">
                                    {new Date(request.created_at).toLocaleDateString('ru-RU', {
                                        day: 'numeric',
                                        month: 'short'
                                    })}
                                </p>
                            </div>
                        </div>

                        {/* Reason Box */}
                        <div className="bg-white/40 p-2 md:p-3 rounded-lg border border-hogwarts-bronze/30 shadow-sm landscape-compact-p">
                            <p className="text-[10px] font-bold text-hogwarts-ink/60 uppercase font-nexa mb-1">Причина</p>
                            <p className="font-century text-hogwarts-ink italic leading-tight text-xs md:text-base landscape-compact-text">
                                «{request.reason}»
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Explanation & Rejection Form */}
                    <div className="w-full md:w-1/2 p-2 md:p-6 flex flex-col min-h-[300px] md:min-h-0 bg-white/10 landscape-compact-p">
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 relative min-h-[200px] md:min-h-0">
                            <div className="sticky top-0 bg-transparent z-10 pb-1">
                                <p className="text-[10px] font-bold text-hogwarts-ink/60 uppercase font-nexa">Обоснование (лор/история)</p>
                            </div>
                            <p className="font-century text-hogwarts-ink leading-relaxed whitespace-pre-wrap text-xs md:text-base landscape-compact-text">
                                {request.explanation}
                            </p>
                            <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-hogwarts-parchment/30 to-transparent pointer-events-none sticky -mb-4" />
                        </div>

                        {/* Rejection Input - Integrated into the column */}
                        {isRejecting && (
                            <div className="mt-2 pt-2 border-t border-hogwarts-bronze/30 animate-fadeIn shrink-0">
                                <label className="block text-[10px] font-bold text-hogwarts-red/80 uppercase font-nexa mb-1">
                                    Причина отказа
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Почему отказано?.."
                                    rows={2}
                                    className="w-full px-2 py-1 bg-white/80 border border-hogwarts-bronze rounded focus:outline-none focus:border-hogwarts-red transition-colors font-century resize-none text-xs landscape-compact-text"
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer - Fixed Height */}
                <div className="p-1.5 md:p-4 border-t-2 border-hogwarts-bronze bg-hogwarts-parchment rounded-b-lg shrink-0 landscape-compact-p">
                    <div className="flex flex-col gap-1 md:gap-2 landscape-compact-gap">
                        <div className="flex flex-row gap-1 md:gap-2 landscape-compact-gap">
                            <button
                                onClick={() => isRejecting ? handleProcess('rejected') : setIsRejecting(true)}
                                disabled={processing}
                                className={`flex-1 px-2 md:px-8 py-1 md:py-3 font-bold rounded border-2 shadow-md transition-all font-nexa uppercase text-[10px] md:text-sm flex items-center justify-center gap-1 md:gap-2 landscape-compact-btn
                                    ${!processing 
                                        ? 'bg-hogwarts-red text-white hover:bg-red-900 border-hogwarts-red' 
                                        : 'bg-gray-400 text-gray-200 cursor-not-allowed border-gray-400'}`}
                            >
                                <XCircle className="w-3 h-3 md:w-4 md:h-4" />
                                {isRejecting ? 'ПОДТВЕРДИТЬ' : 'ОТКЛОНИТЬ'}
                            </button>

                            {!isRejecting && (
                                <button
                                    onClick={() => handleProcess('approved')}
                                    disabled={processing}
                                    className={`flex-1 px-2 md:px-8 py-1 md:py-3 font-bold rounded border-2 shadow-md transition-all font-nexa uppercase text-[10px] md:text-sm flex items-center justify-center gap-1 md:gap-2 landscape-compact-btn
                                        ${!processing 
                                            ? 'bg-green-700 text-white hover:bg-green-900 border-green-700' 
                                            : 'bg-gray-400 text-gray-200 cursor-not-allowed border-gray-400'}`}
                                >
                                    <Check className="w-3 h-3 md:w-4 md:h-4" />
                                    ОДОБРИТЬ
                                </button>
                            )}
                        </div>

                        <button
                            onClick={isRejecting ? () => setIsRejecting(false) : onClose}
                            disabled={processing}
                            className="w-full py-0.5 md:py-2 text-hogwarts-ink font-nexa uppercase text-[10px] md:text-sm hover:bg-hogwarts-bronze/10 rounded border border-hogwarts-bronze transition-colors landscape-compact-btn"
                        >
                            {isRejecting ? 'Назад' : 'Закрыть'}
                        </button>
                    </div>
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                @media (min-width: 768px) {
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(139, 115, 85, 0.05);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(139, 115, 85, 0.3);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(139, 115, 85, 0.5);
                }

                /* Принудительные стили для горизонтального режима (Landscape) на телефонах */
                @media (orientation: landscape) and (max-height: 500px) {
                    .landscape-compact-p {
                        padding: 4px !important;
                    }
                    .landscape-compact-gap {
                        gap: 4px !important;
                    }
                    .landscape-compact-btn {
                        padding-top: 4px !important;
                        padding-bottom: 4px !important;
                        font-size: 9px !important;
                    }
                    .landscape-compact-header {
                        padding: 4px 8px !important;
                    }
                    .landscape-compact-text {
                        font-size: 11px !important;
                        line-height: 1.2 !important;
                    }
                }
            `}</style>
        </div>
    );
};