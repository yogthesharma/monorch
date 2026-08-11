import { cn } from "@/lib/utils";

/** Monorch mark — viewBox 46×55. Uses currentColor. */
export const MONORCH_LOGO_PATH =
  "M22.6 5.70001V27.2L17.7 24.4C9 19.4 3.59999 10.1 3.59999 0H0V24.6C0 32.6 4.59999 40 11.9 43.5L22.7 48.7V27.2L27.6 30C36.3 35 41.7 44.3 41.7 54.4H45.3V29.8C45.3 21.8 40.7 14.4 33.4 10.9L22.6 5.70001Z";

type MonorchLogoProps = {
  className?: string;
  /** Accessible name. Omit when the mark sits next to visible "Monorch" text. */
  title?: string;
};

export function MonorchLogo({ className, title }: MonorchLogoProps) {
  return (
    <svg
      viewBox="0 0 46 55"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path d={MONORCH_LOGO_PATH} fill="currentColor" />
    </svg>
  );
}
