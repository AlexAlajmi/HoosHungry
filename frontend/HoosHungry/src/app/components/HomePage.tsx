import LandingPage from '../../imports/LandingPage';

interface HomePageProps {
  onGetStarted: () => void;
}

export default function HomePage({ onGetStarted }: HomePageProps) {
  return <LandingPage onGetStarted={onGetStarted} />;
}
