import logoImage from '../assets/SimuCryto.png';

interface LogoProps {
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Logo({ variant = 'full', size = 'md', className = '' }: LogoProps) {
  // Size mapping cho các biến thể
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
    xl: 'h-16'
  };

  const heightClass = sizeClasses[size];

  return (
    <div className={`flex items-center ${className}`}>
      <img
        src={logoImage}
        alt="SimuCryto - Nền tảng học tập và giao dịch mô phỏng crypto"
        className={`${heightClass} w-auto object-contain`}
        loading="eager"
      />
    </div>
  );
}
