import React from 'react';
import { useWizard } from '../store/wizardContext';

const STEPS = [
  {
    step: 1,
    title: 'Lĩnh vực',
    desc: 'Chọn chuyên ngành mục tiêu'
  },
  {
    step: 2,
    title: 'Yêu cầu',
    desc: 'Chọn template & Chấm điểm'
  },
  {
    step: 3,
    title: 'Mô hình',
    desc: 'Khuyến nghị LLM tối ưu'
  },
  {
    step: 4,
    title: 'Kết quả',
    desc: 'Prompt tối ưu & Chạy AI'
  }
];

export default function Stepper() {
  const { currentStep, goToStep, canGoToStep } = useWizard();

  return (
    <div className="stepper-wrapper">
      <div className="stepper-container">
        {STEPS.map((item, index) => {
          const isCompleted = item.step < currentStep;
          const isActive = item.step === currentStep;
          const isAllowed = canGoToStep(item.step);

          return (
            <React.Fragment key={item.step}>
              {/* Connector line between steps */}
              {index > 0 && (
                <div
                  className={`stepper-connector ${
                    item.step <= currentStep ? 'active' : ''
                  }`}
                />
              )}

              {/* Step item */}
              <div
                className={`stepper-item ${isActive ? 'active' : ''} ${
                  isCompleted ? 'completed' : ''
                } ${isAllowed ? 'clickable' : 'disabled'}`}
                onClick={() => {
                  if (isAllowed) {
                    goToStep(item.step);
                  }
                }}
                title={
                  !isAllowed
                    ? `Hoàn thành các bước trước để mở khóa bước ${item.step}`
                    : `Chuyển tới ${item.title}`
                }
              >
                <div className="stepper-circle">
                  {isCompleted ? (
                    <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span>{item.step}</span>
                  )}
                </div>

                <div className="stepper-content">
                  <div className="stepper-title">{item.title}</div>
                  <div className="stepper-desc">{item.desc}</div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
