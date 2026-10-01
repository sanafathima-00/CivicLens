import { InvestigationCreatedShell } from "@/features/investigations/investigation-created-shell";

export default async function InvestigationPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 px-6 py-12">
      <InvestigationCreatedShell investigationId={id} />
    </main>
  );
}
