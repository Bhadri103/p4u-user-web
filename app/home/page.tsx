import Header from '@/components/layout/Header';
import HeroSlider from '@/components/home/HeroSlider';
import HomepageCmsBlocks from '@/components/home/HomepageCmsBlocks';
import MarketplaceHome from '@/components/home/MarketplaceHome';
import Footer from '@/components/layout/Footer';
import { HomeCategoryRail } from '@/components/home/HomeCategorySections';
import { Headphones, MapPin, ShieldCheck, Sparkles } from 'lucide-react';

const confidenceItems = [
  { icon: ShieldCheck, title: 'Trusted choices', copy: 'Verified sellers and providers' },
  { icon: MapPin, title: 'Made for your area', copy: 'Useful discoveries close to you' },
  { icon: Sparkles, title: 'One simple experience', copy: 'Shop, services, homes and community' },
  { icon: Headphones, title: 'Support when needed', copy: 'Help throughout your journey' },
];

export default function HomePage() {
  return (
    <div className="marketplace-home home-storefront min-h-screen overflow-x-clip">
      <Header variant="marketplace" />
      <HeroSlider />
      <section className="mx-auto mt-4 max-w-7xl bg-white  px-4 sm:px-6 lg:px-8" aria-label="Why choose Planext4u">
      </section>
      <HomepageCmsBlocks />
      <HomeCategoryRail />
      <MarketplaceHome />
      <Footer />
    </div>
  );
}
