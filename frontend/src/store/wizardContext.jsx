import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkBackendHealth } from '../api/client';

const WizardContext = createContext(null);

export function WizardProvider({ children }) {
  // Navigation chính
  const [activeTab, setActiveTab] = useState('landing'); // 'landing' | 'dashboard' | 'wizard' | 'history' | 'settings'
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [backendMeta, setBackendMeta] = useState(null);

  // Trạng thái Wizard 4 bước
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedDomainDetail, setSelectedDomainDetail] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [rawPrompt, setRawPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState(null);
  const [enableCritic, setEnableCritic] = useState(true);
  const [executionMode, setExecutionMode] = useState('quality');
  const [optimizationResult, setOptimizationResult] = useState(null);

  // Định kỳ kiểm tra backend health
  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      const data = await checkBackendHealth();
      if (!isMounted) return;
      if (data && data.status === 'ok') {
        setBackendStatus('online');
        setBackendMeta(data);
      } else {
        setBackendStatus('offline');
      }
    };

    check();
    const interval = setInterval(check, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Kiểm tra điều kiện có thể chuyển sang bước nào
  const canGoToStep = (targetStep) => {
    if (targetStep === 1) return true;
    if (targetStep === 2) return !!selectedDomain;
    if (targetStep === 3) return !!selectedDomain && !!rawPrompt.trim();
    if (targetStep === 4) return !!selectedDomain && !!rawPrompt.trim() && !!selectedModel;
    return false;
  };

  const goToStep = (targetStep) => {
    if (canGoToStep(targetStep)) {
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const nextStep = () => {
    if (currentStep < 4 && canGoToStep(currentStep + 1)) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedDomain(null);
    setSelectedDomainDetail(null);
    setSelectedTemplate(null);
    setRawPrompt('');
    setSelectedModel(null);
    setOptimizationResult(null);
  };

  const value = {
    activeTab,
    setActiveTab,
    backendStatus,
    backendMeta,
    currentStep,
    selectedDomain,
    setSelectedDomain,
    selectedDomainDetail,
    setSelectedDomainDetail,
    selectedTemplate,
    setSelectedTemplate,
    rawPrompt,
    setRawPrompt,
    selectedModel,
    setSelectedModel,
    enableCritic,
    setEnableCritic,
    executionMode,
    setExecutionMode,
    optimizationResult,
    setOptimizationResult,
    canGoToStep,
    goToStep,
    nextStep,
    prevStep,
    resetWizard,
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard phải được sử dụng bên trong WizardProvider');
  }
  return context;
}
