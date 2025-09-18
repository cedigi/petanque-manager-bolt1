export function Logo({ className = "w-36 h-36" }) {
  const logoSrc = `${import.meta.env.BASE_URL}logo1.png`;

  return <img src={logoSrc} alt="Logo" className={className} />;
}
