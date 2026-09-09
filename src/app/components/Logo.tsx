type LogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
  alt?: string;
};

/** Brand mark + optional wordmark for Planeta Bola. */
export function Logo({
  className = "",
  markClassName = "h-10 w-10",
  showWordmark = false,
  alt = "Planeta Bola",
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 min-w-0 ${className}`} role="img" aria-label={alt}>
      <svg
        viewBox="0 0 64 64"
        className={`flex-shrink-0 ${markClassName}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        {/* Outer glow disc */}
        <circle cx="32" cy="32" r="30" fill="#0a0a0a" />
        <circle cx="32" cy="32" r="28" stroke="#43A832" strokeWidth="2.5" fill="#121812" />

        {/* Soccer ball */}
        <circle cx="32" cy="32" r="16" fill="#f5f5f5" />
        <path
          d="M32 16 L38.5 20.5 L36.5 28 L27.5 28 L25.5 20.5 Z"
          fill="#111"
        />
        <path d="M32 16 L25.5 20.5 L20 18.5 L24 16.5 Z" fill="#43A832" opacity="0.9" />
        <path d="M32 16 L38.5 20.5 L44 18.5 L40 16.5 Z" fill="#43A832" opacity="0.9" />
        <path d="M25.5 20.5 L27.5 28 L22 33 L18 26 Z" fill="#43A832" opacity="0.85" />
        <path d="M38.5 20.5 L36.5 28 L42 33 L46 26 Z" fill="#43A832" opacity="0.85" />
        <path d="M27.5 28 L36.5 28 L39 36 L32 40 L25 36 Z" fill="#111" />
        <path d="M22 33 L25 36 L22 44 L18 38 Z" fill="#43A832" opacity="0.8" />
        <path d="M42 33 L39 36 L42 44 L46 38 Z" fill="#43A832" opacity="0.8" />
        <path d="M25 36 L32 40 L28 48 L22 44 Z" fill="#43A832" opacity="0.85" />
        <path d="M39 36 L32 40 L36 48 L42 44 Z" fill="#43A832" opacity="0.85" />

        {/* Planet orbit rings */}
        <ellipse
          cx="32"
          cy="32"
          rx="26"
          ry="10"
          transform="rotate(-28 32 32)"
          stroke="#43A832"
          strokeWidth="2.2"
          opacity="0.95"
        />
        <ellipse
          cx="32"
          cy="32"
          rx="26"
          ry="10"
          transform="rotate(-28 32 32)"
          stroke="#C41230"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          opacity="0.9"
        />

        {/* Small accent star */}
        <circle cx="50" cy="18" r="1.6" fill="#ffd600" />
      </svg>

      {showWordmark && (
        <span className="min-w-0 leading-tight">
          <span className="block font-[Oswald] text-sm sm:text-base tracking-wide uppercase text-white truncate">
            Planeta Bola
          </span>
          <span className="block text-[10px] font-mono tracking-[0.18em] uppercase text-primary/90 truncate">
            Arena Soccer
          </span>
        </span>
      )}
    </span>
  );
}

export default Logo;
