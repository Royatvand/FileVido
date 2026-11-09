import { useEffect, useRef, useState } from 'react'

// فقط یک‌بار وقتی عنصر وارد صفحه شد true می‌شود (بدون IntersectionObserver از ابتدا true است)
export function useInView({ margin = '0px' } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        observer.disconnect()
      }
    }, { rootMargin: margin })
    observer.observe(element)
    return () => observer.disconnect()
  }, [margin])

  return [ref, inView]
}
