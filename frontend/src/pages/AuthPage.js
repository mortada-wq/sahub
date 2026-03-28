import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import axios from 'axios';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'member'
  });
  const [loading, setLoading] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, payload);
      const { token, user } = response.data;

      toast.success(isLogin ? t.welcomeBack : t.accountCreated);
      onLogin(token, user);
    } catch (error) {
      toast.error(error.response?.data?.detail || t.authFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      {/* Language toggle - top right */}
      <div className="fixed top-4 end-4 z-50">
        <button
          data-testid="language-toggle"
          onClick={toggleLanguage}
          className="px-4 py-1.5 rounded-full border border-zinc-200 font-plex text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors bg-white shadow-sm"
        >
          {language === 'en' ? 'AR | العربية' : 'EN | English'}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="font-outfit text-5xl font-medium text-zinc-900 mb-2">sahub</h1>
          <p className="font-plex text-base text-zinc-600">{t.tagline}</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-8">
          <div className="flex gap-2 mb-6 bg-zinc-100 rounded-full p-1">
            <button
              data-testid="login-tab-button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-full font-plex text-sm font-medium transition-all ${
                isLogin
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {t.login}
            </button>
            <button
              data-testid="register-tab-button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-full font-plex text-sm font-medium transition-all ${
                !isLogin
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {t.register}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="name" className="font-plex text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
                  {t.name}
                </Label>
                <Input
                  id="name"
                  data-testid="name-input"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="rounded-xl border-zinc-200"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="font-plex text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
                {t.email}
              </Label>
              <Input
                id="email"
                data-testid="email-input"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="rounded-xl border-zinc-200"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="font-plex text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
                {t.password}
              </Label>
              <Input
                id="password"
                data-testid="password-input"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="rounded-xl border-zinc-200"
                required
              />
            </div>

            {!isLogin && (
              <div>
                <Label htmlFor="role" className="font-plex text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2 block">
                  {t.role}
                </Label>
                <select
                  id="role"
                  data-testid="role-select"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white font-plex text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                >
                  <option value="member">{t.roleMember}</option>
                  <option value="manager">{t.roleManager}</option>
                  <option value="admin">{t.roleAdmin}</option>
                </select>
              </div>
            )}

            <Button
              data-testid="submit-button"
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-zinc-900 text-white hover:bg-zinc-800 font-plex font-medium py-6 mt-6"
            >
              {loading ? t.loading : isLogin ? t.signIn : t.createAccount}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
