/**
 * Interactive JSON Editor for MCP Config
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  TextField,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface InteractiveJsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
}

// Color palette for servers - enhanced for better distinction
const serverColors = [
  '#e3f2fd', // blue
  '#f3e5f5', // purple
  '#e8f5e9', // green
  '#fff3e0', // orange
  '#fce4ec', // pink
  '#e0f2f1', // cyan
  '#f1f8e9', // lime
  '#fffde7', // yellow
  '#efebe9', // brown
  '#eceff1'  // grey
];

// Darker accent colors for borders
const serverAccentColors = [
  '#1976d2', // blue
  '#7b1fa2', // purple
  '#388e3c', // green
  '#f57c00', // orange
  '#c2185b', // pink
  '#00796b', // cyan
  '#689f38', // lime
  '#fbc02d', // yellow
  '#5d4037', // brown
  '#455a64'  // grey
];

// Editable Text Component
interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  readOnly: boolean;
  isKey?: boolean;
  placeholder?: string;
}

const EditableText: React.FC<EditableTextProps> = ({
  value,
  onChange,
  onBlur,
  readOnly,
  isKey = false,
  placeholder = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (readOnly) {
    // For very long values (like JWT tokens), show truncated version
    const displayValue = value.length > 100 ? 
      `${value.substring(0, 50)}...${value.substring(value.length - 20)}` : 
      value;
    
    return (
      <span 
        style={{ 
          color: isKey ? '#d73a49' : '#032f62',
          wordWrap: 'break-word',
          wordBreak: 'break-word',
          maxWidth: '100%',
          display: 'inline-block'
        }}
        title={value.length > 100 ? value : undefined} // Show full value on hover
      >
        {displayValue}
      </span>
    );
  }

  if (isEditing) {
    return (
      <TextField
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        size="small"
        variant="standard"
        placeholder={placeholder}
        sx={{
          '& .MuiInput-input': {
            fontSize: '14px',
            fontFamily: 'Monaco, Consolas, monospace',
            padding: '2px 4px',
            color: isKey ? '#d73a49' : '#032f62',
            wordWrap: 'break-word',
            wordBreak: 'break-word'
          }
        }}
      />
    );
  }

  // For editable state, also show truncated version for long values
  const displayValue = (value || placeholder).length > 100 ? 
    `${(value || placeholder).substring(0, 50)}...${(value || placeholder).substring((value || placeholder).length - 20)}` : 
    (value || placeholder);

  return (
    <span
      onClick={() => setIsEditing(true)}
      style={{
        color: isKey ? '#d73a49' : '#032f62',
        cursor: 'pointer',
        borderBottom: '1px dashed #ccc',
        paddingBottom: '1px',
        wordWrap: 'break-word',
        wordBreak: 'break-word',
        maxWidth: '100%',
        display: 'inline-block'
      }}
      title={(value || placeholder).length > 100 ? (value || placeholder) : undefined}
    >
      {displayValue}
    </span>
  );
};

// Add Button Component
interface AddButtonProps {
  onClick: () => void;
  tooltip: string;
  size?: 'small' | 'medium';
}

const AddButton: React.FC<AddButtonProps> = ({ onClick, tooltip, size = 'small' }) => (
  <Tooltip title={tooltip}>
    <IconButton 
      onClick={onClick}
      size={size}
      sx={{ 
        padding: '2px',
        color: '#4caf50',
        '&:hover': { backgroundColor: '#e8f5e9' }
      }}
    >
      <AddIcon fontSize={size} />
    </IconButton>
  </Tooltip>
);

// Delete Button Component
interface DeleteButtonProps {
  onClick: () => void;
  tooltip: string;
  size?: 'small' | 'medium';
}

const DeleteButton: React.FC<DeleteButtonProps> = ({ onClick, tooltip, size = 'small' }) => (
  <Tooltip title={tooltip}>
    <IconButton 
      onClick={onClick}
      size={size}
      sx={{ 
        padding: '2px',
        color: '#f44336',
        '&:hover': { backgroundColor: '#ffebee' }
      }}
    >
      <DeleteIcon fontSize={size} />
    </IconButton>
  </Tooltip>
);

export const InteractiveJsonEditor: React.FC<InteractiveJsonEditorProps> = ({
  value,
  onChange,
  readOnly
}) => {
  const [config, setConfig] = useState<any>({});
  const [serverColorMap, setServerColorMap] = useState<Record<string, { bg: string; accent: string }>>({});

  // Parse JSON on mount and when value changes
  useEffect(() => {
    try {
      const parsed = JSON.parse(value);
      setConfig(parsed);
      
      // Assign colors to servers
      const colorMap: Record<string, { bg: string; accent: string }> = {};
      const servers = Object.keys(parsed.mcpServers || {});
      servers.forEach((server, index) => {
        const colorIndex = index % serverColors.length;
        colorMap[server] = {
          bg: serverColors[colorIndex],
          accent: serverAccentColors[colorIndex]
        };
      });
      setServerColorMap(colorMap);
    } catch (e) {
      // If parsing fails, initialize with empty config
      setConfig({ mcpServers: {} });
    }
  }, [value]);

  // Update the parent component
  const updateConfig = (newConfig: any) => {
    setConfig(newConfig);
    onChange(JSON.stringify(newConfig, null, 2));
  };

  // Add new server
  const addServer = () => {
    const serverName = `server-${Date.now()}`;
    const newConfig = {
      ...config,
      mcpServers: {
        ...config.mcpServers,
        [serverName]: {
          command: 'node'
        }
      }
    };
    updateConfig(newConfig);
  };

  // Delete server
  const deleteServer = (serverName: string) => {
    const { [serverName]: _, ...rest } = config.mcpServers;
    updateConfig({
      ...config,
      mcpServers: rest
    });
  };

  // Rename server
  const renameServer = (oldName: string, newName: string) => {
    if (oldName === newName) return;
    
    const { [oldName]: serverConfig, ...rest } = config.mcpServers;
    updateConfig({
      ...config,
      mcpServers: {
        ...rest,
        [newName]: serverConfig
      }
    });
  };

  // Update server property
  const updateServerProperty = (serverName: string, property: string, value: any) => {
    updateConfig({
      ...config,
      mcpServers: {
        ...config.mcpServers,
        [serverName]: {
          ...config.mcpServers[serverName],
          [property]: value
        }
      }
    });
  };

  // Add server property
  const addServerProperty = (serverName: string, property: string) => {
    const defaultValues: Record<string, any> = {
      command: 'node',
      args: [],
      env: {}
    };
    
    updateServerProperty(serverName, property, defaultValues[property]);
  };

  // Delete server property
  const deleteServerProperty = (serverName: string, property: string) => {
    const { [property]: _, ...rest } = config.mcpServers[serverName];
    updateConfig({
      ...config,
      mcpServers: {
        ...config.mcpServers,
        [serverName]: rest
      }
    });
  };

  // Add arg
  const addArg = (serverName: string) => {
    const args = config.mcpServers[serverName].args || [];
    updateServerProperty(serverName, 'args', [...args, '']);
  };

  // Update arg
  const updateArg = (serverName: string, index: number, value: string) => {
    const args = [...config.mcpServers[serverName].args];
    args[index] = value;
    updateServerProperty(serverName, 'args', args);
  };

  // Delete arg
  const deleteArg = (serverName: string, index: number) => {
    const args = config.mcpServers[serverName].args.filter((_: any, i: number) => i !== index);
    updateServerProperty(serverName, 'args', args);
  };

  // Add env variable
  const addEnvVar = (serverName: string) => {
    const envVarName = `ENV_VAR_${Date.now()}`;
    const env = config.mcpServers[serverName].env || {};
    updateServerProperty(serverName, 'env', {
      ...env,
      [envVarName]: 'value'
    });
  };

  // Update env variable
  const updateEnvVar = (serverName: string, oldKey: string, newKey: string, value: string) => {
    const env = { ...config.mcpServers[serverName].env };
    if (oldKey !== newKey) {
      delete env[oldKey];
    }
    env[newKey] = value;
    updateServerProperty(serverName, 'env', env);
  };

  // Delete env variable
  const deleteEnvVar = (serverName: string, key: string) => {
    const { [key]: _, ...rest } = config.mcpServers[serverName].env;
    updateServerProperty(serverName, 'env', rest);
  };

  // Box indentation with clean hierarchy
  const getIndentForBox = (level: number) => ({
    paddingLeft: `${level * 28}px`,
    position: 'relative',
    minHeight: '30px'
  });
  
  // Perfect indentation system with text wrapping
  const getIndentForDiv = (level: number): React.CSSProperties => ({
    paddingLeft: `${level * 28}px`,
    minHeight: '30px',
    display: 'flex',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    position: 'relative',
    backgroundColor: level > 2 ? 'rgba(0,0,0,0.03)' : 'transparent',
    borderLeft: level > 0 ? `1px solid rgba(0,0,0,0.1)` : 'none',
    marginLeft: level > 0 ? `${(level-1) * 2}px` : '0px',
    wordWrap: 'break-word',
    wordBreak: 'break-word',
    overflow: 'hidden',
    maxWidth: '100%',
    boxSizing: 'border-box'
  });

  return (
    <Box
      sx={{
        fontFamily: 'Monaco, Consolas, monospace',
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#24292e',
        backgroundColor: '#fafafa',
        padding: '20px',
        borderRadius: '8px',
        overflow: 'auto',
        border: '1px solid #e1e4e8',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        position: 'relative',
        maxWidth: '100%',
        wordWrap: 'break-word'
      }}
    >
      <div>{'{'}</div>
      <div style={getIndentForDiv(1)}>
        <span>"mcpServers": {'{'}</span>
        {!readOnly && (
          <AddButton
            onClick={addServer}
            tooltip="Add new server"
          />
        )}
      </div>
      
      {Object.entries(config.mcpServers || {}).map(([serverName, serverConfig]: [string, any], serverIndex) => (
        <Box key={serverName} sx={{ 
          backgroundColor: serverColorMap[serverName]?.bg, 
          marginY: '4px', 
          paddingY: '6px',
          paddingX: '8px',
          borderLeft: `4px solid ${serverColorMap[serverName]?.accent}`,
          borderRadius: '6px',
          border: '1px solid rgba(0,0,0,0.05)',
          overflow: 'hidden',
          wordWrap: 'break-word',
          wordBreak: 'break-word',
          '&:hover': {
            backgroundColor: serverColorMap[serverName]?.bg,
            filter: 'brightness(0.98)',
            borderColor: serverColorMap[serverName]?.accent
          },
          '& > div': {
            maxWidth: '100%',
            overflow: 'hidden',
            wordWrap: 'break-word'
          }
        }}>
          <div style={getIndentForDiv(2)}>
            <span>"</span>
            <EditableText
              value={serverName}
              onChange={(newName) => renameServer(serverName, newName)}
              readOnly={readOnly}
              isKey
            />
            <span>": {'{'}</span>
            <Chip 
              size="small" 
              sx={{ 
                height: '20px', 
                backgroundColor: serverColorMap[serverName]?.accent,
                color: 'white',
                marginLeft: '8px',
                '& .MuiChip-label': { padding: '0 8px', fontSize: '11px', fontWeight: 500 }
              }} 
              label={serverName} 
            />
            {!readOnly && (
              <>
                <AddButton
                  onClick={() => {
                    const availableProps = ['command', 'args', 'env'].filter(
                      prop => !serverConfig.hasOwnProperty(prop)
                    );
                    if (availableProps.length > 0) {
                      addServerProperty(serverName, availableProps[0]);
                    }
                  }}
                  tooltip="Add property"
                />
                <DeleteButton
                  onClick={() => deleteServer(serverName)}
                  tooltip="Delete server"
                />
              </>
            )}
          </div>
          
          {/* Command */}
          {serverConfig.command !== undefined && (
            <div style={getIndentForDiv(3)}>
              <span>"command": "</span>
              <EditableText
                value={serverConfig.command}
                onChange={(value) => updateServerProperty(serverName, 'command', value)}
                readOnly={readOnly}
              />
              <span>"</span>
              {!readOnly && Object.keys(serverConfig).length > 1 && (
                <DeleteButton
                  onClick={() => deleteServerProperty(serverName, 'command')}
                  tooltip="Delete command"
                />
              )}
              <span>{Object.keys(serverConfig).indexOf('command') < Object.keys(serverConfig).length - 1 && ','}</span>
            </div>
          )}
          
          {/* Args */}
          {serverConfig.args !== undefined && (
            <>
              <div style={getIndentForDiv(3)}>
                <span>"args": [</span>
                {!readOnly && (
                  <AddButton
                    onClick={() => addArg(serverName)}
                    tooltip="Add argument"
                  />
                )}
              </div>
              {serverConfig.args.map((arg: string, index: number) => (
                <div key={index} style={getIndentForDiv(4)}>
                  <span>"</span>
                  <EditableText
                    value={arg}
                    onChange={(value) => updateArg(serverName, index, value)}
                    readOnly={readOnly}
                  />
                  <span>"</span>
                  {!readOnly && (
                    <DeleteButton
                      onClick={() => deleteArg(serverName, index)}
                      tooltip="Delete argument"
                    />
                  )}
                  <span>{index < serverConfig.args.length - 1 && ','}</span>
                </div>
              ))}
              <div style={getIndentForDiv(3)}>
                <span>]{Object.keys(serverConfig).indexOf('args') < Object.keys(serverConfig).length - 1 && ','}</span>
              </div>
            </>
          )}
          
          {/* Env */}
          {serverConfig.env !== undefined && (
            <>
              <div style={getIndentForDiv(3)}>
                <span>"env": {'{'}</span>
                {!readOnly && (
                  <AddButton
                    onClick={() => addEnvVar(serverName)}
                    tooltip="Add environment variable"
                  />
                )}
              </div>
              {Object.entries(serverConfig.env).map(([key, val]: [string, any], index, arr) => (
                <div key={key} style={getIndentForDiv(4)}>
                  <span>"</span>
                  <EditableText
                    value={key}
                    onChange={(newKey) => updateEnvVar(serverName, key, newKey, val)}
                    readOnly={readOnly}
                    isKey
                  />
                  <span>": "</span>
                  <EditableText
                    value={val}
                    onChange={(value) => updateEnvVar(serverName, key, key, value)}
                    readOnly={readOnly}
                  />
                  <span>"</span>
                  {!readOnly && (
                    <DeleteButton
                      onClick={() => deleteEnvVar(serverName, key)}
                      tooltip="Delete environment variable"
                    />
                  )}
                  <span>{index < arr.length - 1 && ','}</span>
                </div>
              ))}
              <div style={getIndentForDiv(3)}>
                <span>{'}'}{Object.keys(serverConfig).indexOf('env') < Object.keys(serverConfig).length - 1 && ','}</span>
              </div>
            </>
          )}
          
          <div style={getIndentForDiv(2)}>
            <span>{'}'}{serverIndex < Object.keys(config.mcpServers || {}).length - 1 && ','}</span>
          </div>
        </Box>
      ))}
      
      <div style={getIndentForDiv(1)}>
        <span>{'}'}</span>
      </div>
      
      {/* Global Shortcut */}
      {config.globalShortcut !== undefined && (
        <>
          <div>,</div>
          <div style={getIndentForDiv(1)}>
            <span>"globalShortcut": "</span>
            <EditableText
              value={config.globalShortcut || ''}
              onChange={(value) => updateConfig({ ...config, globalShortcut: value })}
              readOnly={readOnly}
            />
            <span>"</span>
          </div>
        </>
      )}
      
      <div>{'}'}</div>
    </Box>
  );
};

export default InteractiveJsonEditor;