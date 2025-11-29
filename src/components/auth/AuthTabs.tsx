import { cn } from '@/lib/utils';

interface AuthTabsProps {
  activeTab: 'student' | 'admin';
  onTabChange: (tab: 'student' | 'admin') => void;
}

const AuthTabs = ({ activeTab, onTabChange }: AuthTabsProps) => {
  return (
    <div className="tab-toggle">
      <button
        type="button"
        className={cn('tab-toggle-item', activeTab === 'student' && 'bg-primary text-primary-foreground rounded-md')}
        data-state={activeTab === 'student' ? 'active' : 'inactive'}
        onClick={() => onTabChange('student')}
      >
        Student
      </button>
      <button
        type="button"
        className={cn('tab-toggle-item', activeTab === 'admin' && 'bg-primary text-primary-foreground rounded-md')}
        data-state={activeTab === 'admin' ? 'active' : 'inactive'}
        onClick={() => onTabChange('admin')}
      >
        Admin
      </button>
    </div>
  );
};

export default AuthTabs;
