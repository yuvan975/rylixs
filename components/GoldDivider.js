export default function GoldDivider({ className = "" }) {
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`}>
      <span className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-gold-400/70" />
      <svg
        width="18"
        height="14"
        viewBox="0 0 24 18"
        fill="none"
        className="shrink-0"
      >
        <path d="M2 16 4 6l5 5 3-9 3 9 5-5 2 10z" className="fill-gold-400" />
      </svg>
      <span className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-gold-400/70" />
    </div>
  );
}
