import React, { useEffect, useState, useRef } from 'react';
import { Bell, Check, Info, XCircle, CheckCircle, Trash2, CheckSquare, Clock } from 'lucide-react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { Notification, RaceChangeRequest } from '../lib/api/types';
import { api } from '../lib/api';

export const Notifications: React.FC = () => {
    const { user, notifications, fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
    const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
    const navigate = useNavigate();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            await markNotificationAsRead(notification.id);
        }
        if (notification.link && !notification.link.startsWith('race_request:')) {
            navigate(notification.link);
            setIsOpen(false);
        }
    };

    const handleProcessRaceRequest = async (e: React.MouseEvent, notificationId: string, requestId: string, status: 'approved' | 'rejected') => {
        e.stopPropagation();
        if (!user) return;

        if (status === 'rejected' && !rejectionReasons[requestId]) {
            alert('Пожалуйста, укажите причину отказа');
            return;
        }

        setProcessingRequestId(requestId);
        try {
            await api.raceRequests.process(requestId, {
                status,
                admin_id: user.id,
                rejection_reason: rejectionReasons[requestId]
            });
            
            // Mark notification as read and then delete it since it's processed
            await markNotificationAsRead(notificationId);
            await deleteNotification(notificationId);
            
            // Clear rejection reason
            setRejectionReasons(prev => {
                const next = { ...prev };
                delete next[requestId];
                return next;
            });
        } catch (err) {
            console.error('Error processing race request:', err);
            alert('Ошибка при обработке заявки');
        } finally {
            setProcessingRequestId(null);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await deleteNotification(id);
    };

    const handleMarkAllRead = async () => {
        await markAllNotificationsAsRead();
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-hogwarts-green" />;
            case 'error': return <XCircle className="w-5 h-5 text-hogwarts-red" />;
            case 'warning': return <Info className="w-5 h-5 text-hogwarts-gold" />;
            default: return <Info className="w-5 h-5 text-hogwarts-blue" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-hogwarts-gold hover:text-white transition-colors rounded-full hover:bg-white/10"
                title="Уведомления"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-hogwarts-red text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-hogwarts-ink">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-xl border-2 border-hogwarts-gold overflow-hidden z-50">
                    <div className="p-3 bg-hogwarts-blue text-white font-serif font-bold border-b border-hogwarts-gold flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span>Уведомления</span>
                            {unreadCount > 0 && (
                                <span className="text-xs font-normal opacity-80 bg-white/20 px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllRead}
                                className="text-xs font-normal opacity-80 hover:opacity-100 flex items-center gap-1 hover:text-hogwarts-gold transition-colors"
                                title="Отметить все как прочитанные"
                            >
                                <CheckSquare className="w-3 h-3" />
                                Отметить все прочитанными
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-hogwarts-ink/50 font-serif">
                                Совы еще не прилетали...
                            </div>
                        ) : (
                            <div className="divide-y divide-hogwarts-bronze/20">
                                {notifications.map(notification => {
                                    const isRaceRequest = notification.link?.startsWith('race_request:');
                                    const requestId = isRaceRequest ? notification.link?.split(':')[1] : null;

                                    return (
                                        <div 
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`p-4 hover:bg-hogwarts-parchment/50 transition-colors cursor-pointer flex gap-3 group relative ${!notification.read ? 'bg-hogwarts-gold/5' : ''}`}
                                        >
                                            <div className="shrink-0 mt-1">
                                                {isRaceRequest ? <Clock className="w-5 h-5 text-hogwarts-blue" /> : getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 pr-6">
                                                <h4 className={`font-serif text-sm font-bold text-hogwarts-ink ${!notification.read ? 'text-hogwarts-blue' : ''}`}>
                                                    {notification.title}
                                                </h4>
                                                <p className="text-sm text-hogwarts-ink/80 mt-1 font-century leading-snug">
                                                    {notification.message}
                                                </p>

                                                {isRaceRequest && requestId && (
                                                    <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                                                        <input
                                                            type="text"
                                                            value={rejectionReasons[requestId] || ''}
                                                            onChange={(e) => setRejectionReasons(prev => ({ ...prev, [requestId]: e.target.value }))}
                                                            placeholder="Причина отказа..."
                                                            className="w-full px-2 py-1 text-xs border rounded bg-white focus:ring-1 focus:ring-hogwarts-red outline-none"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={(e) => handleProcessRaceRequest(e, notification.id, requestId, 'approved')}
                                                                disabled={!!processingRequestId}
                                                                className="flex-1 bg-green-600 text-white text-[10px] font-bold py-1 px-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                                                            >
                                                                ОДОБРИТЬ
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleProcessRaceRequest(e, notification.id, requestId, 'rejected')}
                                                                disabled={!!processingRequestId}
                                                                className="flex-1 bg-red-600 text-white text-[10px] font-bold py-1 px-2 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                                                            >
                                                                ОТКЛОНИТЬ
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <span className="text-xs text-hogwarts-ink/40 mt-2 block">
                                                    {new Date(notification.created_at).toLocaleDateString('ru-RU', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <div className="absolute right-2 top-2 flex flex-col gap-2">
                                                 {!notification.read && (
                                                    <div className="w-2 h-2 bg-hogwarts-red rounded-full self-end mb-1"></div>
                                                )}
                                                <button
                                                    onClick={(e) => handleDelete(e, notification.id)}
                                                    className="p-1 text-hogwarts-ink/30 hover:text-hogwarts-red transition-colors opacity-0 group-hover:opacity-100 rounded-full hover:bg-hogwarts-red/10"
                                                    title="Удалить уведомление"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
