/*
 * Line illustrations for grammar lessons, one per lesson id. They are drawn on a 240×140 canvas from a few shared
 * pieces (people, speech bubbles, word chips, a time line); colours come from the --ga-* tokens in art.css. They are still pictures, without animation.
 */
import type { ReactNode } from 'react'
import { messages } from '../i18n'
import './art.css'

type Tone = 'green' | 'coral' | 'gold' | 'blue' | 'plain'

const chipWidth = (text: string, size = 12) => Math.round(text.length * size * 0.55 + 20)

/** A word or phrase in a rounded pill; `x` is its left edge unless `center` is set. */
function Chip({ x, y, text, tone = 'plain', center = false, size = 12 }: { x: number; y: number; text: string; tone?: Tone; center?: boolean; size?: number }) {
  const width = chipWidth(text, size)
  const left = center ? x - width / 2 : x
  return (
    <g>
      <rect className={`ga-chip-${tone}`} x={left} y={y} width={width} height={size + 12} rx={(size + 12) / 2} />
      <text className={`ga-word${tone === 'green' || tone === 'coral' ? ' on-color' : ''}`} style={{ fontSize: size }} x={left + width / 2} y={y + size + 3}>{text}</text>
    </g>
  )
}

/** A simple standing figure: `x, y` is the centre of the head. */
function Person({ x, y, tone = 'green', scale = 1 }: { x: number; y: number; tone?: Tone; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path className={`ga-body-${tone}`} d="M-15 40 C-15 22 -9 15 0 15 C9 15 15 22 15 40 Z" />
      <circle className="ga-paper ga-outline" r={10} />
    </g>
  )
}

/** A speech bubble with its tail pointing down at `tailX`. */
function Bubble({ x, y, text, tailX, size = 12, tone = 'plain' }: { x: number; y: number; text: string; tailX: number; size?: number; tone?: Tone }) {
  const width = chipWidth(text, size)
  const height = size + 16
  return (
    <g>
      <path className={`ga-bubble-${tone} ga-outline`} d={`M${x + 8} ${y} H${x + width - 8} A8 8 0 0 1 ${x + width} ${y + 8} V${y + height - 8} A8 8 0 0 1 ${x + width - 8} ${y + height} H${tailX + 6} L${tailX} ${y + height + 7} L${tailX - 6} ${y + height} H${x + 8} A8 8 0 0 1 ${x} ${y + height - 8} V${y + 8} A8 8 0 0 1 ${x + 8} ${y} Z`} />
      <text className="ga-word" style={{ fontSize: size }} x={x + width / 2} y={y + size + 5}>{text}</text>
    </g>
  )
}

/** The arrow of time with a "now" mark. */
function Timeline({ y = 106, now = 170, nowLabel = messages().grammar.now }: { y?: number; now?: number; nowLabel?: string }) {
  return (
    <g>
      <path className="ga-line" d={`M14 ${y} H222`} />
      <path className="ga-line" d={`M216 ${y - 5} L224 ${y} L216 ${y + 5}`} />
      <path className="ga-line-dashed" d={`M${now} ${y - 62} V${y + 6}`} />
      <circle className="ga-coral" cx={now} cy={y} r={4} />
      <text className="ga-label" x={now} y={y + 20}>{nowLabel}</text>
    </g>
  )
}

function Point({ x, y, tone = 'green', label }: { x: number; y: number; tone?: Tone; label?: string }) {
  return (
    <g>
      <circle className={`ga-${tone}`} cx={x} cy={y} r={6.5} />
      {label && <text className="ga-label" x={x} y={y + 20}>{label}</text>}
    </g>
  )
}

/** A wavy stretch of time: something in progress. */
function Wave({ from, to, y, tone = 'coral' }: { from: number; to: number; y: number; tone?: Tone }) {
  let d = `M${from} ${y}`
  for (let x = from; x < to; x += 10) d += ` q 2.5 -6 5 0 q 2.5 6 5 0`
  return <path className={`ga-${tone}-line`} d={d} />
}

function Arrow({ d, tone = 'coral', dashed = false, head }: { d: string; tone?: Tone; dashed?: boolean; head: string }) {
  return (
    <g>
      <path className={`ga-${tone}-line`} strokeDasharray={dashed ? '4 5' : undefined} d={d} />
      <path className={`ga-${tone}-line`} d={head} />
    </g>
  )
}

function Check({ x, y }: { x: number; y: number }) {
  return <g><circle className="ga-green" cx={x} cy={y} r={9} /><path className="ga-check" d={`M${x - 4} ${y} l3 3 l5 -6`} /></g>
}

function Sparkle({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}><path className="ga-gold" d="M0 -8 L2.4 -2.4 8 0 2.4 2.4 0 8 -2.4 2.4 -8 0 -2.4 -2.4Z" /></g>
}

function Cloud({ x, y, scale = 1, className = 'ga-paper ga-outline' }: { x: number; y: number; scale?: number; className?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${scale})`} className={className} d="M-26 10 A10 10 0 0 1 -20 -6 A14 14 0 0 1 4 -12 A12 12 0 0 1 24 -2 A10 10 0 0 1 26 10 Z" />
}

function Sun({ x, y, r = 11 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <path key={angle} className="ga-gold-line" transform={`rotate(${angle} ${x} ${y})`} d={`M${x} ${y - r - 4} V${y - r - 9}`} />
      ))}
      <circle className="ga-gold" cx={x} cy={y} r={r} />
    </g>
  )
}

function Rain({ x, y }: { x: number; y: number }) {
  return <g>{[-14, -2, 10].map((dx) => <path key={dx} className="ga-blue-line" d={`M${x + dx} ${y} l-3 8`} />)}</g>
}

function Book({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path className="ga-paper ga-outline" d={`M${x} ${y + 30} C${x - 12} ${y + 25} ${x - 26} ${y + 25} ${x - 38} ${y + 28} V${y} C${x - 26} ${y - 3} ${x - 12} ${y - 3} ${x} ${y + 2} Z`} />
      <path className="ga-paper ga-outline" d={`M${x} ${y + 30} C${x + 12} ${y + 25} ${x + 26} ${y + 25} ${x + 38} ${y + 28} V${y} C${x + 26} ${y - 3} ${x + 12} ${y - 3} ${x} ${y + 2} Z`} />
      {[8, 14, 20].map((dy) => <g key={dy}><rect className="ga-text" x={x - 31} y={y + dy} width={24} height={2.6} rx={1.3} /><rect className="ga-text" x={x + 7} y={y + dy} width={24} height={2.6} rx={1.3} /></g>)}
    </g>
  )
}

function Envelope({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect className="ga-paper ga-outline" x={x} y={y} width={44} height={30} rx={4} />
      <path className="ga-line" d={`M${x + 2} ${y + 3} L${x + 22} ${y + 17} L${x + 42} ${y + 3}`} />
      <circle className="ga-coral" cx={x + 22} cy={y + 17} r={4} />
    </g>
  )
}

function Dog({ x, y, tone = 'plain' }: { x: number; y: number; tone?: Tone }) {
  const fill = tone === 'plain' ? 'ga-text' : `ga-${tone}`
  return (
    <g>
      <ellipse className={fill} cx={x} cy={y} rx={11} ry={7} />
      <circle className={fill} cx={x + 11} cy={y - 7} r={6} />
      <path className={fill} d={`M${x + 13} ${y - 13} l5 -4 l-1 7 Z`} />
      <path className={`ga-${tone === 'plain' ? 'text' : tone}-line`} d={`M${x - 11} ${y - 2} l-6 -5`} />
    </g>
  )
}

function Heart({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <path className="ga-coral" transform={`translate(${x} ${y}) scale(${scale})`} d="M0 8 C-14 -1 -10 -12 -3 -10 C-1 -9.5 0 -8 0 -7 C0 -8 1 -9.5 3 -10 C10 -12 14 -1 0 8 Z" />
}

function House({ x, y, className = 'ga-paper ga-outline' }: { x: number; y: number; className?: string }) {
  return (
    <g>
      <path className={className} d={`M${x - 20} ${y} V${y - 24} L${x} ${y - 40} L${x + 20} ${y - 24} V${y} Z`} />
      <rect className="ga-gold" x={x - 5} y={y - 14} width={10} height={14} rx={2} />
    </g>
  )
}

/** A past moment where things could have gone another way: the real path goes on, the other one is dashed. */
function Fork({ chip, ghost }: { chip: string; ghost: string }) {
  return (
    <>
      <Timeline now={196} />
      <Chip x={14} y={10} text={chip} tone="green" />
      <Point x={70} y={106} tone="green" />
      <Arrow dashed d="M70 106 C92 60 120 56 150 58" head="M144 52 L151 58 L144 64" />
      <House x={176} y={74} className="ga-ghost" />
      <Chip x={112} y={76} text={ghost} tone="coral" size={10} />
      <Sparkle x={210} y={34} size={0.8} />
    </>
  )
}

/** Someone says a line; someone else passes it on. */
function Reported({ said, retold }: { said: string; retold: string }) {
  return (
    <>
      <Bubble x={12} y={10} text={said} tailX={42} />
      <Person x={42} y={86} tone="coral" />
      <Bubble x={226 - chipWidth(retold, 11)} y={44} text={retold} tailX={198} size={11} tone="green" />
      <Person x={198} y={96} tone="green" scale={0.95} />
      <path className="ga-line-dashed" d="M66 96 H170" />
    </>
  )
}

/** Two sentences whose words change places; `moved` marks the moving word in both rows. */
function Rows({ top, bottom, moved }: { top: string[]; bottom: string[]; moved: [number, number] }) {
  const place = (words: string[]) => {
    let x = 8
    return words.map((word) => {
      const left = x
      x += chipWidth(word, 10) + 5
      return { word, left, mid: left + chipWidth(word, 10) / 2 }
    })
  }
  const first = place(top)
  const second = place(bottom)
  const from = first[moved[0]].mid
  const to = second[moved[1]].mid
  return (
    <>
      {first.map((item, index) => <Chip key={index} x={item.left} y={18} text={item.word} size={10} tone={index === moved[0] ? 'coral' : 'plain'} />)}
      <Arrow d={`M${from} 44 C${from} 70 ${to} 62 ${to} 90`} head={`M${to - 5} 84 L${to} 91 L${to + 5} 84`} />
      {second.map((item, index) => <Chip key={index} x={item.left} y={96} text={item.word} size={10} tone={index === moved[1] ? 'coral' : 'plain'} />)}
    </>
  )
}

const ART: Record<string, () => ReactNode> = {
  // English
  'en-to-be': () => <>
    <rect className="ga-panel" x={10} y={118} width={220} height={8} rx={4} />
    <Person x={48} y={74} tone="green" />
    <Person x={120} y={74} tone="coral" />
    <Person x={182} y={78} tone="blue" scale={0.85} />
    <Person x={208} y={78} tone="gold" scale={0.85} />
    <Chip x={48} y={22} text="I am" tone="green" center />
    <Chip x={120} y={22} text="she is" tone="coral" center />
    <Chip x={195} y={22} text="they are" center />
  </>,
  'en-present-simple': () => <>
    <rect className="ga-paper ga-outline" x={18} y={16} width={128} height={108} rx={10} />
    <rect className="ga-green" x={18} y={16} width={128} height={20} rx={10} />
    <rect className="ga-green" x={18} y={26} width={128} height={10} />
    {Array.from({ length: 21 }, (_, index) => (
      <circle key={index} className={index % 7 > 4 ? 'ga-text' : 'ga-green-soft'} cx={32 + (index % 7) * 16.6} cy={54 + Math.floor(index / 7) * 22} r={6} />
    ))}
    {[0, 1, 2, 3, 4].map((day) => <path key={day} className="ga-green-line" d={`M${28 + day * 16.6} 76 l3 3 l5 -6`} />)}
    <circle className="ga-paper ga-outline" cx={190} cy={56} r={28} />
    <path className="ga-green-line" d="M190 56 V36" />
    <path className="ga-coral-line" d="M190 56 L203 64" />
    <Chip x={188} y={98} text="every day" tone="coral" center />
  </>,
  'en-there-is': () => <>
    <rect className="ga-panel" x={14} y={8} width={212} height={110} rx={10} />
    <rect className="ga-paper ga-outline" x={24} y={18} width={40} height={36} rx={4} />
    <path className="ga-line" d="M44 18 V54 M24 36 H64" />
    <rect className="ga-paper ga-outline" x={36} y={90} width={168} height={8} rx={3} />
    <path className="ga-line" d="M48 98 V126 M192 98 V126" />
    <g transform="translate(-14 0)">
      <ellipse className="ga-coral" cx={86} cy={80} rx={18} ry={10} />
      <circle className="ga-coral" cx={102} cy={68} r={8} />
      <path className="ga-coral" d="M96 63 l2 -9 l5 6 Z M104 61 l5 -8 l2 9 Z" />
      <path className="ga-coral-line" d="M68 82 C58 80 58 66 64 64" />
    </g>
    <path className="ga-paper ga-outline" d="M140 74 h14 v12 a4 4 0 0 1 -4 4 h-6 a4 4 0 0 1 -4 -4 Z M162 74 h14 v12 a4 4 0 0 1 -4 4 h-6 a4 4 0 0 1 -4 -4 Z" />
    <Chip x={100} y={14} text="there is a cat" tone="coral" size={11} />
    <Chip x={96} y={42} text="there are two cups" size={11} />
  </>,
  'en-present-continuous': () => <>
    <Timeline now={150} />
    <Wave from={120} to={180} y={92} />
    <Cloud x={150} y={44} scale={1.1} />
    <Rain x={150} y={58} />
    <Chip x={14} y={20} text="it's raining" tone="coral" />
    <Sparkle x={210} y={24} size={0.8} />
  </>,
  'en-past-simple': () => <>
    <Timeline />
    <Point x={70} y={106} tone="green" label="yesterday" />
    <Arrow dashed d="M166 96 C140 60 98 60 76 96" head="M74 88 L76 97 L84 92" />
    <Chip x={70} y={36} text="I went" tone="green" center />
    <Check x={34} y={80} />
  </>,
  'en-articles': () => <>
    <rect className="ga-panel" x={12} y={22} width={100} height={92} rx={12} />
    {[[36, 50], [80, 46], [42, 82], [86, 84]].map(([x, y], index) => <Dog key={index} x={x} y={y} tone={index === 2 ? 'green' : 'plain'} />)}
    <Chip x={62} y={112} text="a dog" tone="green" center />
    <path className="ga-yellow" d="M176 10 L138 100 H214 Z" />
    <ellipse className="ga-yellow" cx={176} cy={100} rx={38} ry={8} />
    <Dog x={172} y={90} tone="coral" />
    <Chip x={176} y={112} text="the dog" tone="coral" center />
  </>,
  'en-future': () => <>
    <Timeline now={70} />
    <Arrow d="M78 106 H160" head="M154 100 L161 106 L154 112" tone="green" />
    <path className="ga-green-line" d="M190 106 V64" />
    <path className="ga-coral" d="M190 64 h26 l-7 8 l7 8 h-26 Z" />
    <Chip x={14} y={14} text="I'm going to…" tone="green" />
    <Chip x={128} y={30} text="I'll…" tone="coral" />
    <Sparkle x={172} y={22} />
  </>,
  'en-present-perfect': () => <>
    <Timeline now={186} />
    <Point x={56} y={106} tone="green" />
    <Arrow d="M56 98 C90 46 150 46 180 92" head="M172 88 L181 93 L182 83" />
    <Check x={186} y={58} />
    <Chip x={22} y={20} text="I have finished" tone="coral" />
  </>,
  'en-conditionals': () => <>
    <Chip x={12} y={60} text="If…" tone="green" />
    <path className="ga-green-line" d="M56 72 C86 72 90 34 114 34 M56 72 C86 72 90 104 114 104" />
    <Sun x={136} y={34} />
    <Cloud x={138} y={100} scale={0.8} />
    <Rain x={138} y={110} />
    <Chip x={160} y={23} text="we'll go" size={10} />
    <Chip x={160} y={86} text="we'll stay" size={10} />
  </>,
  'en-passive': () => <>
    <Rows top={['Tom', 'wrote', 'the letter']} bottom={['The letter', 'was written', 'by Tom']} moved={[2, 0]} />
    <Envelope x={180} y={52} />
  </>,
  'en-past-perfect': () => <>
    <Timeline now={200} />
    <Point x={60} y={106} tone="coral" />
    <Point x={132} y={106} tone="green" />
    <text className="ga-label" x={60} y={126}>1</text>
    <text className="ga-label" x={132} y={126}>2</text>
    <Chip x={60} y={30} text="had left" tone="coral" center />
    <Chip x={132} y={58} text="arrived" tone="green" center />
    <path className="ga-line-dashed" d="M60 56 V98 M132 84 V98" />
  </>,
  'en-reported-speech': () => <Reported said="I'm tired." retold="She said she was tired." />,
  'en-third-conditional': () => <Fork chip="If I had known…" ghost="I would have…" />,
  'en-inversion': () => <Rows top={['I', 'have', 'never', 'seen']} bottom={['Never', 'have', 'I', 'seen']} moved={[2, 0]} />,
  'en-cleft': () => <>
    <path className="ga-yellow" d="M168 4 L124 92 H212 Z" />
    <ellipse className="ga-yellow" cx={168} cy={92} rx={44} ry={9} />
    <Chip x={8} y={74} text="What I need is" size={11} />
    <Chip x={168} y={74} text="a holiday" tone="coral" center />
    <Chip x={14} y={108} text="It was Anna who called." size={11} tone="green" />
    <Sparkle x={36} y={34} />
  </>,
  'en-participle-clauses': () => <>
    <Chip x={8} y={14} text="She opened the door." size={10} />
    <Chip x={164} y={14} text="She saw…" size={10} />
    <path className="ga-green-line" d="M70 40 C70 66 118 62 118 84 M196 40 C196 66 122 62 122 84" />
    <path className="ga-green-line" d="M114 78 L120 86 L126 78" />
    <Chip x={120} y={94} text="Opening the door, she saw…" size={10} tone="green" center />
  </>,
  'en-subjunctive': () => <>
    <rect className="ga-paper ga-outline" x={22} y={12} width={88} height={116} rx={6} />
    {[28, 38, 48, 58, 68, 78].map((y, index) => <rect key={y} className="ga-text" x={34} y={y} width={index % 2 ? 50 : 64} height={4} rx={2} />)}
    <circle className="ga-coral" cx={86} cy={104} r={13} />
    <path className="ga-coral" d="M80 114 l-4 14 l7 -4 l3 6 l2 -14 Z" />
    <Sparkle x={86} y={104} size={0.7} />
    <Chip x={124} y={34} text="It is vital" size={11} />
    <Chip x={124} y={68} text="that he be" size={11} tone="coral" />
    <Chip x={124} y={102} text="present." size={11} />
  </>,
  'en-agreement': () => <>
    <Chip x={8} y={20} text="The number of… is" size={11} tone="green" />
    <circle className="ga-green" cx={196} cy={32} r={9} />
    <path className="ga-line-dashed" d="M146 32 H180" />
    <Chip x={8} y={88} text="A number of… are" size={11} tone="coral" />
    {[[180, 92], [198, 88], [214, 98], [190, 108], [208, 114]].map(([x, y]) => <circle key={`${x}-${y}`} className="ga-coral" cx={x} cy={y} r={6} />)}
    <path className="ga-line-dashed" d="M146 100 H168" />
  </>,
  'en-ellipsis': () => <>
    <Bubble x={12} y={12} text="I love jazz." tailX={40} />
    <Person x={40} y={88} tone="coral" />
    <Bubble x={128} y={44} text="So do I." tailX={196} tone="green" />
    <text className="ga-ghost-text" x={170} y={36}>love jazz</text>
    <path className="ga-line-dashed" d="M136 30 H204" />
    <Person x={196} y={98} tone="green" scale={0.95} />
  </>,

  // Spanish
  'es-ser-estar': () => <>
    <Person x={56} y={70} tone="green" />
    <rect className="ga-paper ga-outline" x={6} y={92} width={30} height={22} rx={3} />
    <circle className="ga-green-soft" cx={15} cy={102} r={5} />
    <rect className="ga-text" x={23} y={99} width={9} height={3} rx={1.5} />
    <Chip x={56} y={20} text="soy médico" tone="green" center />
    <Person x={176} y={70} tone="coral" />
    <Cloud x={212} y={62} scale={0.5} />
    <Sun x={204} y={102} r={7} />
    <Chip x={176} y={20} text="estoy cansado" tone="coral" center />
    <rect className="ga-panel" x={10} y={120} width={220} height={7} rx={3.5} />
  </>,
  'es-presente': () => <>
    {([['-ar', 'hablo', 'green'], ['-er', 'como', 'coral'], ['-ir', 'vivo', 'gold']] as const).map(([ending, word, tone], index) => (
      <g key={ending}>
        <rect className={`ga-chip-${tone}`} x={18 + index * 72} y={22} width={60} height={60} rx={14} />
        <text className={`ga-big${tone === 'gold' ? '' : ' on-color'}`} x={48 + index * 72} y={62}>{ending}</text>
        <Chip x={48 + index * 72} y={96} text={word} center />
      </g>
    ))}
  </>,
  'es-genero': () => <>
    <rect className="ga-chip-blue" x={20} y={18} width={92} height={104} rx={14} />
    <text className="ga-big" x={66} y={58}>el</text>
    <Book x={66} y={74} />
    <rect className="ga-chip-coral" x={128} y={18} width={92} height={104} rx={14} />
    <text className="ga-big on-color" x={174} y={58}>la</text>
    <rect className="ga-paper" x={146} y={80} width={56} height={6} rx={3} />
    <path className="ga-paper-line" d="M152 86 V108 M196 86 V108" />
  </>,
  'es-gustar': () => <>
    <Book x={56} y={60} />
    <Arrow d="M100 76 C124 56 140 56 160 70" head="M152 66 L161 71 L154 78" />
    <Person x={190} y={76} tone="green" />
    <Heart x={190} y={36} scale={1.3} />
    <Chip x={56} y={108} text="me gusta" tone="coral" center />
  </>,
  'es-indefinido': () => <>
    <Timeline />
    <Point x={70} y={106} tone="green" label="ayer" />
    <Arrow dashed d="M166 96 C140 60 98 60 76 96" head="M74 88 L76 97 L84 92" />
    <Chip x={70} y={36} text="comí paella" tone="green" center />
    <Check x={34} y={80} />
  </>,
  'es-gerundio': () => <>
    <Timeline now={150} />
    <Wave from={120} to={180} y={92} />
    <Book x={150} y={44} />
    <Chip x={14} y={18} text="estoy leyendo" tone="coral" />
  </>,
  'es-imperfecto': () => <>
    <Timeline now={204} />
    <rect className="ga-yellow" x={26} y={90} width={140} height={10} rx={5} />
    <Cloud x={70} y={50} scale={0.8} />
    <Rain x={70} y={60} />
    <Chip x={36} y={20} text="llovía" center tone="plain" />
    <path className="ga-coral" d="M128 40 L118 66 h9 l-5 22 l16 -30 h-9 l6 -18 Z" />
    <Chip x={150} y={14} text="llegué" center tone="coral" />
    <Point x={128} y={106} tone="coral" />
  </>,
  'es-pronombres': () => <>
    <rect className="ga-gold" x={22} y={58} width={44} height={36} rx={4} />
    <rect className="ga-coral" x={40} y={58} width={8} height={36} />
    <path className="ga-coral-line" d="M44 58 C34 46 26 52 36 58 M44 58 C54 46 62 52 52 58" />
    <Arrow d="M76 76 H150" head="M143 70 L151 76 L143 82" />
    <Person x={184} y={60} tone="green" />
    <Chip x={14} y={14} text="le doy el regalo" size={11} />
    <Chip x={112} y={106} text="se lo doy" tone="coral" center />
  </>,
  'es-subjuntivo': () => <>
    <Person x={46} y={80} tone="green" />
    <circle className="ga-paper ga-outline" cx={70} cy={54} r={3} />
    <circle className="ga-paper ga-outline" cx={80} cy={44} r={5} />
    <Cloud x={150} y={44} scale={2.4} />
    <Person x={150} y={30} tone="coral" scale={0.55} />
    <Sparkle x={124} y={30} size={0.7} />
    <Sparkle x={178} y={24} size={0.6} />
    <Chip x={150} y={98} text="quiero que vengas" tone="coral" center />
  </>,
  'es-por-para': () => <>
    <path className="ga-paper ga-outline" d="M84 62 V26 A22 22 0 0 1 128 26 V62 H118 V28 A12 12 0 0 0 94 28 V62 Z" />
    <Arrow d="M16 50 H200" head="M193 44 L201 50 L193 56" tone="green" />
    <Chip x={136} y={16} text="por el parque" size={10} tone="green" />
    <Arrow d="M16 104 H184" head="M177 98 L185 104 L177 110" />
    <path className="ga-green-line" d="M206 120 V78" />
    <path className="ga-coral" d="M206 78 h22 l-6 7 l6 7 h-22 Z" />
    <Chip x={36} y={76} text="para ti" size={11} tone="coral" />
  </>,
  'es-si-imperfecto': () => <>
    <Person x={46} y={84} tone="green" />
    <circle className="ga-paper ga-outline" cx={68} cy={58} r={3} />
    <circle className="ga-paper ga-outline" cx={80} cy={46} r={5} />
    <Cloud x={160} y={46} scale={2.6} className="ga-paper ga-outline-dashed" />
    <House x={150} y={64} />
    <Sun x={186} y={30} r={7} />
    <Chip x={150} y={98} text="si tuviera dinero…" tone="coral" center />
  </>,
  'es-cuando': () => <>
    <Timeline now={64} />
    <Arrow dashed d="M72 106 H150" head="M144 100 L151 106 L144 112" tone="green" />
    <circle className="ga-paper ga-outline" cx={174} cy={66} r={20} />
    <path className="ga-green-line" d="M174 66 V52 M174 66 L184 72" />
    <Point x={174} y={106} tone="coral" />
    <Chip x={14} y={14} text="cuando llegues" tone="coral" />
  </>,
  'es-pluscuamperfecto': () => <Fork chip="Si lo hubiera sabido…" ghost="habría venido" />,
  'es-estilo-indirecto': () => <Reported said="Estoy cansada." retold="Dijo que estaba cansada." />,
  'es-se': () => <>
    <rect className="ga-paper ga-outline" x={34} y={44} width={172} height={84} rx={4} />
    {[0, 1, 2, 3, 4, 5].map((index) => <path key={index} className={index % 2 ? 'ga-paper ga-outline' : 'ga-coral'} d={`M${30 + index * 30} 30 h30 v16 a15 9 0 0 1 -30 0 Z`} />)}
    <rect className="ga-panel" x={52} y={70} width={62} height={58} rx={3} />
    <rect className="ga-blue" x={130} y={70} width={58} height={36} rx={3} />
    <Chip x={120} y={4} text="Se habla español" size={11} tone="green" center />
    <Chip x={158} y={110} text="Se venden pisos" size={10} center />
  </>,
  'es-concesivas': () => <>
    <path className="ga-line" d="M120 34 V122 M96 122 H144" />
    <g>
      <path className="ga-line" d="M44 46 L196 34" />
      <path className="ga-line" d="M44 46 L28 78 M44 46 L60 78 M196 34 L180 66 M196 34 L212 66" />
      <path className="ga-panel ga-outline" d="M24 78 H64 A20 8 0 0 1 24 78 Z M176 66 H216 A20 8 0 0 1 176 66 Z" />
      <Cloud x={44} y={64} scale={0.55} />
      <Sun x={196} y={52} r={6} />
    </g>
    <circle className="ga-coral" cx={120} cy={38} r={5} />
    <Chip x={14} y={100} text="aunque llueva" size={11} />
    <Chip x={150} y={100} text="salimos" size={11} tone="green" />
  </>,
  'es-probabilidad': () => <>
    <Person x={44} y={82} tone="green" />
    <circle className="ga-paper ga-outline" cx={70} cy={56} r={3} />
    <circle className="ga-paper ga-outline" cx={82} cy={44} r={5} />
    <circle className="ga-paper ga-outline-dashed" cx={150} cy={50} r={32} />
    <path className="ga-green-line" d="M150 50 V30 M150 50 L164 58" />
    <text className="ga-big" x={204} y={42} style={{ fill: 'var(--ga-coral)' }}>?</text>
    <Chip x={8} y={8} text="¿Qué hora será?" size={11} />
    <Chip x={150} y={100} text="Serán las diez" tone="coral" center />
  </>,
  'es-perifrasis': () => <>
    <path className="ga-green-line" d="M60 30 A28 28 0 1 1 33 50" />
    <path className="ga-green-line" d="M28 42 L33 51 L42 46" />
    <text className="ga-big" x={60} y={66}>↺</text>
    <Chip x={60} y={100} text="vuelvo a leer" tone="green" center />
    <path className="ga-paper ga-outline" d="M158 22 h40 l-14 34 l14 34 h-40 l14 -34 Z" />
    <path className="ga-gold" d="M164 30 h28 l-14 22 Z M178 66 l12 20 h-24 Z" />
    <Chip x={178} y={100} text="llevo dos años" tone="coral" center />
  </>,
}

export function LessonArt({ id, className = '' }: { id: string; className?: string }) {
  const draw = ART[id]
  if (!draw) return null
  return <svg className={`grammar-art ${className}`} viewBox="0 0 240 140" aria-hidden="true">{draw()}</svg>
}
