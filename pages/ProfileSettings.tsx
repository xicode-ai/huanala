import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '../components/MobileLayout';
import { Icon } from '../components/Icon';
import { Skeleton } from '../components/Skeleton';
import { useUserStore } from '../stores';

export const ProfileSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, fetchUser, logout } = useUserStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <MobileLayout className="bg-background-light font-inter">
      <header className="flex-none pt-safe-top z-10 px-6 py-4 flex items-center justify-between bg-background-light sticky top-0">
        <button
          onClick={() => navigate(-1)}
          className="text-text-main flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 transition-colors"
        >
          <Icon name="arrow_back" className="text-[24px]" />
        </button>
        <h1 className="text-lg font-medium text-text-main tracking-tight">Settings</h1>
        <button className="text-text-main flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 transition-colors">
          <Icon name="more_horiz" className="text-[24px]" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-10 w-full">
        <div className="flex flex-col items-center mt-6 mb-10">
          <div className="relative group cursor-pointer">
            <div className="size-28 rounded-full shadow-soft overflow-hidden bg-gray-100 p-1">
              {isLoading ? (
                <Skeleton className="w-full h-full rounded-full" />
              ) : (
                <img
                  alt="User Avatar"
                  className="w-full h-full object-cover rounded-full"
                  src={user?.avatar || 'https://picsum.photos/200'}
                />
              )}
            </div>
            {!isLoading && (
              <button className="absolute bottom-0 right-0 size-9 bg-white border border-gray-100 rounded-full shadow-md flex items-center justify-center text-text-main hover:bg-gray-50 transition-colors">
                <Icon name="photo_camera" className="text-[18px]" />
              </button>
            )}
          </div>
          <div className="mt-4 text-center">
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-48 mx-auto" />
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-text-main">{user?.name}</h2>
                <p className="text-sm text-text-sub mt-0.5">Where did the money go?</p>
              </>
            )}
          </div>
        </div>

        {/* Upgrade Card */}
        <div className="w-full bg-gradient-to-br from-marigold-light to-[#FFCC80] rounded-[2rem] p-5 flex items-center justify-between text-orange-900/80 shadow-soft mb-8 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 size-40 bg-white/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -left-6 -bottom-6 size-32 bg-orange-300/20 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center gap-4 z-10">
            <div className="size-12 rounded-2xl bg-white/60 flex items-center justify-center backdrop-blur-sm border border-white/40 shadow-sm">
              <Icon name="diamond" className="text-orange-400 text-[26px]" fill />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-widest opacity-70 mb-0.5">Premium</span>
              <span className="text-[17px] font-bold tracking-tight">Free Forever</span>
            </div>
          </div>
          <button className="px-5 py-2.5 bg-white text-orange-500 text-xs font-semibold rounded-2xl shadow-sm z-10 hover:shadow-md transition-all active:scale-95 transform">
            Upgrade
          </button>
        </div>

        {/* Fields */}
        <div className="bg-white rounded-[1.5rem] shadow-card p-2 mb-8">
          {isLoading
            ? [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))
            : [
                { label: 'Nickname', value: user?.name, action: true },
                { label: 'Gender', value: 'Set now', action: true },
                { label: 'Phone', type: 'button' as const, btnText: 'Link' },
                { label: 'WeChat', value: 'Not connected', action: true },
                { label: 'User ID', type: 'copy' as const, value: user?.id },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-2xl group hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span className="text-text-main font-medium text-[15px] ml-1">{item.label}</span>

                  {item.type === 'button' ? (
                    <button className="px-4 py-1.5 bg-gray-100 text-text-sub hover:bg-primary hover:text-white transition-colors text-xs font-semibold rounded-full">
                      {item.btnText}
                    </button>
                  ) : item.type === 'copy' ? (
                    <div className="flex items-center gap-3 text-gray-400">
                      <span className="text-[13px] font-mono text-text-sub bg-gray-50 px-2 py-1 rounded-md">
                        {item.value}
                      </span>
                      <Icon
                        name="content_copy"
                        className="text-[18px] text-gray-300 group-hover:text-primary transition-colors"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <span className="text-[15px] text-text-sub">{item.value}</span>
                      <Icon
                        name="chevron_right"
                        className="text-[20px] text-gray-300 group-hover:text-primary transition-colors"
                      />
                    </div>
                  )}
                </div>
              ))}
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-4 rounded-2xl bg-gray-50 text-text-sub font-medium text-[15px] hover:bg-red-50 hover:text-red-500 transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <Icon name="logout" className="text-[20px]" />
          Log Out
        </button>
        <div className="h-8"></div>
      </main>
    </MobileLayout>
  );
};
