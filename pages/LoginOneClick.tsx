import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '../components/MobileLayout';
import { Icon } from '../components/Icon';
import { useUserStore } from '../stores';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;

export const LoginOneClick: React.FC = () => {
  const navigate = useNavigate();
  const { sendOtp, verifyOtp, resetOtpFlow, isLoading, isAuthenticated, authError, clearError } = useUserStore();

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    clearError();
    const nextEmail = email.trim();
    if (!nextEmail) {
      setValidationError('请输入邮箱地址');
      return;
    }
    if (!EMAIL_REGEX.test(nextEmail)) {
      setValidationError('邮箱格式不正确');
      return;
    }

    setValidationError(null);
    await sendOtp(nextEmail);
    setCountdown(60);
  };

  const handleLogin = async () => {
    clearError();

    if (!agreed) {
      setValidationError('请先阅读并同意用户协议');
      return;
    }

    const nextEmail = email.trim();
    if (!nextEmail) {
      setValidationError('请输入邮箱地址');
      return;
    }

    const nextOtp = otpCode.trim();
    if (!nextOtp) {
      setValidationError('请输入验证码');
      return;
    }
    if (!OTP_REGEX.test(nextOtp)) {
      setValidationError('验证码格式不正确');
      return;
    }

    setValidationError(null);
    await verifyOtp(nextEmail, nextOtp);

    if (useUserStore.getState().isAuthenticated) {
      navigate('/home', { replace: true });
    }
  };

  const displayError = validationError || authError;

  return (
    <MobileLayout className="bg-blue-50/30 font-display min-h-screen flex flex-col items-center justify-between py-10">
      {/* Top Section */}
      <div className="w-full flex flex-col items-center flex-1 justify-center -mt-20">
        {/* Illustration Placeholder */}
        <div className="w-48 h-48 mb-6 relative">
          {/* Using a simple CSS-based chart icon representation since we don't have the image asset */}
          <div className="absolute inset-0 bg-blue-100/50 rounded-full blur-3xl opacity-50"></div>
          <div className="relative w-full h-full flex items-center justify-center">
            <Icon name="monitoring" className="text-8xl text-primary opacity-80" />
          </div>
        </div>

        {/* Title & Slogan */}
        <h1 className="text-4xl font-extrabold text-navy-blue mb-1 tracking-tight">花哪了</h1>
        <h2 className="text-sm font-bold text-primary tracking-[0.2em] mb-4 uppercase">HUA NA LE</h2>
        <p className="text-gray-400 text-sm font-medium">每一分钱都有迹可循</p>

        {/* Form Section */}
        <div className="w-full px-8 mt-12 space-y-5">
          {/* Email Input */}
          <div className="relative group">
            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setValidationError(null);
                clearError();
              }}
              className="w-full h-14 px-6 bg-white border border-transparent focus:border-primary/20 rounded-2xl shadow-sm text-base placeholder-gray-400 text-gray-800 outline-none transition-all"
              placeholder="邮箱地址"
              type="email"
              inputMode="email"
            />
          </div>

          {/* OTP Input */}
          <div className="relative group flex items-center">
            <input
              value={otpCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtpCode(value);
                setValidationError(null);
                clearError();
              }}
              className="w-full h-14 pl-6 pr-28 bg-white border border-transparent focus:border-primary/20 rounded-2xl shadow-sm text-base placeholder-gray-400 text-gray-800 outline-none transition-all"
              placeholder="验证码"
              type="text"
              inputMode="numeric"
              maxLength={6}
            />
            <button
              onClick={handleSendOtp}
              disabled={countdown > 0 || isLoading}
              className="absolute right-2 h-10 px-4 text-sm font-bold text-primary disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {countdown > 0 ? `${countdown}s` : '获取验证码'}
            </button>
          </div>

          {/* Error Message */}
          <div className="h-6 flex items-center justify-center">
            {displayError && <span className="text-red-500 text-xs font-medium animate-pulse">{displayError}</span>}
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full h-14 bg-primary hover:bg-blue-600 active:scale-[0.98] text-white text-lg font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center tracking-wide disabled:opacity-70 disabled:shadow-none"
          >
            {isLoading ? '登录中...' : '登 录'}
          </button>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="w-full px-8 flex flex-col items-center space-y-8 mb-4">
        {/* Agreement */}
        <div className="flex items-center space-x-2">
          <div
            className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors ${agreed ? 'bg-primary border-primary' : 'border-gray-300 bg-white'}`}
            onClick={() => setAgreed(!agreed)}
          >
            {agreed && <Icon name="check" className="text-white text-xs" />}
          </div>
          <span className="text-xs text-gray-400">
            我已阅读并同意 <span className="text-primary cursor-pointer">《用户协议》</span> 和{' '}
            <span className="text-primary cursor-pointer">《隐私协议》</span>
          </span>
        </div>

        {/* Social Login */}
        <div className="flex items-center space-x-8">
          <button className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center hover:scale-105 transition-transform">
            <i className="fa-brands fa-apple text-gray-800 text-2xl"></i>
          </button>
          <button className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center hover:scale-105 transition-transform">
            <i className="fa-brands fa-weixin text-green-500 text-2xl"></i>
          </button>
        </div>
      </div>
    </MobileLayout>
  );
};
