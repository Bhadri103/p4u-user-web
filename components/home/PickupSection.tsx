'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { contentApi } from '@/lib/api/content';
import { resolveMediaUrl } from '@/lib/media';
import homeTheater from '../../images/pickup-section/home-theater.png';
import sportShoes from '../../images/pickup-section/sport-shoes.png';
import galaxy from '../../images/pickup-section/galaxy.png';
import utilityTable from '../../images/pickup-section/utility-table.png';
import menSlipper from '../../images/pickup-section/men-slipper.png';
import menTshirt from '../../images/pickup-section/men-tshirt.png';
import womenEthnic from '../../images/pickup-section/women-ethnic.png';
import casualShirt from '../../images/pickup-section/casual-shirt.png';
import faceWash from '../../images/pickup-section/face-wash.png';
import bathSoap from '../../images/pickup-section/bath-soap.png';
import skincare from '../../images/pickup-section/skin-care.png';
import rubberBands from '../../images/pickup-section/rubber-bands.png';

type SectionItem = { title: string; products: { image: any; name: string }[] };

export default function PickupSection() {
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    contentApi.getFeaturedProducts().then((items) => {
      if (items.length) {
        const grouped: Record<string, { image: any; name: string }[]> = {};
        items.forEach((fp) => {
          const sec = fp.section || 'Featured';
          if (!grouped[sec]) grouped[sec] = [];
          grouped[sec].push({ image: resolveMediaUrl(fp.imageUrl) || fp.imageUrl, name: fp.name });
        });
        const apiSections = Object.entries(grouped).map(([title, products]) => ({
          title,
          products,
        }));
        setSections(apiSections);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (sections.length === 0) return null;

  return (
 <div className=" mx-auto max-w-[1400px] px-3 sm:px-4 md:px-6 mt-2 sm:mt-3 md:mt-4  "> 
      <div className="hidden lg:grid lg:grid-cols-3 gap-8">
        {sections.map((section, sectionIndex) => (
          <div 
            key={sectionIndex} 
            className="bg-white rounded-3xl shadow-lg p-8 flex flex-col"
         
          >
            <h3 className="text-2xl font-bold mb-8 text-gray-900">{section.title}</h3>
            <div className="grid grid-cols-2 gap-6 flex-1">
              {section.products.map((product, productIndex) => (
                <div key={productIndex} className="flex flex-col cursor-pointer hover:scale-105 transition-transform">
                  <div className="bg-gray-50 rounded-2xl mb-4 flex-1 flex items-center justify-center overflow-hidden" style={{ minHeight: '280px' }}>
                    <div className="relative w-full h-full">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-contain rounded-2xl"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-tight text-center px-2">{product.name}</p>
                </div>
              ))}
            </div> 
          </div>
        ))}
      </div> 
      <div className="lg:hidden overflow-x-auto scrollbar-hide pb-4">
        <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
          {sections.map((section, sectionIndex) => (
            <div 
              key={sectionIndex} 
              className="bg-white rounded-2xl shadow-md p-6 flex-shrink-0"
              style={{ width: isMobile ? '85vw' : '45vw', maxWidth: '400px' }}
            >
              <h3 className="text-lg font-semibold mb-6 text-gray-900">{section.title}</h3>
              <div className="grid grid-cols-2 gap-4">
                {section.products.map((product, productIndex) => (
                  <div key={productIndex} className="text-center">
                    <div className="bg-gray-50 rounded-xl mb-3 h-32 flex items-center justify-center overflow-hidden">
                      <div className="relative w-full h-full">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-contain rounded-xl"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 leading-tight">{product.name}</p>
                  </div>
                ))}
              </div> 
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}