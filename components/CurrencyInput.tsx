'use client'

type Props = {
  value: number
  onChange: (value: number) => void
  label?: string
  required?: boolean
  placeholder?: string
}

function formatBRL(value: number): string {
  if (value === 0) return ''
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function CurrencyInput({ value, onChange, label, required, placeholder }: Props) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '')
    const cents = parseInt(digits || '0', 10)
    onChange(cents / 100)
  }

  return (
    <div className="min-w-0">
      {label && (
        <label className="block text-xs font-medium text-gray-500 dark:text-zinc-500 mb-1.5 truncate">{label}</label>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={formatBRL(value)}
        onChange={handleChange}
        required={required}
        placeholder={placeholder ?? 'R$ 0,00'}
        className="w-full min-w-0 px-3.5 py-2.5 border border-cream-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-800 dark:text-white rounded-xl text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all"
      />
    </div>
  )
}
