import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showSubtitle?: boolean;
  showPortal?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Logo = ({ className, showSubtitle = false, showPortal = false, size = 'md' }: LogoProps) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl'
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="flex items-center">
        <span className={cn('logo-bro', sizeClasses[size])}>BRO</span>
        <span className={cn('logo-totype ml-1', sizeClasses[size])}>TOTYPE</span>
      </div>
      {showSubtitle && (
        <p className="text-muted-foreground text-xs tracking-[0.3em] uppercase">
          Brother you never had
        </p>
      )}
      {showPortal && (
        <div className="flex items-center gap-3 mt-2">
          <div className="h-px w-8 bg-border" />
          <span className="text-brofix-blue font-semibold tracking-wider uppercase text-sm">
            BroFix Portal
          </span>
          <div className="h-px w-8 bg-border" />
        </div>
      )}
    </div>
  );
};

export default Logo;
