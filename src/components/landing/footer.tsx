import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h2 className="text-2xl font-bold">DSV</h2>
            <p className="text-gray-400">Global Logistics</p>
            <p className="text-gray-400 mt-4 text-sm">
              Your trusted partner for global logistics. Connecting businesses worldwide with reliable air, sea, and road transport services.
            </p>
            <div className="flex space-x-4 mt-4">
              {/* Social Icons Placeholder */}
              <a href="#" className="text-gray-400 hover:text-white">FB</a>
              <a href="#" className="text-gray-400 hover:text-white">TW</a>
              <a href="#" className="text-gray-400 hover:text-white">IN</a>
              <a href="#" className="text-gray-400 hover:text-white">YT</a>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="text-gray-400 hover:text-white">Air Freight</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white">Sea Freight</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white">Road Transport</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="text-gray-400 hover:text-white">Track & Trace</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white">Customer Portal</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white">Contact Us</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white">Help Center</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="text-gray-400 hover:text-white">About DSV</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white">Locations</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white">Careers</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white">News & Media</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-700 pt-6 flex flex-col md:flex-row justify-between items-center text-sm">
          <p className="text-gray-500 text-center md:text-left">&copy; 2024 DSV Global Logistics Network. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link href="#" className="text-gray-500 hover:text-white">Privacy Policy</Link>
            <Link href="#" className="text-gray-500 hover:text-white">Terms of Service</Link>
            <Link href="#" className="text-gray-500 hover:text-white">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
