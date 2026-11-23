// Ícones de traço (estilo Lucide), desenhados à mão para não depender de biblioteca.
const P: Record<string, string> = {
  home: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  photo: 'M4 5h16v14H4zM12 5v14M8 9l-2 2 2 2M16 9l2 2-2 2',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 8.5a1.5 1.5 0 1 0 0 .01',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  menu: 'M4 6h16M4 12h16M4 18h16',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  chevL: 'M15 6l-6 6 6 6',
  chevR: 'M9 6l6 6-6 6',
  flame: 'M12 22c4 0 7-3 7-7 0-4-3-6-4-9-1 2-2 3-4 3 0-2 0-4-1-6-3 3-5 7-5 12 0 4 3 7 7 7z',
  dumbbell: 'M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12',
  run: 'M13 4a2 2 0 1 0 0 .1M4 21l4-6 3 2 2-5 4 3 3-2M8 10l3-3 4 1 2 4',
  food: 'M7 2v9M4 2v5a3 3 0 0 0 6 0V2M7 11v11M17 22V2c-3 2-4 5-4 9h4',
  scale: 'M4 7h16l-2 13H6zM9 7a3 3 0 0 1 6 0M12 11v3',
  target: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 12m-5 0a5 5 0 1 0 10 0 5 5 0 1 0-10 0M12 12h.01',
  check: 'M5 12l5 5L20 7',
  x: 'M6 6l12 12M18 6L6 18',
  alert: 'M12 3l10 18H2zM12 10v4M12 17.5v.5',
  calendar: 'M4 5h16v16H4zM4 10h16M9 3v4M15 3v4',
  watch: 'M8 3h8l1 4H7zM7 17h10l-1 4H8zM6 7h12v10H6zM12 10v2l1.5 1',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  list: 'M9 6h12M9 12h12M9 18h12M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  moon: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z',
  plus: 'M12 5v14M5 12h14',
  camera: 'M3 8h4l2-3h6l2 3h4v12H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  quote: 'M7 7h4v4c0 3-2 5-4 6M15 7h4v4c0 3-2 5-4 6',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  droplet: 'M12 3s7 7 7 12a7 7 0 0 1-14 0c0-5 7-12 7-12z',
  bed: 'M3 18V7M3 13h18v5M21 18v-5a3 3 0 0 0-3-3h-7v3M7 11a1.5 1.5 0 1 0 0-.1',
  brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1',
  news: 'M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5M8 16h3',
  play: 'M8 5l11 7-11 7z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  refresh: 'M20 11a8 8 0 0 0-14-5L4 8M4 4v4h4M4 13a8 8 0 0 0 14 5l2-2M20 20v-4h-4',
}

export function Icon({ name, size = 22, stroke = 2 }: { name: keyof typeof P | string; size?: number; stroke?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={P[name] ?? ''} />
    </svg>
  )
}
