import { useEffect, useState } from 'react'
import { BookOpen, Bookmark, Eye, LoaderCircle, MailCheck, RefreshCw, Smartphone, UserPlus, Users } from 'lucide-react'
import { getAdminStats, type AdminStats } from './analytics'
import { getLanguage } from './languages'

const PERIODS = [7, 30, 90]

const KIND_LABELS: Record<AdminStats['by_kind'][number]['kind'], string> = {
  landing: 'Лендинг',
  app: 'Приложение',
  catalog: 'Каталог библиотеки',
  book: 'Страницы книг',
}

const number = (value: number) => value.toLocaleString('ru-RU')

function formatDate(value: string | null, withTime = false): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('ru-RU', withTime ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' })
}

function dayLabel(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

type Day = AdminStats['daily'][number]

/** One series per day as bars; hovering a day shows all of that day's numbers. */
function DailyChart({ title, daily, value, describe }: { title: string; daily: Day[]; value: (day: Day) => number; describe: (day: Day) => string }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...daily.map(value))
  const width = 640
  const height = 150
  const step = width / daily.length
  const barWidth = Math.max(2, Math.min(18, step - 2))
  const active = hover === null ? null : daily[hover]
  return (
    <figure className="admin-chart">
      <figcaption><strong>{title}</strong><span>{active ? `${dayLabel(active.day)}: ${describe(active)}` : `максимум ${number(max)} в день`}</span></figcaption>
      <svg viewBox={`0 0 ${width} ${height + 1}`} role="img" aria-label={title} onMouseLeave={() => setHover(null)}>
        <line className="admin-chart-grid" x1="0" x2={width} y1={0.5} y2={0.5} />
        <line className="admin-chart-base" x1="0" x2={width} y1={height + 0.5} y2={height + 0.5} />
        {daily.map((day, index) => {
          const barHeight = (value(day) / max) * (height - 6)
          const x = index * step + (step - barWidth) / 2
          return (
            <g key={day.day} onMouseEnter={() => setHover(index)}>
              <rect className="admin-chart-hit" x={index * step} y="0" width={step} height={height} />
              {barHeight > 0 && <path className={hover === index ? 'admin-chart-bar active' : 'admin-chart-bar'} d={barPath(x, height, barWidth, barHeight)} />}
            </g>
          )
        })}
      </svg>
      <div className="admin-chart-axis"><span>{dayLabel(daily[0].day)}</span><span>{dayLabel(daily[daily.length - 1].day)}</span></div>
    </figure>
  )
}

/** A bar standing on the baseline with its top corners rounded. */
function barPath(x: number, base: number, width: number, height: number): string {
  const radius = Math.min(4, width / 2, height)
  const top = base - height
  return `M${x},${base}V${top + radius}Q${x},${top} ${x + radius},${top}H${x + width - radius}Q${x + width},${top} ${x + width},${top + radius}V${base}Z`
}

function Table({ title, head, rows, empty }: { title: string; head: string[]; rows: (string | number)[][]; empty: string }) {
  return (
    <section className="admin-table">
      <h2>{title}</h2>
      {rows.length ? (
        <table>
          <thead><tr>{head.map((cell, index) => <th key={cell} className={index ? 'num' : ''}>{cell}</th>)}</tr></thead>
          <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, index) => <td key={index} className={index ? 'num' : ''}>{typeof cell === 'number' ? number(cell) : cell}</td>)}</tr>)}</tbody>
        </table>
      ) : <p className="admin-empty">{empty}</p>}
    </section>
  )
}

export function AdminPage() {
  const [days, setDays] = useState(30)
  const [refresh, setRefresh] = useState(0)
  const [result, setResult] = useState<{ key: string; stats?: AdminStats; error?: string } | null>(null)
  const key = `${days}:${refresh}`
  const loading = result?.key !== key
  const stats = result?.stats
  const error = loading ? '' : result?.error ?? ''

  useEffect(() => {
    let isActive = true
    getAdminStats(days).then(
      (loaded) => { if (isActive) setResult({ key, stats: loaded }) },
      () => { if (isActive) setResult((previous) => ({ key, stats: previous?.stats, error: 'Не удалось загрузить статистику.' })) },
    )
    return () => { isActive = false }
  }, [days, key])

  return (
    <>
      <header className="page-header admin-header">
        <div><span className="eyebrow">АДМИН-ЦЕНТР</span><h1>Статистика<span className="heading-period">.</span></h1><p>Пользователи, посещения сайта и активность в Ling. Твои собственные визиты не учитываются.</p></div>
        <div className="admin-controls">
          <div className="segmented" role="tablist" aria-label="Период">{PERIODS.map((period) => (
            <button key={period} role="tab" aria-selected={days === period} className={days === period ? 'selected' : ''} onClick={() => setDays(period)}>{period} дн.</button>
          ))}</div>
          <button className="icon-button" onClick={() => setRefresh((count) => count + 1)} aria-label="Обновить" disabled={loading}>{loading ? <LoaderCircle size={16} className="spin" /> : <RefreshCw size={16} />}</button>
        </div>
      </header>
      <section className="admin-page">
        {error && <div className="notice-bar" role="status">{error}</div>}
        {!stats ? (!error && <div className="admin-loading"><LoaderCircle size={20} className="spin" /></div>) : (
          <>
            <section className="stats-row admin-stats" aria-label="Пользователи">
              <div className="stat-tile"><Users size={17} /><strong>{number(stats.users.total)}</strong><small>пользователей · +{number(stats.users.new_7d)} за 7 дней</small></div>
              <div className="stat-tile"><UserPlus size={17} /><strong>{number(stats.users.new_period)}</strong><small>регистраций за {stats.days} дн.</small></div>
              <div className="stat-tile"><Eye size={17} /><strong>{number(stats.traffic.visitors)}</strong><small>посетителей · {number(stats.traffic.views)} просмотров</small></div>
              <div className="stat-tile"><Users size={17} /><strong>{number(stats.users.active_7d)}</strong><small>входили за 7 дней</small></div>
              <div className="stat-tile"><MailCheck size={17} /><strong>{number(stats.users.confirmed)}</strong><small>подтвердили почту</small></div>
              <div className="stat-tile"><BookOpen size={17} /><strong>{number(stats.content.books)}</strong><small>книг в аккаунтах</small></div>
              <div className="stat-tile"><Bookmark size={17} /><strong>{number(stats.content.saved_words)}</strong><small>сохранено слов · {number(stats.content.known_words)} известных</small></div>
              <div className="stat-tile"><Smartphone size={17} /><strong>{stats.traffic.mobile_share}%</strong><small>просмотров с телефона</small></div>
            </section>

            <div className="admin-charts">
              <DailyChart title="Посетители по дням" daily={stats.daily} value={(day) => day.visitors} describe={(day) => `${number(day.visitors)} посетителей, ${number(day.views)} просмотров`} />
              <DailyChart title="Регистрации по дням" daily={stats.daily} value={(day) => day.signups} describe={(day) => `${number(day.signups)} регистраций`} />
            </div>

            <div className="admin-tables">
              <Table title="Разделы сайта" head={['Раздел', 'Просмотры']} rows={stats.by_kind.map((row) => [KIND_LABELS[row.kind], row.views])} empty="Посещений за этот период пока нет." />
              <Table title="Источники переходов" head={['Сайт', 'Переходы']} rows={stats.referrers.map((row) => [row.host, row.views])} empty="Переходов с других сайтов пока нет." />
            </div>
            <Table title="Популярные страницы" head={['Страница', 'Просмотры', 'Посетители']} rows={stats.top_pages.map((row) => [row.path, row.views, row.visitors])} empty="Посещений за этот период пока нет." />

            <section className="admin-table">
              <h2>Пользователи <small>последние {stats.recent_users.length}</small></h2>
              <div className="admin-scroll">
                <table>
                  <thead><tr><th>Почта</th><th>Регистрация</th><th>Последний вход</th><th>Языки</th><th className="num">Книги</th><th className="num">Слова</th></tr></thead>
                  <tbody>{stats.recent_users.map((user) => (
                    <tr key={user.email}>
                      <td>{user.email}{!user.confirmed && <span className="admin-badge">не подтверждена</span>}</td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>{formatDate(user.last_sign_in_at, true)}</td>
                      <td>{user.languages.length ? user.languages.map((code) => getLanguage(code).name).join(', ') : '—'}</td>
                      <td className="num">{number(user.books)}</td>
                      <td className="num">{number(user.words)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </section>
    </>
  )
}
