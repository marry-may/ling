/*
 * Decorative line illustrations for the landing page. Colours come from the --ill-* tokens in Landing.css, the small
 * looping animations from the ill-anim-* classes there.
 */

function Sparkle({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}><path className="ill-gold ill-anim-twinkle" style={{ animationDelay: `${-(x % 7) * 0.4}s` }} d="M0 -8 L2.4 -2.4 8 0 2.4 2.4 0 8 -2.4 2.4 -8 0 -2.4 -2.4Z" /></g>
}

function WordChip({ x, y, width, word }: { x: number; y: number; width: number; word: string }) {
  return (
    <g className="ill-anim-float" style={{ animationDelay: `${-((x + y) % 9) * 0.45}s` }}>
      <rect className="ill-paper ill-outline" x={x} y={y} width={width} height={24} rx={12} />
      <text className="ill-chip-text" x={x + width / 2} y={y + 16}>{word}</text>
    </g>
  )
}

/** A book file dropping into an open book. */
export function UploadIllustration() {
  return (
    <svg className="illustration" viewBox="0 0 200 120" aria-hidden="true">
      <path className="ill-paper ill-outline" d="M100 106 C84 99 64 98 44 103 L44 62 C64 57 84 58 100 65 Z" />
      <path className="ill-paper ill-outline" d="M100 106 C116 99 136 98 156 103 L156 62 C136 57 116 58 100 65 Z" />
      <path className="ill-stroke" d="M100 65 V106" />
      {[[54, 73, 34], [54, 81, 28], [54, 89, 36], [112, 73, 34], [112, 81, 26], [112, 89, 32]].map(([x, y, width]) => (
        <rect key={`${x}-${y}`} className="ill-text" x={x} y={y} width={width} height={3.5} rx={1.75} />
      ))}
      <g className="ill-anim-drop">
        <g transform="rotate(-10 70 28)">
          <path className="ill-paper ill-outline" d="M56 4 H80 L90 14 V48 A4 4 0 0 1 86 52 H56 A4 4 0 0 1 52 48 V8 A4 4 0 0 1 56 4 Z" />
          <path className="ill-panel ill-outline" d="M80 4 V14 H90" />
          <rect className="ill-green" x={56} y={32} width={30} height={11} rx={3} />
          <text className="ill-label" x={71} y={40}>EPUB</text>
        </g>
      </g>
      <path className="ill-coral-stroke ill-anim-dash" strokeDasharray="3 5" d="M98 22 C120 18 130 34 120 54" />
      <path className="ill-coral-stroke" d="M114 49 L120 56 L126 49" />
      <Sparkle x={152} y={24} />
      <circle className="ill-green-soft" cx={170} cy={46} r={4} />
    </svg>
  )
}

/** A page with highlighted words and a translation bubble over the tapped one. */
export function TapWordIllustration() {
  return (
    <svg className="illustration" viewBox="0 0 200 120" aria-hidden="true">
      <rect className="ill-paper ill-outline" x={22} y={40} width={156} height={74} rx={10} />
      <rect className="ill-green ill-anim-pulse" x={82} y={50} width={42} height={14} rx={4} />
      <rect className="ill-blue" x={36} y={66} width={44} height={14} rx={4} />
      <rect className="ill-yellow" x={110} y={82} width={36} height={14} rx={4} />
      {[[36, 55, 40], [88, 55, 30, 'white'], [130, 55, 34], [40, 71, 36], [86, 71, 76], [36, 87, 68], [114, 87, 28], [150, 87, 14], [36, 103, 52], [94, 103, 44]].map(([x, y, width, tone]) => (
        <rect key={`${x}-${y}`} className={tone ? 'ill-white' : 'ill-text'} x={x} y={y} width={width} height={4} rx={2} />
      ))}
      <g className="ill-anim-pop">
        <path className="ill-paper ill-outline" d="M78 2 H150 A8 8 0 0 1 158 10 V30 A8 8 0 0 1 150 38 H110 L103 46 L96 38 H78 A8 8 0 0 1 70 30 V10 A8 8 0 0 1 78 2 Z" />
        <rect className="ill-green" x={80} y={11} width={38} height={6} rx={3} />
        <rect className="ill-text" x={80} y={23} width={54} height={4} rx={2} />
        <circle className="ill-green-soft" cx={146} cy={15} r={6} />
        <path className="ill-green-stroke ill-anim-sound" d="M143 13 V17 M146 11.5 V18.5 M149 13 V17" />
      </g>
      <Sparkle x={178} y={22} size={0.8} />
    </svg>
  )
}

/** A stack of flashcards: the front one answered correctly. */
export function TrainingIllustration() {
  return (
    <svg className="illustration" viewBox="0 0 200 120" aria-hidden="true">
      <rect className="ill-panel ill-outline" x={52} y={16} width={96} height={74} rx={10} transform="rotate(-8 100 54)" />
      <rect className="ill-panel ill-outline" x={52} y={16} width={96} height={74} rx={10} transform="rotate(6 100 54)" />
      <rect className="ill-paper ill-outline" x={50} y={14} width={100} height={80} rx={10} />
      <rect className="ill-green" x={64} y={27} width={48} height={7} rx={3.5} />
      <rect className="ill-green-soft" x={64} y={44} width={34} height={14} rx={4} />
      <rect className="ill-panel" x={102} y={44} width={34} height={14} rx={4} />
      <rect className="ill-panel" x={64} y={62} width={34} height={14} rx={4} />
      <rect className="ill-panel" x={102} y={62} width={34} height={14} rx={4} />
      <g className="ill-anim-pulse">
        <circle className="ill-green" cx={148} cy={16} r={13} />
        <path className="ill-check" d="M142 16 L146.5 20.5 L154.5 12" />
      </g>
      <rect className="ill-panel" x={56} y={104} width={88} height={6} rx={3} />
      <rect className="ill-coral ill-anim-progress" x={56} y={104} width={60} height={6} rx={3} />
      <Sparkle x={36} y={30} size={0.9} />
    </svg>
  )
}

/** A shelf of books with a plant and greetings in several languages. */
export function ShelfIllustration() {
  return (
    <svg className="illustration shelf-illustration" viewBox="0 0 280 170" aria-hidden="true">
      <WordChip x={18} y={18} width={62} word="hello" />
      <WordChip x={150} y={8} width={56} word="hola" />
      <WordChip x={214} y={40} width={56} word="ciao" />
      <WordChip x={88} y={34} width={70} word="привіт" />
      <Sparkle x={128} y={14} size={0.8} />
      <Sparkle x={248} y={18} size={0.6} />
      <rect className="ill-green" x={44} y={70} width={28} height={78} rx={3} />
      <rect className="ill-white-soft" x={49} y={82} width={18} height={3} rx={1.5} />
      <rect className="ill-white-soft" x={49} y={134} width={18} height={3} rx={1.5} />
      <rect className="ill-coral" x={74} y={88} width={22} height={60} rx={3} />
      <rect className="ill-white-soft" x={78} y={98} width={14} height={3} rx={1.5} />
      <rect className="ill-gold" x={98} y={64} width={30} height={84} rx={3} />
      <rect className="ill-white-soft" x={103} y={76} width={20} height={3} rx={1.5} />
      <rect className="ill-white-soft" x={103} y={82} width={14} height={3} rx={1.5} />
      <g className="ill-anim-lean"><rect className="ill-green-soft ill-outline" x={132} y={80} width={22} height={68} rx={3} transform="rotate(14 154 148)" /></g>
      <g className="ill-anim-plant">
        <path className="ill-green" d="M210 124 C204 100 186 92 178 96 C182 112 196 122 210 124 Z" />
        <path className="ill-green-soft ill-outline" d="M210 124 C214 96 232 88 242 92 C236 110 222 120 210 124 Z" />
        <path className="ill-green-stroke" d="M210 124 C208 112 206 104 210 88" />
        <path className="ill-green" d="M210 92 C200 80 202 70 208 66 C214 74 214 84 210 92 Z" />
      </g>
      <path className="ill-coral" d="M190 124 H230 L225 148 H195 Z" />
      <rect className="ill-shelf" x={24} y={148} width={236} height={7} rx={3.5} />
    </svg>
  )
}

/** Floating word bubbles on both sides of the hero title (wide screens only). */
export function HeroDecor() {
  return (
    <>
      <svg className="hero-decor hero-decor-left" viewBox="0 0 150 170" aria-hidden="true">
        <WordChip x={10} y={20} width={78} word="bonjour" />
        <WordChip x={50} y={70} width={60} word="hola" />
        <Sparkle x={26} y={110} />
        <circle className="ill-green-soft" cx={120} cy={130} r={6} />
        <path className="ill-coral-stroke ill-anim-dash" strokeDasharray="2 5" d="M96 34 C126 40 134 60 116 72" />
      </svg>
      <svg className="hero-decor hero-decor-right" viewBox="0 0 150 170" aria-hidden="true">
        <WordChip x={50} y={14} width={70} word="hello" />
        <WordChip x={14} y={66} width={70} word="ciao" />
        <WordChip x={60} y={116} width={78} word="привет" />
        <Sparkle x={130} y={78} size={0.8} />
      </svg>
    </>
  )
}
