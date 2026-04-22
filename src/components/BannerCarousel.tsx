const noticeText = '注意事项：不要在发布任务时填写取件码，以免丢失，与跑腿人员建立联系之后再将关键信息告与对方';

const BannerCarousel = () => {
  return (
    <div className="mx-4 mt-4">
      {/* Scrolling notice */}
      <div className="overflow-hidden bg-warning/10 border border-warning/30 rounded-lg mb-3 py-2.5">
        <div className="whitespace-nowrap animate-marquee inline-block">
          <span className="text-sm text-warning font-medium px-4">📢 {noticeText}</span>
        </div>
      </div>

      {/* Static banner */}
      <div className="relative overflow-hidden rounded-xl">
        <div className="min-w-full h-32 bg-gradient-to-r from-success to-primary rounded-xl flex flex-col justify-center px-6">
          <h3 className="text-lg font-bold text-primary-foreground">所有人都可接单</h3>
          <p className="text-sm text-primary-foreground/80 mt-1">灵活接单，轻松赚钱</p>
        </div>
      </div>
    </div>
  );
};

export default BannerCarousel;
