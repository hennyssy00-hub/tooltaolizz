import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ children, variant = 'default', className, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-700 text-slate-300',
    success: 'bg-safe/20 text-safe border border-safe/30',
    warning: 'bg-watch/20 text-watch border border-watch/30',
    danger: 'bg-critical/20 text-critical border border-critical/30',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  };

  return (
    <span 
      className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}
