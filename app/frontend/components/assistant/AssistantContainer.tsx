import React from 'react';
import { useAssistant } from '../../../backend/context/AssistantContext';
import AssistantWidget from './AssistantWidget';

const AssistantContainer: React.FC = () => {
  const { isOpen, closeAssistant } = useAssistant();

  return isOpen ? <AssistantWidget onClose={closeAssistant} /> : null;
};

export default AssistantContainer;