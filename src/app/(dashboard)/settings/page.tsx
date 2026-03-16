import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-2xl font-bold">Configuración</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Impresora Térmica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>IP de la impresora</Label>
            <Input placeholder="192.168.1.100" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Puerto</Label>
            <Input placeholder="9100" defaultValue="9100" className="h-11" />
          </div>
          <p className="text-sm text-muted-foreground">
            Configuración de impresora térmica ESC/POS por red. Próximamente.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del Restaurante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Edición de datos del restaurante (nombre, dirección, CUIT). Próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
