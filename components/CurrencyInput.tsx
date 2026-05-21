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
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={formatBRL(value)}
        onChange={handleChange}
        required={required}
        placeholder={placeholder ?? 'R$ 0,00'}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
      />
    </div>
  )
}
