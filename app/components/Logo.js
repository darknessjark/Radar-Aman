export default function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#0D1B2A" />
      <g fill="none" stroke="#6FCBD3" strokeWidth="2" strokeLinecap="round">
        <path d="M9 24a9 9 0 0 1 9-9" /><path d="M5 24a13 13 0 0 1 13-13" opacity=".55" />
      </g>
      <path d="M18 24 L26.5 14.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="24" r="2.4" fill="#fff" />
    </svg>
  );
}
