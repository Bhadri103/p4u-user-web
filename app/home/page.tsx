import Header from '@/components/layout/Header';
import HeroSlider from '@/components/home/HeroSlider';
import HomepageCmsBlocks from '@/components/home/HomepageCmsBlocks';
import ServiceCards from '@/components/home/ServiceCards';
import BestProducts from '@/components/home/BestProducts';
import BrandSections from '@/components/home/BrandSections';
import PickupSection from '@/components/home/PickupSection';
import TopServicer from '@/components/catalog/TopServicer';
import MostBookedServices from '@/components/catalog/MostBookedServices';
import SubscriptionNewsletter from '@/components/home/SubscriptionNewsletter';
import Footer from '@/components/layout/Footer';
import ClassifiedResale from '@/components/catalog/ClassifiedResale';
import ReelsVideo from '@/components/catalog/ReelsVideo';
import { HomeCategoryGrid, HomeCategoryRail, HomeRideActions, HomeServiceCategories, HomeVendorSection } from '@/components/home/HomeCategorySections';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <HomeCategoryRail />
      <HeroSlider />
      <HomepageCmsBlocks />
      <HomeRideActions />
      <BestProducts />
      <HomeCategoryGrid />
      <HomeVendorSection />
      <BrandSections />
      <PickupSection />
      <TopServicer />
      <MostBookedServices />
      <HomeServiceCategories />
      <ServiceCards />
      <ReelsVideo />
      <ClassifiedResale />
      <SubscriptionNewsletter />
      <Footer />
    </div>
  );
}
