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
        <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1 truncate">{label}</label>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={formatBRL(value)}
        onChange={handleChange}
        required={required}
        placeholder={placeholder ?? 'R$ 0,00'}
        className="w-full min-w-0 px-3 py-2 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
      />
    </div>
  )
}
