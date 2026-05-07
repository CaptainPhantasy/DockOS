import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Server, Thermometer, Hash, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { LLMProvider } from '../types';
import { PROVIDER_CONFIGS } from '../types';
import { validateConfig, getDefaultConfigForProvider } from '../services/llm';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const llmConfig = useStore((s) => s.llmConfig);
  const updateLLMConfig = useStore((s) => s.updateLLMConfig);
  const screens = useStore((s) => s.screens);
  const addScreen = useStore((s) => s.addScreen);
  const removeScreen = useStore((s) => s.removeScreen);
  const renameScreen = useStore((s) => s.renameScreen);

  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [screenNames, setScreenNames] = useState<string[]>([]);

  useEffect(() => {
    setScreenNames(screens.map((s) => s.name));
  }, [screens]);

  const handleProviderChange = (provider: LLMProvider) => {
    const defaults = getDefaultConfigForProvider(provider);
    updateLLMConfig(defaults);
  };

  const handleTestConnection = async () => {
    const error = validateConfig(llmConfig);
    if (error) {
      setTestResult('error');
      setTestMessage(error);
      return;
    }

    setTestResult('idle');
    setTestMessage('Testing connection...');

    try {
      const response = await fetch(
        llmConfig.provider === 'anthropic'
          ? `${llmConfig.baseUrl}/v1/messages`
          : `${llmConfig.baseUrl}/v1/models`,
        {
          method: 'GET',
          headers: llmConfig.provider === 'anthropic'
            ? {
                'x-api-key': llmConfig.apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
              }
            : {
                Authorization: `Bearer ${llmConfig.apiKey}`,
              },
        }
      );

      if (response.ok) {
        setTestResult('success');
        setTestMessage('Connection successful!');
      } else {
        setTestResult('error');
        setTestMessage(`Connection failed: ${response.status}`);
      }
    } catch (err) {
      setTestResult('error');
      setTestMessage(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const handleExportConfig = () => {
    const data = {
      screens,
      llmConfig: { ...llmConfig, apiKey: '***REDACTED***' },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'streamdock-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.screens && Array.isArray(data.screens)) {
            // Import screens
            data.screens.forEach((screen: { name?: string }) => {
              addScreen(screen.name || 'Imported Screen');
            });
          }
        } catch {
          alert('Invalid configuration file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-content glass-panel settings-modal"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Settings</h3>
              <motion.button
                className="modal-close"
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={18} />
              </motion.button>
            </div>

            <div className="modal-body settings-body">
              {/* LLM Provider */}
              <div className="settings-section">
                <h4 className="settings-section-title">LLM Provider</h4>
                <div className="provider-grid">
                  {(Object.entries(PROVIDER_CONFIGS) as [LLMProvider, typeof PROVIDER_CONFIGS[LLMProvider]][]).map(
                    ([key, config]) => (
                      <motion.button
                        key={key}
                        className={`provider-btn ${llmConfig.provider === key ? 'active' : ''}`}
                        onClick={() => handleProviderChange(key)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <span className="provider-name">{config.name}</span>
                        <span className="provider-model">{config.defaultModel}</span>
                      </motion.button>
                    )
                  )}
                </div>
              </div>

              {/* API Key */}
              <div className="settings-section">
                <h4 className="settings-section-title">
                  <Key size={14} /> API Key
                </h4>
                <div className="api-key-row">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    className="field-input"
                    value={llmConfig.apiKey}
                    onChange={(e) => updateLLMConfig({ apiKey: e.target.value })}
                    placeholder="Enter your API key..."
                  />
                  <motion.button
                    className="btn-icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </motion.button>
                </div>
              </div>

              {/* Base URL */}
              <div className="settings-section">
                <h4 className="settings-section-title">
                  <Server size={14} /> Base URL
                </h4>
                <input
                  type="text"
                  className="field-input"
                  value={llmConfig.baseUrl}
                  onChange={(e) => updateLLMConfig({ baseUrl: e.target.value })}
                  placeholder="https://api.example.com"
                />
              </div>

              {/* Model */}
              <div className="settings-section">
                <h4 className="settings-section-title">
                  <Hash size={14} /> Model
                </h4>
                <input
                  type="text"
                  className="field-input"
                  value={llmConfig.model}
                  onChange={(e) => updateLLMConfig({ model: e.target.value })}
                  placeholder="Model name..."
                />
              </div>

              {/* Temperature */}
              <div className="settings-section">
                <h4 className="settings-section-title">
                  <Thermometer size={14} /> Temperature: {llmConfig.temperature}
                </h4>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={llmConfig.temperature}
                  onChange={(e) => updateLLMConfig({ temperature: parseFloat(e.target.value) })}
                  className="field-range"
                />
              </div>

              {/* Max Tokens */}
              <div className="settings-section">
                <h4 className="settings-section-title">Max Tokens</h4>
                <input
                  type="number"
                  className="field-input"
                  value={llmConfig.maxTokens}
                  onChange={(e) => updateLLMConfig({ maxTokens: parseInt(e.target.value) || 2048 })}
                  min={1}
                  max={32768}
                />
              </div>

              {/* Test Connection */}
              <div className="settings-section">
                <motion.button
                  className="btn-secondary w-full"
                  onClick={handleTestConnection}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Test Connection
                </motion.button>
                {testResult !== 'idle' && (
                  <motion.div
                    className={`test-result ${testResult}`}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {testResult === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                    {testMessage}
                  </motion.div>
                )}
              </div>

              {/* Screen Management */}
              <div className="settings-section">
                <h4 className="settings-section-title">Screen Management</h4>
                <div className="screen-list">
                  {screens.map((screen, index) => (
                    <div key={screen.id} className="screen-list-item">
                      <input
                        type="text"
                        className="field-input screen-name-input"
                        value={screenNames[index] || screen.name}
                        onChange={(e) => {
                          const newNames = [...screenNames];
                          newNames[index] = e.target.value;
                          setScreenNames(newNames);
                        }}
                        onBlur={() => renameScreen(index, screenNames[index] || screen.name)}
                      />
                      {screens.length > 1 && (
                        <motion.button
                          className="btn-icon btn-icon-danger"
                          onClick={() => removeScreen(index)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <X size={14} />
                        </motion.button>
                      )}
                    </div>
                  ))}
                </div>
                <motion.button
                  className="btn-secondary w-full"
                  onClick={() => addScreen()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ marginTop: 8 }}
                >
                  + Add Screen
                </motion.button>
              </div>

              {/* Import/Export */}
              <div className="settings-section">
                <h4 className="settings-section-title">Import / Export</h4>
                <div className="import-export-row">
                  <motion.button
                    className="btn-secondary flex-1"
                    onClick={handleExportConfig}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Export Config
                  </motion.button>
                  <motion.button
                    className="btn-secondary flex-1"
                    onClick={handleImportConfig}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Import Config
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <motion.button
                className="btn-primary"
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Done
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Settings;
