import { Sidebar } from "@/components/Sidebar";

export default function Loading() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-black">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/40" />
          <p className="text-sm font-medium text-zinc-500 animate-pulse">Loading workspace...</p>
        </div>
      </main>
    </div>
  );
}
