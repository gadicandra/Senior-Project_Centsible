import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountDialog } from "./delete-account-dialog";

export function AccountScreen({ email, fullName }: { email: string; fullName: string | null }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Akun</h1>
      <Card>
        <CardHeader>
          <CardTitle>{fullName ?? "Tanpa nama"}</CardTitle>
          <CardDescription>{email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/update-password" className="text-sm hover:underline">
            Ubah kata sandi
          </Link>
        </CardContent>
      </Card>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Hapus akun</CardTitle>
          <CardDescription>
            Akun beserta seluruh transaksi, kategori, dompet, dan anggaran akan dihapus permanen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  );
}
