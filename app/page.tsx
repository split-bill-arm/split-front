"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function Home() {
  const [restaurantId] = useState("rest-001")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center">Restaurant System</h1>
        <p className="text-slate-600 text-center mb-8">Professional order management and payment solution</p>

        <div className="space-y-3">
          <Link href={`/admin/${restaurantId}`} className="block">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Admin Panel</Button>
          </Link>

          <p className="text-center text-sm text-slate-500">
            Scan QR code on table to access customer payment interface
          </p>
        </div>
      </Card>
    </div>
  )
}
