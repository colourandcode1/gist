import React from 'react';
import { useNavigate } from 'react-router-dom';
import RepositorySearchView from '@/components/RepositorySearchView';

const RepositoryPage = () => {
  const navigate = useNavigate();
  
  const handleNavigate = (viewOrPath) => {
    // Handle both old callback format and new path format
    if (typeof viewOrPath === 'string') {
      if (viewOrPath.startsWith('/')) {
        navigate(viewOrPath);
      } else if (viewOrPath === 'repository') {
        navigate('/repository');
      } else if (viewOrPath === 'upload') {
        navigate('/');
      }
    } else if (viewOrPath?.view === 'analysis') {
      // For analysis view, navigate to upload with prefill
      navigate('/', { state: { prefill: viewOrPath } });
    } else if (viewOrPath?.view === 'repository') {
      navigate('/repository');
    } else if (viewOrPath?.view === 'upload') {
      navigate('/');
    }
  };

  return <RepositorySearchView onNavigate={handleNavigate} />;
};

export default RepositoryPage;
