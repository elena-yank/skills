import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface GrantSkillModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
    skillName: string;
    userName: string;
}

export const GrantSkillModal: React.FC<GrantSkillModalProps> = ({ 
    isOpen, onClose, onConfirm, skillName, userName 
}) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) return;
        
        setIsSubmitting(true);
        try {
            await onConfirm(reason);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-white rounded-lg shadow-2xl p-6 border-2 border-hogwarts-gold">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-hogwarts-ink/50 hover:text-hogwarts-red transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-seminaria font-bold text-hogwarts-red mb-4 text-center">
                    Повысить уровень навыка на 100?
                </h2>
                
                <p className="mb-4 text-hogwarts-ink font-serif text-center">
                    Вы собираетесь выдать навык <strong>{skillName}</strong> пользователю <strong className="text-hogwarts-gold">{userName}</strong>.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-hogwarts-ink mb-1 font-serif">
                            Введите причину повышения навыка:
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full h-32 p-3 border border-hogwarts-bronze rounded-md focus:outline-none focus:ring-2 focus:ring-hogwarts-gold font-serif"
                            placeholder="Обоснование выдачи навыка..."
                            required
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-hogwarts-ink hover:bg-gray-100 rounded-md transition-colors font-serif"
                            disabled={isSubmitting}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={!reason.trim() || isSubmitting}
                            className="px-4 py-2 bg-hogwarts-green text-white rounded-md hover:bg-hogwarts-green/90 transition-colors font-serif font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Выдача...
                                </>
                            ) : (
                                'Выдать навык'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
