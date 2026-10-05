import type { ReactNode } from 'react'

/**
 * A small flat illustration for every Ling Library book, drawn on a 100×100 grid for the shelf covers
 * (src/BookShelf.tsx). Classes pick the book's palette: fa/fi/fb fill with accent, ink and background,
 * sa/si/sb stroke with them (see .shelf-art in BookShelf.css). m-* classes are the small animations that play
 * while the book is open on the shelf.
 */
export const COVER_ART: Record<string, ReactNode> = {
  // Alice in her blue dress and white pinafore, with the White Rabbit's pocket watch
  'alice-in-wonderland': <>
    <path fill="#f2c14e" d="M27 44c-2-24 48-26 46 0l4 34q-27 9-54 0z" />
    <path fill="#fbe1cf" d="M45 54h10v9H45z" />
    <path fill="#4f8fd0" d="M22 96q2-28 28-32 26 4 28 32z" />
    <path fill="#ffffff" d="M37 96q1-18 13-22 12 4 13 22z" />
    <path fill="#ffffff" d="M42 66l8 6 8-6-3 8h-10z" />
    <path stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" d="M40 76l-6-8M60 76l6-8" />
    <ellipse fill="#fbe1cf" cx="50" cy="42" rx="14" ry="16" />
    <path fill="#f2c14e" d="M35 40c-1-17 31-17 30 0-6-6-11-5-15-10-4 5-9 4-15 10z" />
    <path className="si" d="M35 34q15-14 30 0" strokeWidth="3.5" />
    <path className="fi" d="M61 29l-5-4.5v9zM61 29l5-4.5v9z" />
    <circle className="fi" cx="61" cy="29" r="1.8" />
    <g className="m-blink">
      <ellipse className="fi" cx="44.5" cy="44" rx="1.8" ry="2.4" />
      <ellipse className="fi" cx="55.5" cy="44" rx="1.8" ry="2.4" />
    </g>
    <circle fill="#f6a5a5" cx="40" cy="50" r="2.6" />
    <circle fill="#f6a5a5" cx="60" cy="50" r="2.6" />
    <path className="si thin" d="M47 52q3 2.5 6 0" />
    <g className="m-bob">
      <circle className="fa" cx="80" cy="77" r="9" />
      <circle className="fb" cx="80" cy="77" r="6.2" />
      <path className="si thin m-spin" style={{ transformOrigin: '80px 77px' }} d="M80 77v-4.5" />
      <path className="si thin" d="M80 77l3.2 2" />
      <rect className="fa" x="78" y="65" width="4" height="4" rx="1" />
    </g>
  </>,
  // The statue's crown and the swallow
  'the-happy-prince': <>
    <path className="fa" d="M24 76V48l13 12 13-20 13 20 13-12v28z" />
    <rect className="fi" x="24" y="72" width="52" height="8" />
    <circle className="fb" cx="37" cy="66" r="3" />
    <circle className="fi m-twinkle" cx="50" cy="63" r="4" />
    <circle className="fb" cx="63" cy="66" r="3" />
    <path className="fi m-bob" d="M56 22c7-5 15-4 20 1-5 0-8 2-9 5l8 7c-9 1-15-2-17-7l-10 5c3-6 5-9 8-11z" />
  </>,
  // The Emerald City at the end of the yellow brick road
  'the-wonderful-wizard-of-oz': <>
    <path className="fa m-pulse" d="M26 62V40l5-10 5 10v22zM40 62V30l6-14 6 14v32zM56 62V36l5-11 5 11v26zM69 62V46l4-8 4 8v16z" />
    <path className="fi" d="M45 62h10l18 34H27z" />
    <path className="sb" d="M41 72h18M37 80h26M33 88h34M50 62v8M46 72l-1 8M54 72l1 8M42 80l-2 8M58 80l2 8" />
  </>,
  // A magnifying glass
  'the-adventures-of-sherlock-holmes': <>
    <g className="m-swing" style={{ transformOrigin: '78px 76px' }}>
      <circle className="fb" cx="44" cy="42" r="19" />
      <circle className="si thick" cx="44" cy="42" r="19" />
      <path className="sa thicker" d="M58 56l20 20" />
      <path className="si" d="M34 36q4-8 12-9" />
    </g>
  </>,
  // The corregidor's three-cornered hat
  'el-sombrero-de-tres-picos': <>
    <g className="m-swing" style={{ transformOrigin: '50px 70px' }}>
      <path className="fi" d="M14 66q16-36 36-36t36 36q-18-10-36 4-18-14-36-4z" />
      <path className="sa thick" d="M24 58q26-14 52 0" />
      <circle className="fa" cx="50" cy="44" r="6" />
      <circle className="fb" cx="50" cy="44" r="2.5" />
    </g>
  </>,
  // The lantern Nela carries through the mines
  'marianela': <>
    <path className="si" d="M50 12v10" />
    <circle className="si" cx="50" cy="26" r="4" />
    <path className="fi" d="M36 34h28l-4 8H40z" />
    <rect className="fa" x="38" y="42" width="24" height="30" rx="3" />
    <path className="fb m-flicker" d="M50 48c5 6 5 12 0 16-5-4-5-10 0-16z" />
    <path className="fi" d="M36 72h28l-3 7H39z" />
    <path className="sa m-twinkle" d="M24 56h6M70 56h6M28 42l5 4M72 42l-5 4" />
  </>,
  // Gregor as a beetle
  'die-verwandlung': <>
    <path className="si m-wiggle" d="M42 32l-8-12M58 32l8-12M34 48l-14-4M34 58l-14 4M36 68l-12 10M66 48l14-4M66 58l14 4M64 68l12 10" />
    <circle className="fi" cx="50" cy="34" r="9" />
    <ellipse className="fi" cx="50" cy="60" rx="17" ry="22" />
    <path className="sb" d="M50 40v42" />
    <ellipse className="fa" cx="43" cy="56" rx="4" ry="7" />
    <ellipse className="fa" cx="57" cy="56" rx="4" ry="7" />
  </>,
  // A water lily on the lake
  'immensee': <>
    <path className="si" d="M14 74q9-5 18 0t18 0 18 0 18 0M20 86q8-4 15 0t15 0 15 0 15 0" />
    <g className="m-bob">
      <path className="fa" d="M50 70c-20 0-30-6-30-12s14-10 30-10 30 4 30 10c0 3-3 6-9 8l-21-6z" />
      <path className="fb" d="M50 58c-4-8-4-16 0-22 4 6 4 14 0 22zM50 58c-9-4-13-10-14-17 7 1 12 6 14 17zM50 58c9-4 13-10 14-17-7 1-12 6-14 17z" />
      <path className="si thin" d="M50 58c-4-8-4-16 0-22 4 6 4 14 0 22zM50 58c-9-4-13-10-14-17 7 1 12 6 14 17zM50 58c9-4 13-10 14-17-7 1-12 6-14 17z" />
    </g>
  </>,
  // A globe and a balloon
  'le-tour-du-monde-en-quatre-vingts-jours': <>
    <circle className="fa" cx="44" cy="58" r="26" />
    <ellipse className="sb" cx="44" cy="58" rx="11" ry="26" />
    <path className="sb" d="M18 58h52M44 32v52M22 45h44M22 71h44" />
    <g className="m-bob">
      <circle className="fi" cx="76" cy="22" r="10" />
      <path className="si thin" d="M68 27l5 12M84 27l-5 12" />
      <rect className="fi" x="72" y="39" width="8" height="6" rx="1" />
    </g>
  </>,
  // Day and night
  'contes-du-jour-et-de-la-nuit': <>
    <path className="fa" d="M50 26a24 24 0 0 0 0 48z" />
    <path className="sa m-pulse" d="M40 18l2 6M28 24l4 5M20 36l6 3M18 50h6M20 64l6-3M28 76l4-5M40 82l2-6" />
    <path className="fi" d="M50 26a24 24 0 0 1 0 48 16 16 0 0 0 0-48z" />
    <circle className="fi m-twinkle" cx="74" cy="28" r="2" />
    <circle className="fi" cx="82" cy="44" r="1.6" />
  </>,
  // The puppet and his nose
  'le-avventure-di-pinocchio': <>
    <path className="si thin" d="M30 8v26M50 8v14M70 8v26" />
    <path className="fa" d="M36 36l14-18 14 18z" />
    <circle className="fi" cx="50" cy="50" r="15" />
    <path className="fa m-grow" style={{ transformOrigin: '62px 52px' }} d="M62 48l26 4-26 5z" />
    <circle className="fb" cx="46" cy="47" r="3" />
    <path className="fi" d="M40 66h20l4 22H36z" />
  </>,
  // Capitu's eyes "like the undertow"
  'dom-casmurro': <>
    <path className="fb" d="M18 46q32-30 64 0-32 30-64 0z" />
    <path className="si" d="M18 46q32-30 64 0-32 30-64 0z" />
    <g className="m-look">
      <circle className="fa" cx="50" cy="46" r="13" />
      <circle className="fi" cx="50" cy="46" r="6" />
      <circle className="fb" cx="54" cy="42" r="2" />
    </g>
    <path className="si" d="M18 76q8-6 16 0t16 0 16 0 16 0M24 88q7-5 13 0t13 0 13 0 13 0" />
  </>,
  // A Christmas candle and holly
  'a-christmas-carol': <>
    <path className="fa m-flicker" d="M50 14c7 8 7 15 0 20-7-5-7-12 0-20z" />
    <rect className="fb" x="41" y="36" width="18" height="40" rx="2" />
    <rect className="si" x="41" y="36" width="18" height="40" rx="2" />
    <path className="fi" d="M20 84c4-8 12-10 18-6-2 6-10 10-18 6zM80 84c-4-8-12-10-18-6 2 6 10 10 18 6z" />
    <circle className="fa" cx="45" cy="82" r="4" />
    <circle className="fa" cx="55" cy="82" r="4" />
    <circle className="fa" cx="50" cy="88" r="4" />
  </>,
  // An hourglass
  'the-time-machine': <g className="m-flip">
    <path className="fi" d="M28 12h44v6H28zM28 82h44v6H28z" />
    <path className="si" d="M34 18q0 18 16 32-16 14-16 32M66 18q0 18-16 32 16 14 16 32" />
    <path className="fa" d="M38 26h24q-2 10-12 18-10-8-12-18zM36 80q2-12 14-18 12 6 14 18z" />
    <path className="sa thin" d="M50 46v18" />
  </g>,
  // Big Ben and the second star to the right
  'peter-pan': <>
    <path className="fi" d="M30 92V44l8-12 8 12v48zM44 92V58h14v34z" />
    <circle className="fb" cx="38" cy="54" r="5" />
    <path className="si thin" d="M38 54v-3M38 54l2 1" />
    <path className="fa m-twinkle" d="M72 14l3 8 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" />
    <path className="fa" d="M62 42l1.5 4 4 .5-3 2.5 1 4-3.5-2-3.5 2 1-4-3-2.5 4-.5z" />
    <circle className="fa m-twinkle" cx="84" cy="44" r="1.8" />
  </>,
  // Dr Jekyll's potion
  'dr-jekyll-and-mr-hyde': <>
    <path className="fb" d="M42 14h16v24l18 34q3 10-8 12H32q-11-2-8-12l18-34z" />
    <path className="fa" d="M31 62h38l7 10q3 10-8 12H32q-11-2-8-12z" />
    <path className="si" d="M42 14h16v24l18 34q3 10-8 12H32q-11-2-8-12l18-34z" />
    <circle className="fb m-rise" cx="44" cy="72" r="3" />
    <circle className="fb m-rise" cx="56" cy="68" r="2" />
    <circle className="fi m-rise" cx="58" cy="40" r="2.5" />
    <circle className="fi m-rise" cx="62" cy="30" r="1.8" />
  </>,
  // Augusto's umbrella in the fog
  'niebla': <>
    <g className="m-swing" style={{ transformOrigin: '50px 84px' }}>
      <path className="fa" d="M18 50q32-36 64 0-8-5-16 0-8-5-16 0-8-5-16 0-8-5-16 0z" />
      <path className="si" d="M50 50v28q0 6-6 6t-6-6" />
    </g>
    <path className="sb thick m-drift" d="M10 66h30M58 66h32M16 76h18M60 76h26M10 88h80" />
  </>,
  // A heart pierced by an arrow
  'cuentos-de-amor': <>
    <path className="fa m-beat" d="M50 82C24 64 18 52 18 40c0-10 8-18 17-18 7 0 12 4 15 10 3-6 8-10 15-10 9 0 17 8 17 18 0 12-6 24-32 42z" />
    <path className="si thick" d="M14 74L84 24" />
    <path className="fi" d="M86 22l-12 2 8 8zM18 70l-6 2 2 6 4-4 4 4 2-6z" />
  </>,
  // Snow White's apple
  'grimms-maerchen': <g className="m-bob">
    <path className="fa" d="M50 34c-6-4-16-4-22 2-8 8-6 26 4 38 6 8 12 10 18 6 6 4 12 2 18-6 10-12 12-30 4-38-6-6-16-6-22-2z" />
    <path className="si" d="M50 34q0-10 6-16" />
    <path className="fi" d="M54 26c6-8 16-8 20-4-6 6-14 8-20 4z" />
    <path className="fb" d="M34 46q2-6 8-8 0 6-8 8z" />
  </g>,
  // A man walking away from his shadow
  'peter-schlemihl': <>
    <circle className="fi" cx="34" cy="26" r="7" />
    <path className="fi" d="M28 36h12l2 26h-4l-2 24h-4l-2-24h-4z" />
    <path className="fa m-stretch" style={{ transformOrigin: '44px 88px' }} d="M44 88l40-6 6 4-38 8zM50 89l14-2 24-4" />
    <path className="si" d="M10 90h80" />
  </>,
  // The good-for-nothing's fiddle
  'aus-dem-leben-eines-taugenichts': <g className="m-swing" style={{ transformOrigin: '50px 90px' }}>
    <path className="fa" d="M50 40c-9 0-15 5-15 12 0 4 3 7 3 10s-5 6-5 12c0 10 8 16 17 16s17-6 17-16c0-6-5-9-5-12s3-6 3-10c0-7-6-12-15-12z" />
    <rect className="fi" x="47" y="12" width="6" height="34" rx="2" />
    <circle className="fi" cx="50" cy="12" r="5" />
    <path className="sb thin" d="M48 30v54M52 30v54" />
    <path className="si thin" d="M42 62q-2 4 0 8M58 62q2 4 0 8" />
    <rect className="fi" x="42" y="78" width="16" height="3" rx="1" />
  </g>,
  // "Il faut cultiver notre jardin"
  'candide': <>
    <g className="m-sway" style={{ transformOrigin: '50px 86px' }}>
      <circle className="fa" cx="50" cy="38" r="22" />
      <circle className="fa" cx="34" cy="48" r="13" />
      <circle className="fa" cx="66" cy="48" r="13" />
      <circle className="fb" cx="44" cy="34" r="3" />
      <circle className="fb" cx="58" cy="42" r="3" />
      <circle className="fb" cx="36" cy="50" r="2.5" />
    </g>
    <path className="fi" d="M46 56h8v30h-8z" />
    <path className="si" d="M14 86h72M22 86v-8M28 86v-6M72 86v-8M78 86v-6" />
  </>,
  // The windmill
  'lettres-de-mon-moulin': <>
    <path className="fi" d="M40 88l4-46h12l4 46z" />
    <path className="fi" d="M38 44l12-10 12 10z" />
    <g className="m-spin-slow">
      <rect className="fa" x="47" y="8" width="6" height="64" rx="1" />
      <rect className="fa" x="18" y="37" width="64" height="6" rx="1" />
    </g>
    <circle className="fb" cx="50" cy="40" r="3" />
    <path className="fb" d="M47 88v-10q3-4 6 0v10z" />
  </>,
  // A horse's head against the moon
  'un-cavallo-nella-luna': <>
    <circle className="fa m-glow" cx="56" cy="44" r="30" />
    <path className="fi" d="M28 92l4-26q-2-20 12-30l2-12 6 10q16 2 22 18l2 10q-4 4-12 1-6 2-10 6l-2 23z" />
    <circle className="fb" cx="52" cy="44" r="2.4" />
    <path className="sb" d="M38 40q-6 12-4 26" />
  </>,
  // Two rings, apart
  'dopo-il-divorzio': <>
    <circle className="si thicker m-bob" cx="38" cy="54" r="17" />
    <circle className="sa thicker m-bob-late" cx="64" cy="46" r="17" />
    <path className="fa" d="M60 26l4-8 4 8-4 4z" />
    <path className="sb thick" d="M50 38l2 4M48 66l3-4" />
  </>,
  // A quill and an inkwell
  'memorias-postumas-de-bras-cubas': <>
    <g className="m-write" style={{ transformOrigin: '36px 66px' }}>
      <path className="fa" d="M70 10C52 18 40 38 36 62l6 2C48 42 60 26 70 10z" />
      <path className="sb thin" d="M66 18L40 60" />
      <path className="si" d="M37 62l-3 10" />
    </g>
    <path className="fi" d="M26 74h36l4 6v10H22V80z" />
    <rect className="fi" x="34" y="68" width="12" height="6" />
  </>,
  // A calendar page without a date
  'historias-sem-data': <>
    <rect className="fb" x="24" y="20" width="52" height="64" rx="4" />
    <rect className="si" x="24" y="20" width="52" height="64" rx="4" />
    <path className="fa" d="M24 24a4 4 0 0 1 4-4h44a4 4 0 0 1 4 4v14H24z" />
    <path className="si thick" d="M36 14v12M64 14v12" />
    <path className="fi m-pulse" d="M44 56q0-10 8-10t8 7q0 5-8 8v6h-2v-8q8-2 8-6 0-5-6-5t-6 8zM50 72h4v4h-4z" />
  </>,
}
