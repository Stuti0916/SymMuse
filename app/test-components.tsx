import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function TestComponents() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Component Test Page</h1>

      <div className="space-y-4">
        <Button>Default Button</Button>
        <Button variant="outline">Outline Button</Button>
        <Button variant="secondary">Secondary Button</Button>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
          <CardDescription>This is a test card to verify components work</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content goes here</p>
          <Badge>Test Badge</Badge>
        </CardContent>
      </Card>

      <div className={cn("p-4 bg-gray-100 rounded", "text-center")}>
        <p>Utils function test: cn() is working</p>
      </div>
    </div>
  )
}
