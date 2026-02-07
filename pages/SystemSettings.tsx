import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '../components/MobileLayout';
import { Icon } from '../components/Icon';
import { useUserStore } from '../stores';

export const SystemSettings: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useUserStore();

  const sections = [
    {
      title: 'Preferences',
      items: [
        { icon: 'notifications', label: 'Push Notifications', type: 'toggle' as const, active: true },
        { icon: 'face', label: 'Biometric Login', type: 'toggle' as const, active: true },
        { icon: 'dark_mode', label: 'Dark Mode', type: 'toggle' as const, active: false },
      ],
    },
    {
      title: 'Data & Security',
      items: [
        { icon: 'cloud_sync', label: 'Cloud Sync Settings', type: 'link' as const, value: 'On' },
        { icon: 'lock', label: 'Security Center', type: 'link' as const },
        { icon: 'cleaning_services', label: 'Clear Cache', type: 'link' as const },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: 'info', label: 'Version Update', type: 'link' as const, value: 'v2.4' },
        { icon: 'shield', label: 'Privacy Policy', type: 'link' as const },
        { icon: 'description', label: 'Terms of Service', type: 'link' as const },
      ],
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <MobileLayout className="bg-background-soft font-display">
      <header className="flex-none bg-background-soft pt-safe-top z-10 sticky top-0 transition-all duration-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-800 flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition-all"
          >
            <Icon name="arrow_back_ios_new" className="text-[20px]" />
          </button>
          <h1 className="text-[16px] font-bold text-slate-800 tracking-tight">System Settings</h1>
          <div className="size-9 shrink-0"></div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar px-4 py-2 pb-8">
        {sections.map((section, idx) => (
          <div key={idx} className="mb-5">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2 opacity-80">
              {section.title}
            </h2>
            <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden divide-y divide-slate-50">
              {section.items.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-4 py-3 ${item.type === 'link' ? 'hover:bg-slate-50 cursor-pointer group' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-electric-light flex items-center justify-center text-electric-blue">
                      <Icon name={item.icon} className="text-[18px]" />
                    </div>
                    <span className="text-[15px] font-medium text-slate-800">{item.label}</span>
                  </div>

                  {item.type === 'toggle' ? (
                    <button
                      className={`relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${item.active ? 'bg-electric-blue' : 'bg-slate-200'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-[18px] transform rounded-full bg-white shadow-sm ring-0 transition duration-300 ease-in-out ${item.active ? 'translate-x-[18px]' : 'translate-x-0'}`}
                      ></span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      {item.value && (
                        <span
                          className={`text-xs font-semibold ${item.value === 'On' ? 'text-electric-blue' : 'text-slate-400'}`}
                        >
                          {item.value}
                        </span>
                      )}
                      <Icon
                        name="chevron_right"
                        className="text-slate-300 text-[18px] group-hover:text-electric-blue transition-colors"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="px-0 pb-4">
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl border border-red-100 text-red-500 bg-white shadow-soft font-bold text-sm hover:bg-red-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Icon name="logout" className="text-[18px]" />
            Log Out
          </button>
          <p className="text-center text-slate-400 text-[10px] mt-4 font-medium tracking-wide">
            Hua Na Le (Where did the money go) &copy; 2024
          </p>
        </div>
      </main>
    </MobileLayout>
  );
};
