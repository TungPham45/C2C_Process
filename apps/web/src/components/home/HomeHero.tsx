import { FC, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Banner {
  id: number;
  title: string;
  image_url: string;
  target_url: string | null;
  sort_order: number;
}

export const HomeHero: FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]); // dsach banner
  const [activeIndex, setActiveIndex] = useState(0); // index của banner đang được hiển thị

  // lấy dsach banner
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await fetch('/api/admin/public/banners');
        if (res.ok) {
          const data = await res.json();
          console.log('[HomeHero] Fetched banners:', data.length, data);
          setBanners(data);
        }
      } catch (e) {
        console.error('Failed to fetch banners', e);
      }
    };
    fetchBanners();
  }, []);

  // tự động chuyển banner sau 5s
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners]);

  if (banners.length === 0) return null;

  const currentBanner = banners[activeIndex];

  return (
    <section className="px-6 mb-20 relative">
      <div className="max-w-7xl mx-auto h-[600px] rounded-[4rem] overflow-hidden relative group shadow-2xl">
        {/* Background Image Carousel */}
        {banners.map((banner, index) => (
          <img
            key={banner.id}
            src={banner.image_url}
            alt={banner.title}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${index === activeIndex ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`}
            style={{ transitionProperty: 'opacity, transform' }}
          />
        ))}

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1d25]/80 via-[#0f1d25]/40 to-transparent"></div>

        {/* Content */}
        <div className="absolute inset-0 flex items-center px-16 z-10">
          <div className="max-w-xl space-y-8 animate-in slide-in-from-bottom-10 fade-in duration-1000" key={currentBanner.id}>
            <div className="space-y-4">
              <span className="inline-block px-4 py-1.5 bg-[#42a5f5] text-white rounded-full text-[10px] font-bold uppercase tracking-[0.3em] shadow-lg">
                Nổi bật
              </span>
              <h1 className="text-5xl md:text-6xl font-black font-['Plus_Jakarta_Sans'] leading-[1.1] text-white drop-shadow-md">
                {currentBanner.title}
              </h1>
            </div>

            {currentBanner.target_url && (
              <div className="flex items-center gap-4 pt-4">
                <a
                  href={currentBanner.target_url}
                  target={currentBanner.target_url.startsWith('http') ? '_blank' : '_self'}
                  rel="noreferrer"
                  className="px-10 py-5 bg-white text-[#00629d] rounded-full font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-[#cfe5ff] transition-all hover:scale-105 active:scale-95"
                >
                  Xem ngay
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Carousel Indicators */}
        {banners.length > 1 && (
          <div className="absolute bottom-12 left-16 flex gap-3 z-20">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`h-2 rounded-full transition-all duration-500 ${activeIndex === idx ? 'w-10 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
