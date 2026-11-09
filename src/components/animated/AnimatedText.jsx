import { useInView } from './useInView'
import './animated.css'

// نمایش تدریجی متن (بالا آمدن + محو شدن).
// by="word": برای فارسی (حروف فارسی نباید جدا شوند وگرنه اتصال حروف می‌شکند)
// by="char": فقط برای متن لاتین مثل نام برند
// offset: شماره شروع تأخیر، برای ادامهٔ انیمیشن در چند تکه متن پشت‌سرهم
function AnimatedText({ text, by = 'word', offset = 0, delay = 0, stagger = 70, className = '' }) {
  const [ref, inView] = useInView()
  const parts = by === 'char' ? Array.from(text) : text.split(' ')

  return (
    <span
      ref={ref}
      className={`at ${inView ? 'at-visible' : ''} ${className}`}
      aria-label={text}
      style={{ '--at-delay': `${delay}ms`, '--at-stagger': `${stagger}ms` }}
    >
      {parts.map((part, index) => (
        <span key={index} aria-hidden="true">
          <span className={`at-item ${by === 'char' ? 'at-char' : 'at-word'}`} style={{ '--i': offset + index }}>{part}</span>
          {by === 'word' && index < parts.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  )
}

export default AnimatedText
