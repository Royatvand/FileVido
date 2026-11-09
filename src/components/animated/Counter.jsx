import { useEffect, useRef } from 'react'
import { useInView } from './useInView'
import { Formatter } from './formatters'
import './animated.css'

// شمارندهٔ عددی با حرکت فنری؛ همان API کامپوننت Counter در Animata
// (https://animata.design/docs/text/counter) بدون وابستگی به کتابخانهٔ motion.
const STIFFNESS = 80
const DAMPING = 60

function Counter({ targetValue = 1000, direction = 'up', delay = 0, format = Formatter.number, className = '' }) {
  const [ref, inView] = useInView()
  const isUp = direction === 'up'
  const state = useRef({ value: isUp ? 0 : targetValue, velocity: 0, frame: 0 })

  useEffect(() => {
    if (!inView) return undefined
    const node = ref.current
    const goal = isUp ? targetValue : 0
    const current = state.current
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const paint = () => { if (node) node.textContent = format(current.value) }

    if (reduced) {
      current.value = goal
      paint()
      return undefined
    }

    let last = 0
    function step(time) {
      const dt = Math.min((time - (last || time)) / 1000, 0.05)
      last = time
      const force = -STIFFNESS * (current.value - goal) - DAMPING * current.velocity
      current.velocity += force * dt
      current.value += current.velocity * dt
      if (Math.abs(current.value - goal) < 0.5 && Math.abs(current.velocity) < 0.5) {
        current.value = goal
        current.velocity = 0
        paint()
        return
      }
      paint()
      current.frame = requestAnimationFrame(step)
    }

    const timer = window.setTimeout(() => { current.frame = requestAnimationFrame(step) }, delay)
    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(current.frame)
    }
  }, [inView, isUp, targetValue, delay, format, ref])

  return <span ref={ref} className={className} aria-hidden="true">{format(isUp ? 0 : targetValue)}</span>
}

export default Counter
