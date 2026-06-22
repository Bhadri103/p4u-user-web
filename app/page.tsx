import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
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

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      {/* <Navigation /> */}
      <HeroSlider />
      <HomepageCmsBlocks />
      <ServiceCards />
      <BestProducts />
      <BrandSections />
      <PickupSection />
      <TopServicer />
      <MostBookedServices />
     
      <ReelsVideo /> <ClassifiedResale />
      <SubscriptionNewsletter />
      <Footer />
    </div>
  );
}
