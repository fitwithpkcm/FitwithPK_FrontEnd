import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';

type ThemeOption = 'light' | 'dark' | 'system';

interface ThemeSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThemeSettings({ open, onOpenChange }: ThemeSettingsProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Only show the component after mount to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleThemeChange = (newTheme: ThemeOption) => {
    setTheme(newTheme);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Theme & Appearance</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-3 gap-3">
            <ThemeButton
              icon={<Sun className="h-5 w-5" />}
              label="Light"
              isSelected={theme === 'light'}
              onClick={() => handleThemeChange('light')}
            />
            <ThemeButton
              icon={<Moon className="h-5 w-5" />}
              label="Dark"
              isSelected={theme === 'dark'}
              onClick={() => handleThemeChange('dark')}
            />
            <ThemeButton
              icon={<Monitor className="h-5 w-5" />}
              label="System"
              isSelected={theme === 'system'}
              onClick={() => handleThemeChange('system')}
            />
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-4">
            <h3 className="font-medium mb-2">About themes</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose how FitwithPK looks to you. Select a light or dark theme, or sync with your system preferences.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ThemeButtonProps {
  icon: React.ReactNode;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

function ThemeButton({ icon, label, isSelected, onClick }: ThemeButtonProps) {
  return (
    <Button
      variant={isSelected ? "default" : "outline"}
      className={`flex flex-col items-center justify-center py-6 gap-2 ${isSelected ? "bg-primary-500 text-white hover:bg-primary-600" : ""
        }`}
      onClick={onClick}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  );
}