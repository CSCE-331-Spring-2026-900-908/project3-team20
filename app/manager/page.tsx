import Link from 'next/link';

export default function ManagerPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 text-black">
            <Link
                href="/"
                className="fixed bottom-4 left-4 z-50 inline-flex items-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-50 focus:outline-none focus:ring-4 focus:ring-amber-200 sm:bottom-6 sm:left-6"
            >
                Back to Home
            </Link>
            <h1 className="text-3xl font-bold">Manager - work in progress</h1>
        </main>
    );
}
