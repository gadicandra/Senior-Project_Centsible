import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountDialog } from "./delete-account-dialog";

export function AccountScreen({ email, fullName }: { email: string; fullName: string | null }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHero title="Akun" subtitle={email} />
      <Card className="rounded-2xl">
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
      <Card className="rounded-2xl border-destructive/40">
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
