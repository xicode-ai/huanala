import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '../components/MobileLayout';
import { Icon } from '../components/Icon';
import { useUserStore } from '../stores';

export const LoginVerification: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useUserStore();

  const handleLogin = async () => {
    await login('custom');
    navigate('/home');
  };

  return (
    <MobileLayout className="bg-background-light font-sc">
      <div className="w-full px-6 pt-3 pb-2 flex justify-between items-center z-20 text-gray-600 text-sm font-medium">
        <span>9:41</span>
        <div className="flex items-center gap-1.5">
          <Icon name="signal_cellular_alt" className="text-[18px]" />
          <Icon name="wifi" className="text-[18px]" />
          <Icon name="battery_full" className="text-[18px]" />
        </div>
      </div>

      <div className="w-full px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm hover:bg-gray-50 transition-colors"
        >
          <Icon name="arrow_back" className="text-gray-600" />
        </button>
      </div>

      <main className="flex-1 px-8 pt-8 flex flex-col">
        <h1 className="text-[32px] font-bold text-navy-blue mb-2 leading-snug tracking-normal">
          Hi, <br />
          你的手机号码是？
        </h1>
        <div className="h-10"></div>

        <div className="space-y-6">
          <div className="relative group">
            <input
              className="w-full h-16 px-8 bg-surface-white border-none rounded-4xl shadow-soft text-lg placeholder-gray-300 text-gray-800 focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="请输入手机号"
              type="tel"
            />
          </div>
          <div className="relative group flex items-center bg-surface-white rounded-4xl shadow-soft h-16 px-8 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <input
              className="flex-1 bg-transparent border-none p-0 text-lg placeholder-gray-300 text-gray-800 focus:ring-0 outline-none appearance-none"
              placeholder="请输入验证码"
              type="number"
            />
            <button className="ml-4 text-marigold text-[15px] font-bold hover:opacity-80 transition-opacity whitespace-nowrap">
              发送验证码
            </button>
          </div>
        </div>

        <div className="mt-10">
          <button
            onClick={handleLogin}
            className="w-full h-16 bg-primary hover:bg-primary-soft active:scale-[0.98] text-white text-xl font-bold rounded-full shadow-glow transition-all flex items-center justify-center tracking-wide"
          >
            登录
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400 font-light">
            登录即代表您同意 <span className="text-gray-500">用户协议</span> 与{' '}
            <span className="text-gray-500">隐私政策</span>
          </p>
        </div>
      </main>
    </MobileLayout>
  );
};
