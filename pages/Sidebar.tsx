import React from 'react';
import { User } from '../types';
import { Icon } from '../components/Icon';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Drawer Content */}
      <aside className="relative h-full w-[85%] max-w-[320px] bg-white shadow-[20px_0_60px_rgba(0,0,0,0.05)] flex flex-col border-r border-gray-50 animate-in slide-in-from-left duration-300">
        <div className="pt-16 pb-10 px-8 bg-white">
          <div className="flex flex-col gap-5">
            <div
              className="group cursor-pointer"
              onClick={() => {
                onClose();
                navigate('/profile');
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="relative w-fit">
                  <div className="size-24 rounded-full p-1 overflow-hidden shadow-lg shadow-blue-100 bg-white ring-4 ring-gray-50">
                    <img
                      alt="User Avatar"
                      className="w-full h-full object-cover rounded-full bg-slate-50 scale-105"
                      src={user?.avatar}
                    />
                  </div>
                  <div className="absolute bottom-1 right-2 size-5 bg-green-400 border-[3px] border-white rounded-full"></div>
                </div>
                {/* Arrow Button */}
                <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                  <Icon name="chevron_right" className="text-[24px]" />
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold font-display tracking-tight text-slate-900 group-hover:text-primary transition-colors">
                  {user?.name}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  {user?.isPremium && (
                    <span className="px-2 py-1 rounded-md bg-electric-blue/10 text-electric-blue text-[10px] font-bold uppercase tracking-wider">
                      Premium
                    </span>
                  )}
                  <span className="text-slate-400 text-xs font-medium">{user?.handle}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto hide-scrollbar px-5 py-2">
          <ul className="flex flex-col gap-2">
            <li>
              <button className="w-full flex items-center gap-5 px-5 py-4 rounded-2xl bg-electric-blue/5 text-electric-blue transition-all">
                <Icon name="account_balance_wallet" className="text-[22px]" />
                <span className="text-[16px] font-semibold">My Wallet</span>
              </button>
            </li>
            <li>
              <button className="w-full flex items-center gap-5 px-5 py-4 rounded-2xl hover:bg-gray-50 transition-colors group text-slate-600">
                <Icon
                  name="donut_large"
                  className="text-electric-blue text-[22px] group-hover:scale-110 transition-transform"
                />
                <span className="text-[16px] font-medium group-hover:text-slate-900 transition-colors">
                  Budget Analytics
                </span>
              </button>
            </li>
            <li>
              <button className="w-full flex items-center gap-5 px-5 py-4 rounded-2xl hover:bg-gray-50 transition-colors group text-slate-600">
                <Icon
                  name="receipt_long"
                  className="text-electric-blue text-[22px] group-hover:scale-110 transition-transform"
                />
                <span className="text-[16px] font-medium group-hover:text-slate-900 transition-colors">
                  Transactions
                </span>
              </button>
            </li>
            <li>
              <button className="w-full flex items-center gap-5 px-5 py-4 rounded-2xl hover:bg-gray-50 transition-colors group text-slate-600">
                <Icon
                  name="savings"
                  className="text-electric-blue text-[22px] group-hover:scale-110 transition-transform"
                />
                <span className="text-[16px] font-medium group-hover:text-slate-900 transition-colors">
                  Saving Goals
                </span>
              </button>
            </li>
          </ul>

          <div className="my-8 px-6">
            <div className="h-px w-full bg-gray-100"></div>
          </div>

          <ul className="flex flex-col gap-1">
            <li>
              <button
                onClick={() => {
                  onClose();
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-5 px-5 py-3.5 rounded-2xl hover:bg-gray-50 transition-colors group text-slate-500"
              >
                <Icon name="settings" className="text-[20px] group-hover:text-slate-800 transition-colors" />
                <span className="text-[15px] font-medium group-hover:text-slate-800 transition-colors">Settings</span>
              </button>
            </li>
            <li>
              <button className="w-full flex items-center gap-5 px-5 py-3.5 rounded-2xl hover:bg-gray-50 transition-colors group text-slate-500">
                <Icon name="support_agent" className="text-[20px] group-hover:text-slate-800 transition-colors" />
                <span className="text-[15px] font-medium group-hover:text-slate-800 transition-colors">
                  Help Center
                </span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="px-10 pb-12 pt-6">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-bold text-electric-blue tracking-wide">Hua Na Le</span>
            <span className="text-[10px] text-slate-400 font-medium">Version 4.0.2</span>
          </div>
        </div>
      </aside>
    </div>
  );
};
