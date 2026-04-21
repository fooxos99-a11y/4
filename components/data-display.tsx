"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DataDisplayProps {
  data: any[]
}

export function DataDisplay({ data }: DataDisplayProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">لا توجد بيانات للعرض</p>
        <p className="text-gray-400 text-sm mt-2">قد تحتاج إلى إضافة بيانات إلى جدولك في Supabase</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map((item, index) => (
        <Card key={item.id || index} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>عنصر #{index + 1}</span>
              {item.id && (
                <Badge variant="secondary" className="text-xs">
                  ID: {item.id}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(item).map(([key, value]) => {
                if (key === "id") return null

                return (
                  <div key={key} className="border-b border-gray-100 pb-2">
                    <span className="font-semibold text-gray-700 text-sm">{key}:</span>
                    <span className="text-gray-600 mr-2 text-sm">
                      {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
