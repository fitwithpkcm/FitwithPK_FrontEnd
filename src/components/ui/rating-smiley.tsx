import React from 'react';

interface RatingSmileyProps {
  rating: number;
}

const RatingSmiley: React.FC<RatingSmileyProps> = ({ rating }) => {
  if (typeof rating !== 'number' || rating <= 0) {
    return null;
  }

  const getBackgroundColor = () => {
    switch (rating) {
      case 1: return 'bg-red-500';
      case 2: return 'bg-orange-500';
      case 3: return 'bg-yellow-500';
      case 4: return 'bg-lime-500';
      case 5: return 'bg-green-500';
      default: return 'bg-green-500';
    }
  };

  const renderIcon = () => {
    switch (rating) {
      case 1:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm2.97 4.43l1.06-1.06 1.06 1.06 1.415-1.414-1.06-1.06 1.06-1.06-1.415-1.416-1.06 1.06-1.06-1.06-1.414 1.415 1.06 1.06-1.06 1.06 1.414 1.415z" />
          </svg>
        );
      case 2:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm8 5H9v2h6v-2z" />
          </svg>
        );
      case 3:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm8 5H9v2h6v-2z" />
          </svg>
        );
      case 4:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm1.146 5.146l1.414 1.414L12 15.12l2.44 2.44 1.414-1.414L12 12.292l-3.854 3.854z" />
          </svg>
        );
      case 5:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '-1px' }}>
            <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2a8 8 0 100 16 8 8 0 000-16zm-5 7h10v2H7v-2zm4.592 4.295l2.7-4.055 1.416.943-3.85 5.776-3.374-2.7.943-1.176 2.165 1.212z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getBackgroundColor()}`}>
      {renderIcon()}
    </div>
  );
};

export default RatingSmiley;