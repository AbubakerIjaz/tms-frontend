import { type ButtonHTMLAttributes } from 'react'

const variants = {
  primary: 'btn-gradient text-white border-0',
  secondary: 'bg-white text-slate-700 border border-slate-200/80 hover:border-brand-200 hover:bg-brand-50/50 shadow-sm',
  danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 shadow-sm shadow-red-200',
  ghost: 'text-slate-600 hover:bg-slate-100/80',
  accent: 'bg-gradient-to-r from-accent-500 to-accent-400 text-surface-950 font-semibold hover:from-accent-600 hover:to-accent-500 shadow-md shadow-accent-200',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 rounded-xl',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
