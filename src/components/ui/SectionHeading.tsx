import type { ReactNode } from 'react';
import { Reveal } from './Reveal';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
  light,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  action?: ReactNode;
  light?: boolean;
}) {
  const center = align === 'center';
  return (
    <Reveal
      className={`mb-12 flex flex-col gap-6 md:mb-16 ${center ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'}`}
    >
      <div className={center ? 'max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && <p className={`eyebrow mb-4 ${light ? 'text-gold' : ''}`}>{eyebrow}</p>}
        <h2 className={`text-4xl leading-[1.05] sm:text-5xl lg:text-[3.6rem] ${light ? 'text-ivory' : ''}`}>{title}</h2>
        {description && (
          <p className={`mt-5 max-w-xl text-[15px] leading-relaxed ${center ? 'mx-auto' : ''} ${light ? 'text-ivory/70' : 'text-muted'}`}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  );
}
