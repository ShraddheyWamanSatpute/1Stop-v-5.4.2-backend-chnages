import React from 'react';
import ReusableModal from '../reusable/ReusableModal';
import ImprovedAssistant from './ImprovedAssistant';

interface AssistantWidgetProps {
  onClose: () => void;
}

const AssistantWidget: React.FC<AssistantWidgetProps> = ({ onClose }) => {
  return (
    <ReusableModal
      open={true}
      onClose={onClose}
      title="AI Assistant"
      initialSize={{ width: 500, height: 700 }}
      minSize={{ width: 400, height: 500 }}
      maxSize={{ width: 1000, height: 900 }}
      centerOnOpen={true}
      resizable={true}
      draggable={true}
      showMinimizeButton={true}
    >
      <ImprovedAssistant onClose={onClose} />
    </ReusableModal>
  );
};

export default AssistantWidget;