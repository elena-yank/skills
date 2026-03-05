import React, { useEffect, useState, useRef } from 'react';
import { Bell, Check, XCircle, CheckCircle, Trash2, CheckSquare, Clock, X } from 'lucide-react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { Notification, RaceChangeRequest } from '../lib/api/types';
import { api } from '../lib/api';
import { RaceRequestModal } from './RaceRequestModal';
import infoSvg from '../assets/info.svg';

export const Notifications: React.FC = () => {
    const { user, notifications, fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
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
        
        if (notification.link?.startsWith('race_request:')) {
            const requestId = notification.link.split(':')[1];
            setSelectedRequestId(requestId);
            setSelectedNotificationId(notification.id);
            setIsOpen(false);
            return;
        }

        if (notification.link) {
            navigate(notification.link);
            setIsOpen(false);
        }
    };

    const handleRaceRequestProcessed = async () => {
        if (selectedNotificationId) {
            // Mark as read and delete is already handled by the modal's parent if needed, 
            // but the user wants the notification to go away after processing.
            // In the previous version, it was deleting the notification.
            await deleteNotification(selectedNotificationId);
        }
        setSelectedRequestId(null);
        setSelectedNotificationId(null);
        fetchNotifications();
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
            case 'warning': return <img src={infoSvg} alt="Информация" className="w-5 h-5" />;
            default: return <img src={infoSvg} alt="Информация" className="w-5 h-5" />;
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
                    <span className="absolute top-0 right-0 w-5 h-5 bg-hogwarts-gold text-hogwarts-ink text-xs font-bold rounded-full flex items-center justify-center border-2 border-hogwarts-ink">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    {/* Overlay for mobile */}
                    <div 
                        className="fixed inset-0 bg-black/60 z-40 sm:hidden"
                        onClick={() => setIsOpen(false)}
                    />
                    
                    <div className="fixed inset-x-4 top-24 max-w-lg mx-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 md:w-96 bg-white rounded-lg shadow-xl border-2 border-hogwarts-gold overflow-hidden z-50">
                        <div className="p-3 bg-hogwarts-blue text-white font-serif font-bold border-b border-hogwarts-gold flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span>Уведомления</span>
                                {unreadCount > 0 && (
                                    <span className="text-xs font-normal opacity-80 bg-white/20 px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {unreadCount > 0 && (
                                    <button 
                                        onClick={handleMarkAllRead}
                                        className="text-xs font-normal opacity-80 hover:opacity-100 flex items-center gap-1 hover:text-hogwarts-gold transition-colors"
                                        title="Отметить все как прочитанные"
                                    >
                                        <CheckSquare className="w-3 h-3" />
                                        <span className="hidden xs:inline">Отметить все прочитанными</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                    title="Закрыть"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
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

                                                {isRaceRequest && (
                                                    <div className="mt-2 text-[10px] font-bold text-hogwarts-blue uppercase font-nexa flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Нажмите для просмотра заявки
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
            </>
        )}
            
            {selectedRequestId && (
                <RaceRequestModal
                    requestId={selectedRequestId}
                    onClose={() => {
                        setSelectedRequestId(null);
                        setSelectedNotificationId(null);
                    }}
                    onProcessed={handleRaceRequestProcessed}
                />
            )}
        </div>
    );
};
