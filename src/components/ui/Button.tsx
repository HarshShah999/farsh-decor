import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'gold' | 'outline' | 'ghost' | 'light' | 'outlineLight' | 'whatsapp';
type Size = 'sm' | 'md' | 'lg';

const base =
  'group relative inline-flex items-center justify-center gap-2.5 whitespace-nowrap font-sans font-semibold uppercase tracking-[0.16em] transition-all duration-300 ease-[var(--ease-lux)] disabled:pointer-events-none disabled:opacity-40 select-none';

const variants: Record<Variant, string> = {
  primary: 'bg-charcoal text-ivory hover:bg-black shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)]',
  gold: 'bg-gold text-white hover:bg-gold-dark shadow-[var(--shadow-soft)]',
  outline: 'border border-charcoal/80 text-charcoal hover:bg-charcoal hover:text-ivory',
  ghost: 'text-charcoal hover:bg-charcoal/5',
  light: 'bg-ivory text-charcoal hover:bg-white',
  outlineLight: 'border border-white/70 text-white hover:bg-white hover:text-charcoal backdrop-blur-[2px]',
  whatsapp: 'bg-[#1f9e55] text-white hover:bg-[#178246] shadow-[var(--shadow-soft)]',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[10px]',
  md: 'h-11 px-6 text-[11px]',
  lg: 'h-14 px-8 text-[11px]',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconLeft?: IconName;
  className?: string;
  children?: ReactNode;
}

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra = '') =>
  `${base} ${variants[variant]} ${sizes[size]} ${extra}`;

function Inner({ icon, iconLeft, children }: CommonProps) {
  return (
    <>
      {iconLeft && <Icon name={iconLeft} size={16} />}
      <span className="inline-flex items-center gap-2.5">{children}</span>
      {icon && (
        <Icon name={icon} size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
      )}
    </>
  );
}

export const Button = forwardRef<HTMLButtonElement, CommonProps & ButtonHTMLAttributes<HTMLButtonElement>>(
  function Button({ variant, size, icon, iconLeft, className = '', children, type = 'button', ...rest }, ref) {
    return (
      <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...rest}>
        <Inner icon={icon} iconLeft={iconLeft}>
          {children}
        </Inner>
      </button>
    );
  },
);

export function LinkButton({
  to,
  variant,
  size,
  icon,
  iconLeft,
  className = '',
  children,
  external,
}: CommonProps & { to: string; external?: boolean }) {
  if (external)
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={buttonClass(variant, size, className)}>
        <Inner icon={icon} iconLeft={iconLeft}>
          {children}
        </Inner>
      </a>
    );
  return (
    <Link to={to} className={buttonClass(variant, size, className)}>
      <Inner icon={icon} iconLeft={iconLeft}>
        {children}
      </Inner>
    </Link>
  );
}

export function IconButton({
  icon,
  label,
  active,
  className = '',
  tone = 'light',
  ...rest
}: { icon: IconName; label: string; active?: boolean; tone?: 'light' | 'dark' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const toneCls =
    tone === 'dark'
      ? active
        ? 'bg-ivory text-charcoal'
        : 'text-ivory/85 hover:bg-white/10 hover:text-white'
      : active
        ? 'bg-charcoal text-ivory'
        : 'text-charcoal hover:bg-charcoal/[0.06]';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 disabled:pointer-events-none disabled:opacity-30 ${toneCls} ${className}`}
      {...rest}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}
