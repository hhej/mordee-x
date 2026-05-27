import Image from 'next/image';
import type { Doctor } from '@/lib/data';
import { hashDoctorId } from '@/lib/slot-generator';
import { cn } from '@/lib/utils';

// Doctors D001–D015 ship with hand-curated headshots in /public/avatars/.
// D016–D033 fall through to an SVG initials avatar generated deterministically
// from their id, so every doctor in the list looks visually distinct — no
// duplicate photos despite only 15 jpgs being on disk.
const REAL_AVATAR_IDS = new Set([
  'D001', 'D002', 'D003', 'D004', 'D005',
  'D006', 'D007', 'D008', 'D009', 'D010',
  'D011', 'D012', 'D013', 'D014', 'D015',
]);

const HONORIFICS = ['นพ.', 'พญ.', 'Dr.'];

function firstInitial(name: string): string {
  let stripped = name.trim();
  for (const h of HONORIFICS) {
    if (stripped.startsWith(h)) {
      stripped = stripped.slice(h.length).trim();
      break;
    }
  }
  return stripped.charAt(0) || '?';
}

// Deterministic mint-tinted gradient (hue offset within the brand palette).
function gradientFor(id: string): { from: string; to: string; angle: number } {
  const hash = hashDoctorId(id);
  // Bias all stops into mint/teal range (110°–170° hue) so the avatar palette
  // stays consistent with the rest of the UI.
  const hueA = 110 + (hash % 30);
  const hueB = 140 + ((hash >>> 5) % 30);
  const angle = (hash >>> 10) % 360;
  return {
    from: `hsl(${hueA}, 55%, 88%)`,
    to: `hsl(${hueB}, 60%, 70%)`,
    angle,
  };
}

interface DoctorAvatarProps {
  doctor: Pick<Doctor, 'id' | 'name' | 'name_en' | 'avatar'>;
  /** Pixel size of the square avatar. Default 48. */
  size?: number;
  /** Extra classes for the wrapping element (e.g., rounded shape, ring). */
  className?: string;
}

export function DoctorAvatar({ doctor, size = 48, className }: DoctorAvatarProps) {
  if (REAL_AVATAR_IDS.has(doctor.id)) {
    return (
      <Image
        src={doctor.avatar}
        alt={doctor.name_en}
        width={size}
        height={size}
        className={cn('rounded-xl object-cover ring-1 ring-border/40', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const { from, to, angle } = gradientFor(doctor.id);
  const initial = firstInitial(doctor.name);
  const gradientId = `doc-avatar-${doctor.id}`;

  return (
    <svg
      role="img"
      aria-label={doctor.name_en}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn('rounded-xl ring-1 ring-mint-200/60 dark:ring-mint-500/30', className)}
      style={{ width: size, height: size }}
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientTransform={`rotate(${angle} 0.5 0.5)`}
        >
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="14" fill={`url(#${gradientId})`} />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="46"
        fontWeight={600}
        fill="#15803d"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {initial}
      </text>
    </svg>
  );
}
