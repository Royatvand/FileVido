function PlatformIcon({ platform, className = '' }) {
  const common = { className: `platform-icon ${className}`.trim(), viewBox: '0 0 32 32', 'aria-hidden': true, focusable: 'false' }

  if (platform === 'tradingview') {
    return (
      <svg {...common}>
        <path fill="#2962FF" d="M5 7h22v5h-8v13h-6V12H5z" />
        <path fill="#2962FF" d="M19 17h5v8h-5z" />
      </svg>
    )
  }

  if (platform === 'metatrader4') {
    return (
      <svg {...common}>
        <path fill="#29A6D8" d="M4 7h5v18H4zM12 12h5v13h-5zM20 4h5v21h-5z" />
        <path fill="none" stroke="#29A6D8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="m5 10 9 5 10-9" />
      </svg>
    )
  }

  if (platform === 'metatrader5') {
    return (
      <svg {...common}>
        <path fill="#29A6D8" d="M4 5h5v20H4zM12 5h5v20h-5zM20 5h8v5h-8zM20 13h8v5h-8zM20 21h8v4h-8z" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M10 16h12M16 10v12" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

export default PlatformIcon