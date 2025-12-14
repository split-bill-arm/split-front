import React from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  numberOfPeople: number
  setNumberOfPeople: (n: number) => void
}

export function PeoplePicker({ numberOfPeople, setNumberOfPeople }: Props) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm text-slate-700 font-medium">People</div>
        <div className="text-xs text-slate-500">Choose number of people</div>
      </div>
      <div className="flex items-center gap-2">
        {[2, 3, 4, 5, 6].map((num) => (
          <Button key={num} variant={numberOfPeople === num ? 'default' : 'outline'} onClick={() => setNumberOfPeople(num)} className="px-3 py-1">
            {num}
          </Button>
        ))}
        <div className="flex items-center gap-2 ml-2">
          <input type="number" min={2} value={numberOfPeople} onChange={(e) => setNumberOfPeople(Math.max(2, Number.parseInt(e.target.value) || 2))} className="w-20 px-2 py-1 border border-slate-300 rounded text-center bg-white" aria-label="Custom people count" />
        </div>
      </div>
    </div>
  )
}

export default PeoplePicker
