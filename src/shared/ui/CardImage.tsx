import { useState } from 'react';
import styles from './CardImage.module.css';
import { strings } from '@/shared/i18n/pt-BR';

type Props = {
  src: string | null;
  alt: string;
  highSrc?: string | null;
  className?: string;
  priority?: boolean;
};

export function CardImage({ src, alt, highSrc, className, priority }: Props) {
  const [failed, setFailed] = useState(false);
  const url = highSrc || src;

  if (!url || failed) {
    return (
      <div className={[styles.fallback, className].filter(Boolean).join(' ')} role="img" aria-label={alt}>
        <span>{strings.card.imageFallback}</span>
      </div>
    );
  }

  return (
    <img
      className={[styles.img, className].filter(Boolean).join(' ')}
      src={url}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
