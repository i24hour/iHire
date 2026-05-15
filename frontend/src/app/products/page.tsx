import { Sidebar } from '@/components/Sidebar';

const products = [
  {
    name: 'iStocks',
    url: 'https://istocks.codes',
    description: 'Build, test & execute your trading strategies.',
  },
  {
    name: 'Infinitest',
    url: 'https://infinitest.tech',
    description: 'An AI platform for test generation and animated math videos.',
  },
];

export default function ProductsPage() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-black">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 w-full">
        <div className="max-w-4xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Products</h1>
            <p className="text-zinc-400">
              Platforms built and owned by <span className="font-semibold text-white">infinwork.app</span>.
            </p>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((product) => (
              <article key={product.name} className="bg-black border border-white/10 rounded-2xl p-6">
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold text-white">{product.name}</h2>
                  <p className="text-zinc-400 leading-relaxed">{product.description}</p>
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-zinc-300 transition-colors"
                  >
                    {product.url}
                    <span aria-hidden="true">-&gt;</span>
                  </a>
                </div>
              </article>
            ))}
          </section>

          <section className="bg-black border border-white/10 rounded-2xl p-6">
            <p className="text-zinc-400 text-sm">Founder & Product Lead</p>
            <p className="text-white text-xl font-semibold mt-1">Priyanshu</p>
          </section>
        </div>
      </main>
    </div>
  );
}
