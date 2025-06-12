// next.config.ts
import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@mui/material',
    '@mui/system',
    '@mui/icons-material',
  ],
  // إعداد Turbopack لتجنّب التحذير
  turbopack: {
    // يمكنك تركه فارغاً أو تمرير root/rules حسب اللزوم
    
    // rules: [ /* لو كنت تحتاج loaders مخصّصة */ ],
  },
};

export default nextConfig;
