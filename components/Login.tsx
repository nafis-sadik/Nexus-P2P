import React, { useState } from 'react';
import { UserProfile } from '../types';
import Button from './Button';
import { Monitor, Share2, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleLogin = (provider: string) => {
    setLoadingProvider(provider);
    
    // Simulate API call with provider-specific mock data
    setTimeout(() => {
      let mockUser: UserProfile = {
        id: crypto.randomUUID(),
        name: `User-${Math.floor(Math.random() * 1000)}`,
        avatarUrl: `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`
      };

      if (provider === 'Google') {
        mockUser = {
          ...mockUser,
          name: 'Google User',
          avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
        };
      } else if (provider === 'GitHub') {
        mockUser = {
          ...mockUser,
          name: 'GitHub User',
          avatarUrl: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
        };
      } else if (provider === 'Facebook') {
        mockUser = {
          ...mockUser,
          name: 'Facebook User',
          avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg'
        };
      } else if (provider === 'Microsoft') {
        mockUser = {
          ...mockUser,
          name: 'Microsoft User',
          avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg'
        };
      }

      onLogin(mockUser);
      setLoadingProvider(null);
    }, 1500);
  };

  const isAnyLoading = loadingProvider !== null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 relative overflow-hidden transition-colors duration-300">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
          className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl"
        ></motion.div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", delay: 0.5 }}
          className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl"
        ></motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg"
          >
            <Share2 className="w-8 h-8 text-white" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-tight"
          >
            Nexus P2P
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-slate-500 dark:text-slate-400 font-mono text-[10px] tracking-widest uppercase"
          >
            Secure Private Communication
          </motion.p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => handleLogin('Google')} 
            className="w-full justify-center !bg-white border border-slate-300 !text-slate-900 hover:bg-slate-50 shadow-sm disabled:opacity-50"
            isLoading={loadingProvider === 'Google'}
            disabled={isAnyLoading && loadingProvider !== 'Google'}
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="font-semibold">Sign in with Google</span>
          </Button>

          <Button 
            onClick={() => handleLogin('Microsoft')} 
            className="w-full justify-center !bg-[#2F2F2F] !text-white hover:!bg-black border border-transparent shadow-sm disabled:opacity-50"
            isLoading={loadingProvider === 'Microsoft'}
            disabled={isAnyLoading && loadingProvider !== 'Microsoft'}
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 23 23">
              <path fill="#f3f3f3" d="M0 0h11v11H0z"/>
              <path fill="#f3f3f3" d="M12 0h11v11H12z"/>
              <path fill="#f3f3f3" d="M0 12h11v11H0z"/>
              <path fill="#f3f3f3" d="M12 12h11v11H12z"/>
            </svg>
            <span className="font-semibold">Sign in with Microsoft</span>
          </Button>

          <Button 
            onClick={() => handleLogin('Facebook')} 
            className="w-full justify-center !bg-[#1877F2] !text-white hover:!bg-[#166fe5] border-none shadow-sm disabled:opacity-50"
            isLoading={loadingProvider === 'Facebook'}
            disabled={isAnyLoading && loadingProvider !== 'Facebook'}
          >
            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="font-semibold">Sign in with Facebook</span>
          </Button>

          <Button 
            onClick={() => handleLogin('GitHub')} 
            className="w-full justify-center !bg-[#24292F] !text-white hover:!bg-black border border-transparent shadow-sm disabled:opacity-50"
            isLoading={loadingProvider === 'GitHub'}
            disabled={isAnyLoading && loadingProvider !== 'GitHub'}
          >
            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span className="font-semibold">Sign in with GitHub</span>
          </Button>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 grid grid-cols-3 gap-4 text-center"
        >
          <div className="p-3 bg-slate-100 dark:bg-slate-700/30 rounded-lg">
            <Zap className="w-6 h-6 text-yellow-500 dark:text-yellow-400 mx-auto mb-1" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Instant</p>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-700/30 rounded-lg">
            <Monitor className="w-6 h-6 text-green-500 dark:text-green-400 mx-auto mb-1" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Screen Share</p>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-700/30 rounded-lg">
            <Share2 className="w-6 h-6 text-blue-500 dark:text-blue-400 mx-auto mb-1" />
            <p className="text-xs text-slate-500 dark:text-slate-400">P2P Files</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
