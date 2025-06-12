import Link from 'next/link';

export function Hero() {
  return (
    <section
      className="relative bg-blue-800 text-white"
    >
        <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage: "url('/delivery-men-loading-carboard-boxes-van-while-getting-ready-shipment.jpg')"}}></div>
        <div className="absolute inset-0 bg-blue-900 bg-opacity-70"></div>
      <div className="relative container mx-auto px-6 py-32 flex">
        <div className="w-full text-center md:w-2/3 md:text-left">
            <h2 className="text-5xl font-bold leading-tight">Global Logistics <br/> Network</h2>
            <p className="mt-4 max-w-xl text-lg">
            Connecting your business to the world with reliable air, sea, and road transport solutions across 80+ countries.
            </p>
            <div className="mt-8 flex space-x-4 justify-center md:justify-start">
            <Link href="/auth/register">
                <button className="bg-white text-blue-700 px-6 py-3 rounded font-semibold hover:bg-gray-200 transition">
                Get Quote Now
                </button>
            </Link>
            <Link href="/auth/login?track=true">
                <button className="border border-white text-white px-6 py-3 rounded font-semibold hover:bg-white hover:text-blue-700 transition">
                Track Shipment
                </button>
            </Link>
            </div>
        </div>
      </div>
    </section>
  );
}
