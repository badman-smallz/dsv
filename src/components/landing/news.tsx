"use client";

import { useState } from 'react';
import Image from 'next/image';

const newsArticles = [
    {
      date: 'May 30, 2025',
      title: 'DSV Expands Network in Southeast Asia',
      description: 'New facilities and partnerships strengthen our presence in key Asian markets, offering enhanced connectivity...',
      fullDescription: 'With the opening of our new logistics hub in Singapore and strategic partnerships in Vietnam and Thailand, we are significantly boosting our operational capacity. This expansion allows for faster transit times and more robust supply chain solutions for our clients operating in the region.',
      image: 'https://images.unsplash.com/photo-1578574577315-3fbeb0cecdc2?q=80&w=2070&auto=format&fit=crop',
    },
    {
      date: 'May 30, 2025',
      title: 'Sustainable Logistics Solutions',
      description: 'Our commitment to carbon-neutral shipping and green logistics practices for a sustainable future...',
      fullDescription: 'We are proud to announce our investment in a new fleet of electric vehicles and our partnership with green energy providers. These initiatives are part of our broader strategy to achieve a 50% reduction in carbon emissions by 2030 and offer fully carbon-neutral shipping options to our customers.',
      image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=2070&auto=format&fit=crop',
    },
    {
      date: 'May 30, 2025',
      title: 'Digital Innovation in Supply Chain',
      description: 'How AI and IoT technologies are revolutionizing logistics operations and customer experience...',
      fullDescription: 'Our new AI-powered platform, DSV-Insight, leverages real-time data from IoT sensors to provide predictive analytics, optimize routes, and improve delivery accuracy. This technology empowers our clients with unprecedented visibility and control over their supply chain.',
      image: 'https://images.unsplash.com/photo-1555421689-491a97ff2040?q=80&w=2070&auto=format&fit=crop',
    },
  ];

export function News() {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setExpandedCard(expandedCard === index ? null : index);
  };
    return (
      <section id="news" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800">Latest News & Insights</h2>
            <p className="text-gray-600 mt-2">Stay updated with industry trends and DSV developments</p>
          </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {newsArticles.map((article, index) => {
              const isExpanded = expandedCard === index;
              return (
                <div key={article.title} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300">
                  <Image src={article.image} alt={article.title} width={500} height={300} className="h-48 w-full object-cover"/>
                  <div className="p-6">
                    <p className="text-sm text-gray-500 mb-2">{article.date}</p>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{article.title}</h3>
                                        <p className={`text-gray-600 overflow-hidden transition-all duration-300 ${isExpanded ? 'h-auto' : 'h-24'}`}>
                      {isExpanded ? article.fullDescription : article.description}
                    </p>
                    <button 
                      onClick={() => handleToggle(index)} 
                      className="text-blue-600 hover:text-blue-800 font-semibold mt-4 inline-block"
                    >
                      {isExpanded ? 'Read Less' : 'Read More →'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }
