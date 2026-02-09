import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '../components/MobileLayout';
import { Icon } from '../components/Icon';
import { useUserStore } from '../stores';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;

export const LoginOneClick: React.FC = () => {
  const navigate = useNavigate();
  const { sendOtp, verifyOtp, resetOtpFlow, isLoading, isAuthenticated, authError, clearError, otpSent, otpEmail } =
    useUserStore();

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
  };

  const handleVerifyOtp = async () => {
    clearError();

    const nextOtp = otpCode.trim();
    if (!nextOtp) {
      setValidationError('请输入6位验证码');
      return;
    }
    if (!OTP_REGEX.test(nextOtp)) {
      setValidationError('验证码格式不正确');
      return;
    }

    setValidationError(null);
    const loginEmail = otpEmail ?? email.trim();
    await verifyOtp(loginEmail, nextOtp);

    if (useUserStore.getState().isAuthenticated) {
      navigate('/home', { replace: true });
    }
  };

  const handleResendOtp = async () => {
    clearError();
    setValidationError(null);

    const loginEmail = otpEmail ?? email.trim();
    await sendOtp(loginEmail);
  };

  const handleBack = () => {
    resetOtpFlow();
    setOtpCode('');
    setValidationError(null);
  };

  const displayError = validationError || authError;
  const displayEmail = otpEmail ?? email.trim();

  return (
    <MobileLayout className="bg-background-light font-sc">
      <div className="w-full px-4 pt-6">
        {otpSent && (
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Icon name="arrow_back" className="text-gray-600" />
          </button>
        )}
      </div>

      <main className="flex-1 px-8 pt-8 flex flex-col">
        <h1 className="text-[32px] font-bold text-navy-blue mb-2 leading-snug tracking-normal">
          {otpSent ? '输入验证码' : '邮箱登录'}
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          {otpSent ? `验证码已发送至 ${displayEmail}` : '输入邮箱后即可登录或自动注册'}
        </p>

        {displayError && (
          <div className="w-full mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium animate-in fade-in duration-200">
            {displayError}
          </div>
        )}

        {!otpSent ? (
          <div className="space-y-4">
            <div className="relative group">
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setValidationError(null);
                  clearError();
                }}
                className="w-full h-16 px-8 bg-surface-white border-none rounded-4xl shadow-soft text-lg placeholder-gray-300 text-gray-800 focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="邮箱地址"
                type="email"
                autoComplete="email"
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
              />
            </div>

            <button
              onClick={handleSendOtp}
              disabled={isLoading}
              className="w-full h-16 bg-primary hover:bg-primary-soft active:scale-[0.98] text-white text-xl font-bold rounded-full shadow-glow transition-all flex items-center justify-center tracking-wide disabled:opacity-70"
            >
              {isLoading ? '发送中...' : '发送验证码'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative group">
              <input
                value={otpCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(value);
                  setValidationError(null);
                  clearError();
                }}
                className="w-full h-16 px-8 bg-surface-white border-none rounded-4xl shadow-soft text-lg placeholder-gray-300 text-gray-800 focus:ring-2 focus:ring-primary/20 outline-none tracking-[0.5em]"
                placeholder="6位验证码"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
              />
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={isLoading}
              className="w-full h-16 bg-primary hover:bg-primary-soft active:scale-[0.98] text-white text-xl font-bold rounded-full shadow-glow transition-all flex items-center justify-center tracking-wide disabled:opacity-70"
            >
              {isLoading ? '验证中...' : '验证'}
            </button>

            <button
              onClick={handleResendOtp}
              disabled={isLoading}
              className="w-full h-12 text-primary text-sm font-medium hover:text-blue-700 transition-colors disabled:opacity-70"
            >
              重新发送验证码
            </button>
          </div>
        )}
      </main>
    </MobileLayout>
  );
};
