import React from 'react'

interface Props {
  language: string
  setLanguage: (l: string) => void
}

export default function PaymentHeader({ language, setLanguage }: Props) {
  return (
    <div className="p-6 border-b border-slate-200 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Pay Your Bill</h1>
      </div>
      <div className="flex gap-2">
        {(["en", "ru", "hy"] as string[]).map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`px-2 py-1 text-xs font-semibold rounded ${
              language === lang ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
