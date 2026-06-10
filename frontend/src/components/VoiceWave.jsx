import { motion as Motion } from 'framer-motion'

const bars = Array.from({ length: 8 }, (_, i) => i)

export default function VoiceWave({ active }) {
  return (
    <div className="flex h-14 items-end gap-1">
      {bars.map((bar) => (
        <Motion.div
          key={bar}
          className="w-2 rounded-full bg-indigo-400"
          animate={{
            height: active ? [10, 32, 16, 40, 12] : 10,
            opacity: active ? [0.5, 1, 0.7] : 0.3,
          }}
          transition={{
            duration: 0.8,
            repeat: active ? Infinity : 0,
            delay: bar * 0.07,
          }}
        />
      ))}
    </div>
  )
}
