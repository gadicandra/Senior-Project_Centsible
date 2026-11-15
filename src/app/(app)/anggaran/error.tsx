"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">Anggaran</h1>
      <p role="alert" className="text-muted-foreground">
        Anggaran tidak bisa dimuat. Periksa koneksi lalu coba lagi.
      </p>
      <Button onClick={() => retry()}>Coba lagi</Button>
    </div>
  );
}
