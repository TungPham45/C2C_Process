import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';
import { HomeHero } from '../components/home/HomeHero';
import { CategoryNavigation } from '../components/home/CategoryNavigation';
import { ProductFeed } from '../components/home/ProductFeed';
import { VoucherSection } from '../components/home/VoucherSection';

export const MarketplaceHomePage: FC = () => {
  const navigate = useNavigate();
  return (
    <MarketplaceLayout>
      <div className="space-y-10">
        {/* Banner Section */}
        <HomeHero />

        {/* Exclusive Vouchers Section */}
        <VoucherSection />

        {/* Discovery Sections */}
        <CategoryNavigation />
        
        {/* Editorial Feed */}
        <ProductFeed />

        {/* Community Section / Seller CTA */}
        <section className="px-6 mb-40">
           <div className="max-w-7xl mx-auto bg-[#00629d] rounded-[4rem] p-20 relative overflow-hidden group">
              {/* Decorative Blobs */}
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#42a5f5] rounded-full blur-[100px] opacity-20"></div>
              <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#99cbff] rounded-full blur-[100px] opacity-10"></div>
              
              <div className="relative z-10 grid grid-cols-12 gap-12 items-center">
                 <div className="col-span-12 lg:col-span-7 space-y-8">
                    <h2 className="text-6xl font-black font-['Plus_Jakarta_Sans'] text-white leading-tight">
                       Mua Sắm Thông Minh, <br />
                       <span className="text-[#99cbff]">Bán Hàng</span> Dễ Dàng
                    </h2>
                    <p className="text-white/70 text-lg leading-relaxed max-w-xl">
                       Khám phá hàng nghìn sản phẩm từ các nhà bán hàng uy tín. Mở gian hàng của bạn ngay hôm nay — miễn phí, nhanh chóng và tiếp cận hàng triệu khách hàng.
                    </p>
                    <div className="flex gap-4 pt-4">
                       <button
                          onClick={() => navigate('/seller/register')}
                          className="px-10 py-5 bg-white text-[#00629d] rounded-full font-black uppercase text-xs tracking-widest shadow-xl hover:bg-[#cfe5ff] transition-all"
                       >
                          Start Selling Today
                       </button>
                       <button className="px-10 py-5 border-2 border-white/20 text-white rounded-full font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all">
                          Learn More
                       </button>
                    </div>
                 </div>
                 
                 <div className="col-span-12 lg:col-span-5 relative">
                    <div className="w-full aspect-square bg-[#e9f5ff]/10 rounded-[3rem] p-8 backdrop-blur-3xl border border-white/10 animate-in zoom-in-90 duration-1000">
                       <div className="w-full h-full bg-white/5 rounded-[2rem] flex flex-col items-center justify-center text-center p-10">
                          <span className="material-symbols-outlined text-7xl text-white mb-6 animate-bounce">rocket_launch</span>
                          <h4 className="text-white font-bold text-xl mb-2">Zero Listing Fees</h4>
                          <p className="text-white/50 text-sm">For your first 3 months. Let's grow your brand together.</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </section>
      </div>
    </MarketplaceLayout>
  );
};

export default MarketplaceHomePage;
