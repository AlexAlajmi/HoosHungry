import imgScreenshot20260321At45524Pm1 from "../assets/5136746a46ed76cbb1efd9b3e613bfce3aaf02de.png";
import imgImage5 from "../assets/29fad6dbf4ad44a1792c25a0d02b0f14abf87896.png";
import imgLandingPage from "../assets/landing-page.png";
import imgBurrito from "../assets/burrito.png";
import imgSub from "../assets/sub.png";
import React from "react";

export default function LandingPage() {
  return (
    <div className="bg-[#efefef] relative size-full" data-name="Landing Page">
      <div className="absolute bg-white h-[80px] left-0 top-0 w-[1280px]" />
      <div className="absolute h-[79px] left-[67px] top-px w-[90px]" data-name="Screenshot 2026-03-21 at 4.55.24 PM 1">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute h-[135.8%] left-[-38.81%] max-w-none top-[-13.66%] w-[180.6%]" src={imgScreenshot20260321At45524Pm1} />
        </div>
      </div>
      <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-none left-[356px] not-italic text-[32px] text-black top-[238px] whitespace-nowrap">Buy meals. Sell swipes. Save Money.</p>
      <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-[0] left-[541px] not-italic text-[32px] text-black top-[196px] whitespace-nowrap">
        <span className="leading-none text-[#fd6500]">hoos</span>
        <span className="leading-none">hungry</span>
      </p>
      <div className="absolute h-[345px] left-[382px] top-[332px] w-[517px]" data-name="landing page photo">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute inset-0 h-full max-w-none object-cover w-full" src={imgLandingPage} />
        </div>
      </div>
      <p className="absolute font-['Inter:Bold',sans-serif] font-bold leading-none left-[534px] not-italic text-[#f50] text-[32px] top-[780px] whitespace-nowrap">How it works</p>
      <div className="absolute bg-[#fd6500] h-[35px] left-[1071px] rounded-[6px] top-[27px] w-[150px]" />
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-none left-[1101px] not-italic text-[16px] text-white top-[37px] whitespace-nowrap">Get Started</p>
      <div className="absolute content-start flex flex-wrap font-['Inter:Bold',sans-serif] font-bold gap-[9px_10px] items-start leading-none left-[241px] not-italic top-[902px] w-[324px]">
        <p className="relative shrink-0 text-[#f50] text-[36px] whitespace-nowrap">1)</p>
        <p className="relative shrink-0 text-[32px] text-black whitespace-nowrap">Request a meal</p>
        <p className="relative shrink-0 text-[#777] text-[20px] w-[307px]">Choose an item and price then send a request in seconds.</p>
      </div>
      <div className="absolute font-['Inter:Bold',sans-serif] font-bold h-[126px] leading-none left-[714px] not-italic top-[1132px] w-[324px]">
        <p className="absolute left-0 text-[#f50] text-[36px] top-0 whitespace-nowrap">2)</p>
        <p className="absolute left-[47px] text-[32px] text-black top-[2px] whitespace-nowrap">Get matched instantly</p>
        <p className="absolute left-0 text-[#777] text-[20px] top-[46px] w-[380px]">Nearby students with extra swipes accept the exchange.</p>
      </div>
      <div className="absolute h-[216px] left-[380px] top-[1086px] w-[179px]" data-name="burrito photo">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute inset-0 h-full max-w-none object-cover w-full" src={imgBurrito} />
        </div>
      </div>
      <div className="absolute content-start flex flex-wrap font-['Inter:Bold',sans-serif] font-bold gap-[9px_10px] items-start leading-none left-[255px] not-italic top-[1384px] w-[324px]">
        <p className="relative shrink-0 text-[#f50] text-[36px] whitespace-nowrap">3)</p>
        <p className="relative shrink-0 text-[32px] text-black whitespace-nowrap">{`Meet & Exchange`}</p>
        <p className="relative shrink-0 text-[#777] text-[20px] w-[371px]">Meet up with meal exchange seller, confirm the exchange, and enjoy.</p>
      </div>
      <div className="absolute h-[130px] left-[710px] top-[1365px] w-[314px]" data-name="sub photo">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute inset-0 h-full max-w-none object-cover w-full" src={imgSub} />
        </div>
      </div>
      <div className="absolute content-stretch flex flex-col h-[167px] items-start left-[800px] p-[10px] top-[872px] w-[212px]">
        <div className="aspect-[412/315] relative shrink-0 w-full" data-name="image 5">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage5} />
        </div>
      </div>
      <div className="absolute bg-[#fd6500] h-[138px] left-[-11px] top-[1773px] w-[1291px]" />
    </div>
  );
}
