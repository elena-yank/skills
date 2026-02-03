import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Area, Point } from 'react-easy-crop';
import { X, Check } from 'lucide-react';
import frameSvg from '../assets/frame.svg';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  const rotRad = getRadianAngle(rotation);

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // translate canvas context to a central location to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw image
  ctx.drawImage(image, 0, 0);

  // croppedAreaPixels values are bounding box relative
  // extract the cropped image using these values
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // paste generated rotate image at the top left corner
  ctx.putImageData(data, 0, 0);

  // As Base64 string
  return canvas.toDataURL('image/jpeg');
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteHandler = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        onCropComplete(croppedImage);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-black/90 p-4">
      <div className="flex justify-between items-center mb-4 text-white">
        <h2 className="text-xl font-magical font-serif">Редактирование аватара</h2>
        <button onClick={onCancel} className="text-white/70 hover:text-white">
          <X className="w-8 h-8" />
        </button>
      </div>
      
      <div className="relative flex-1 bg-black rounded-lg overflow-hidden border-2 border-hogwarts-gold mb-4">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={onZoomChange}
        />
        {/* Golden Ring Overlay - strictly visual, matching the crop shape */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* The crop area in react-easy-crop with aspect 1 and cropShape="round" is centered. 
                However, react-easy-crop doesn't expose the exact DOM element easily for overlaying.
                But since it's centered, we can try to render a frame. 
                Actually, react-easy-crop handles the "darkening" outside the crop. 
                We just want to show the user what it will look like.
            */}
            <div className="w-[80%] h-[80%] max-w-[300px] max-h-[300px] rounded-full border-4 border-hogwarts-gold opacity-50 shadow-[0_0_20px_rgba(255,215,0,0.5)]" 
                 style={{ 
                     // This is an approximation. react-easy-crop adjusts size based on container. 
                     // It's hard to perfectly align a custom overlay without hooking into internal logic.
                     // But we can just rely on the user seeing the circle mask provided by the library.
                     display: 'none' // Let's hide this custom overlay and rely on the library's mask + our border after crop
                 }}
            />
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 bg-hogwarts-blue/20 rounded-lg border border-hogwarts-gold/30">
        <div className="flex items-center gap-4">
          <span className="text-white font-nexa">Масштаб</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-hogwarts-gold cursor-pointer"
          />
        </div>

        <div className="flex justify-end gap-4">
            <button
                onClick={onCancel}
                className="px-6 py-2 text-white font-nexa hover:bg-white/10 rounded transition-colors"
            >
                Отмена
            </button>
            <button
                onClick={handleSave}
                className="px-6 py-2 bg-hogwarts-gold text-hogwarts-blue font-bold font-nexa rounded hover:bg-yellow-500 transition-colors flex items-center gap-2"
            >
                <Check className="w-5 h-5" />
                Сохранить
            </button>
        </div>
      </div>
    </div>
  );
};
