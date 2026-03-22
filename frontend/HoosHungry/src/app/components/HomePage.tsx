import { Button } from './ui/button';
import LandingPage from '../../imports/LandingPage';

interface HomePageProps {
  onGetStarted: () => void;
}

export default function HomePage({ onGetStarted }: HomePageProps) {
  return (
    <div className="relative size-full" onClick={onGetStarted}>
      <LandingPage />
      <div
        className="absolute h-[35px] left-[1071px] top-[27px] w-[150px] cursor-pointer"
        onClick={onGetStarted}
      />
    </div>
  );
}
