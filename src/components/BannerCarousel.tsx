import { useState, useEffect } from 'react';

const noticeText = '注意事项：不要在发布任务时填写取件码，以免丢失，与跑腿人员建立联系之后再将关键信息告与对方';

const banners = [
  { id: 1, title: '新用户注册立享优惠', subtitle: '首单立减5元', bg: 'from-primary to-warning' },
  { id: 2, title: '跑腿员招募中', subtitle: '灵活接单，轻松赚钱', bg: 'from-success to-primary' },
  { id: 3, title: '限时活动', subtitle: '邀请好友各得10元红包', bg: 'from-destructive to-primary' },
];

const BannerCarousel = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mx-4 mt-4">
      {/* Scrolling notice */}
      <div className="overflow-hidden bg-warning/10 border border-warning/30 rounded-lg mb-3 py-2">
        <div className="whitespace-nowrap animate-[marquee_25s_linear_infinite]">
          <span className="text-xs text-warning font-medium px-4">📢 {noticeText}</span>
          <span className="text-xs text-warning font-medium px-4">📢 {noticeText}</span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((banner) => (
            <div
              key={banner.id}
              className={`min-w-full h-32 bg-gradient-to-r ${banner.bg} rounded-xl flex flex-col justify-center px-6`}
            >
              <h3 className="text-lg font-bold text-primary-foreground">{banner.title}</h3>
              <p className="text-sm text-primary-foreground/80 mt-1">{banner.subtitle}</p>
            </div>
          ))}
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === current ? 'bg-primary-foreground w-4' : 'bg-primary-foreground/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BannerCarousel;
