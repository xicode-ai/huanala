import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '../components/MobileLayout';
import { useUserStore } from '../stores';

export const LoginOneClick: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useUserStore();

  const handleLogin = async () => {
    await login('13888888888');
    navigate('/home');
  };

  return (
    <MobileLayout className="bg-gradient-to-b from-blue-50 to-white font-sc">
      <div className="px-6 pt-3 flex justify-between items-center text-sm font-medium z-10 text-gray-600">
        <span>17:09</span>
        <div className="flex items-center space-x-2">
          <i className="fas fa-signal text-xs"></i>
          <i className="fas fa-wifi text-xs"></i>
          <div className="border border-current rounded px-1 text-[10px] font-bold">69</div>
        </div>
      </div>

      <main className="flex-1 flex flex-col px-8 relative">
        <div className="flex-1 flex flex-col items-center justify-center -mt-10">
          <div className="mb-6 relative w-40 h-40 flex items-center justify-center">
            <div className="absolute inset-0 bg-blue-200 rounded-full blur-2xl opacity-40 animate-pulse"></div>
            <svg fill="none" height="140" viewBox="0 0 200 200" width="140" xmlns="http://www.w3.org/2000/svg">
              <rect fill="#BFDBFE" height="40" rx="6" width="25" x="50" y="120"></rect>
              <rect fill="#93C5FD" height="70" rx="6" width="25" x="85" y="90"></rect>
              <rect fill="#3B82F6" height="110" rx="6" width="25" x="120" y="50"></rect>
              <path
                d="M40 110 C 60 110, 70 70, 100 70 C 130 70, 140 30, 170 30"
                stroke="#2563EB"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="5"
              ></path>
              <circle cx="170" cy="30" fill="#FBBF24" r="8"></circle>
            </svg>
          </div>
          <div className="text-center z-10">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-1">花哪了</h1>
            <p className="text-[10px] font-bold text-blue-500 tracking-[0.4em] uppercase mb-4">Hua Na Le</p>
            <p className="text-base text-gray-500 font-medium">让每一分钱都有迹可循</p>
          </div>
        </div>

        <div className="w-full pb-10">
          <div className="flex flex-col items-center">
            <h2 className="text-3xl font-bold text-gray-800 tracking-widest font-mono mb-2">138****8888</h2>
            <p className="text-xs text-gray-400 mb-8">中国移动提供认证服务</p>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-soft text-white font-bold text-lg py-4 rounded-full shadow-glow active:scale-[0.98] transition-all duration-200 disabled:opacity-70"
            >
              {isLoading ? 'Logging in...' : '一键登录'}
            </button>

            <button
              onClick={() => navigate('/login-verify')}
              className="mt-6 text-primary text-sm font-medium hover:text-blue-700 transition-colors"
            >
              其他手机号登录
            </button>
          </div>
        </div>
      </main>

      <footer className="px-8 pb-8 flex flex-col items-center bg-transparent">
        <div className="flex items-start justify-center space-x-2 mb-8 max-w-[280px] mx-auto">
          <input type="checkbox" className="mt-1 accent-primary" defaultChecked />
          <label className="text-[11px] text-gray-400 leading-tight text-left select-none">
            我已阅读并同意 <span className="text-blue-500">《中国移动认证服务条款》</span>{' '}
            <span className="text-blue-500">《用户协议》</span> 和 <span className="text-blue-500">《隐私协议》</span>
          </label>
        </div>
        <div className="flex justify-center space-x-10 mb-8">
          <button className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all text-gray-600 hover:text-black">
            <i className="fab fa-apple text-xl"></i>
          </button>
          <button className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all text-[#09BB07]">
            <i className="fab fa-weixin text-xl"></i>
          </button>
        </div>
      </footer>
    </MobileLayout>
  );
};
