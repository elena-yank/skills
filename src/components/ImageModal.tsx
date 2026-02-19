import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageUrl, altText }) => {
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
      >
        <X className="w-8 h-8" />
      </button>
      
      <div 
        className="relative max-w-full max-h-full flex items-center justify-center p-2" 
        onClick={e => e.stopPropagation()}
      >
         <img 
           src={imageUrl} 
           alt={altText} 
           className="max-w-full max-h-[90vh] object-contain border-4 border-hogwarts-gold rounded-lg shadow-2xl"
         />
      </div>
    </div>,
    document.body
  );
};
