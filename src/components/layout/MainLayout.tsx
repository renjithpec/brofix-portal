import { Outlet } from 'react-router-dom';
import FluidBackground from '@/components/FluidBackground';
import Header from './Header';

const MainLayout = () => {
  return (
    <div className="min-h-screen">
      <FluidBackground />
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
