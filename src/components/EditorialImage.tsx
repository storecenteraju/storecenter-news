import React, { useEffect, useState } from 'react';

interface EditorialImageProps {
  src: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
  foregroundClassName?: string;
  children?: React.ReactNode;
}

/**
 * Preserva a fotografia editorial completa e usa a própria imagem como um
 * fundo desfocado. Isso melhora capas verticais ou com pessoas sem recortar
 * rostos, inventar cenários ou consumir uma API de geração de imagens.
 */
export default function EditorialImage({
  src,
  fallbackSrc,
  alt,
  className = '',
  foregroundClassName = '',
  children
}: EditorialImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setResolvedSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (resolvedSrc !== fallbackSrc) {
      setResolvedSrc(fallbackSrc);
    }
  };

  return (
    <div className={`relative overflow-hidden bg-slate-950 ${className}`}>
      <img
        src={resolvedSrc}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        onError={handleError}
        className="absolute inset-0 h-full w-full scale-125 object-cover opacity-65 blur-2xl"
      />
      <div className="absolute inset-0 bg-slate-950/15" />
      <img
        src={resolvedSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={handleError}
        className={`relative z-10 h-full w-full object-contain ${foregroundClassName}`}
      />
      {children}
    </div>
  );
}
