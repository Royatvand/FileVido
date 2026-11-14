const PLATFORM_ASSETS = {
  // MetaQuotes app icons, served by Apple's App Store CDN.
  // The App Store listings identify MetaQuotes Software Corp. as the developer.
  metatrader4: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/34/5f/2a/345f2a6d-4862-b588-7d6e-a9df65763dee/icon-0-0-1x_U007emarketing-0-5-0-0-85-220.png/512x512bb.jpg',
  metatrader5: 'https://is1-ssl.mzstatic.com/image/thumb/Purple116/v4/6e/76/b3/6e76b3d9-14f3-e6a1-3255-bc5b47bc59ac/icon-0-0-1x_U007emarketing-0-0-0-4-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/1200x630wa.png',
}

function PlatformIcon({ platform, className = '' }) {
  const imageClassName = `platform-icon ${className}`.trim()

  if (platform === 'tradingview') {
    return (
      <img
        className={`${imageClassName} platform-icon-tradingview`}
        src="https://cdn.simpleicons.org/tradingview/000000"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
      />
    )
  }

  const imageSrc = PLATFORM_ASSETS[platform]

  if (imageSrc) {
    return (
      <img
        className={imageClassName}
        src={imageSrc}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
      />
    )
  }

  return (
    <svg
      className={imageClassName}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M10 16h12M16 10v12" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

export default PlatformIcon
