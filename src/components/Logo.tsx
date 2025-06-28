import logo from '../assets/logo1.png';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <img src={logo} alt="Pétanque Manager" className={className} />
  );
}



