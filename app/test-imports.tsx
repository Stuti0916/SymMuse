import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function TestImports() {
  return (
    <div className="p-4">
      <Label>Test Label</Label>
      <Input placeholder="Test input" />
      <Button>Test Button</Button>
    </div>
  )
}
