import { useState } from 'react';
import { Disc3, Smartphone } from 'lucide-react';

// Brand image generated for MOVILDJ
export const MOVILDJ_LOGO_SRC = '/src/assets/images/movildj_logo_1788755860709.jpg';

interface MovilDjLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  className?: string;
  variant?: 'dark' | 'light' | 'gold';
}

export function MovilDjLogo({
  size = 'md',
  showText = true,
  subtitle,
  className = '',
}: MovilDjLogoProps) {
  const [imageError, setImageError] = useState(false);

  const sizeMap = {
    xs: {
      img: 'w-6 h-6 rounded-lg',
      text: 'text-xs tracking-tight',
      sub: 'text-[9px]',
    },
    sm: {
      img: 'w-8 h-8 rounded-xl',
      text: 'text-sm tracking-tight',
      sub: 'text-[10px]',
    },
    md: {
      img: 'w-10 h-10 rounded-xl',
      text: 'text-base lg:text-lg tracking-tight',
      sub: 'text-[11px]',
    },
    lg: {
      img: 'w-14 h-14 rounded-2xl',
      text: 'text-xl lg:text-2xl tracking-tight',
      sub: 'text-xs',
    },
    xl: {
      img: 'w-20 h-20 rounded-3xl',
      text: 'text-3xl lg:text-4xl tracking-tight',
      sub: 'text-sm',
    },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Emblem / Image Logo */}
      <div
        className={`relative shrink-0 overflow-hidden border border-amber-500/30 bg-slate-900 shadow-md shadow-amber-500/10 flex items-center justify-center group ${currentSize.img}`}
      >
        {!imageError ? (
          <img
            src={MOVILDJ_LOGO_SRC}
            alt="MOVILDJ Logo"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-cyan-600 via-slate-900 to-amber-500 flex items-center justify-center text-amber-300">
            <div className="relative">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <Disc3 className="w-3 h-3 text-amber-400 absolute -bottom-1 -right-1 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Typography Brand */}
      {showText && (
        <div className="flex flex-col min-w-0 leading-tight">
          <div className={`font-black text-white ${currentSize.text} flex items-center gap-0.5`}>
            <span className="text-white">MOVIL</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-300">
              DJ
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-0.5 animate-pulse inline-block" />
          </div>
          {subtitle && (
            <span className={`text-slate-400 font-medium truncate ${currentSize.sub}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
