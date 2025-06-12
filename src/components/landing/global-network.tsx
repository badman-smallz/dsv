export function GlobalNetwork() {
    return (
      <section id="locations" className="py-20 bg-white">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center">
          <div className="w-full md:w-1/2">
            <h2 className="text-4xl font-bold text-gray-800">Global Network</h2>
            <p className="text-gray-600 mt-4 max-w-lg">
              With offices in 80+ countries and partnerships worldwide, DSV provides seamless logistics solutions across all major trade routes.
            </p>
            <div className="flex flex-wrap gap-x-12 gap-y-6 mt-8">
              <div>
                <p className="text-4xl font-bold text-blue-600">80+</p>
                <p className="text-gray-600">Countries</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-blue-600">1,400+</p>
                <p className="text-gray-600">Warehouses</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-blue-600">75,000+</p>
                <p className="text-gray-600">Employees</p>
              </div>
            </div>
            <div className="mt-8">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700">
                Find Local Office
              </button>
            </div>
          </div>
          <div className="w-full md:w-1/2 mt-10 md:mt-0">
            <img src="/closeup-shot-beautiful-blue-sea-wave.jpg" alt="Ocean wave" className="rounded-lg shadow-lg"/>
          </div>
        </div>
      </section>
    );
  }
