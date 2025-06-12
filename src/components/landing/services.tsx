const services = [
    {
      icon: '✈️',
      title: 'Air Freight Express',
      description: 'Fast and reliable air cargo services for time-sensitive shipments worldwide.',
    },
    {
      icon: '🚢',
      title: 'Sea Freight FCL',
      description: 'Cost-effective ocean freight solutions for full container loads.',
    },
    {
      icon: '🚚',
      title: 'Road Transport',
      description: 'Flexible road freight services connecting major trade routes.',
    },
    {
      icon: '⚙️',
      title: 'Supply Chain Solutions',
      description: 'End-to-end logistics and supply chain management services.',
    },
  ];

export function Services() {
    return (
      <section id="services" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800">Our Services</h2>
            <p className="text-gray-600 mt-2">Comprehensive logistics solutions tailored to your business needs</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service) => (
              <div key={service.title} className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition text-center">
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
                <a href="#" className="text-blue-600 hover:text-blue-800 font-semibold mt-4 inline-block">
                  Learn More →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
