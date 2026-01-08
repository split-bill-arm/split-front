import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from "react";

type ClassValue = string | undefined | false;

function cx(...values: ClassValue[]) {
  return values.filter(Boolean).join(" ");
}

type BaseProps = {
  children: ReactNode;
  className?: string;
};

export function Container({ children, className }: BaseProps) {
  return <div className={cx("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function Card({ children, className }: BaseProps) {
  return <div className={cx("rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm", className)}>{children}</div>;
}

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-200",
    secondary: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-200",
    ghost: "bg-white text-slate-700 hover:bg-slate-100 focus:ring-slate-200 border border-slate-200",
  };

  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cx(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100",
        className,
      )}
      {...props}
    />
  );
}

type PillTone = "info" | "neutral";

type PillProps = BaseProps & {
  tone?: PillTone;
};

export function Pill({ children, className, tone = "neutral" }: PillProps) {
  const tones: Record<PillTone, string> = {
    info: "border-blue-200 bg-blue-50 text-blue-700",
    neutral: "border-slate-200 bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
