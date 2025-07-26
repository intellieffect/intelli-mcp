/**
 * JSON Config Editor - 초간단 버전
 * claude_desktop_config.json 파일 직접 편집
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Code as FormatIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

export const JsonConfigEditor: React.FC = () => {
  console.log('JsonConfigEditor: Component mounting...');
  
  const [isEditing, setIsEditing] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configPath, setConfigPath] = useState<string>('');
  
  console.log('JsonConfigEditor: State initialized, loading:', loading);

  // 초기 설정 로드
  useEffect(() => {
    const loadConfig = async () => {
      try {
        console.log('JsonConfigEditor: Starting to load config...');
        setLoading(true);
        setError(null);
        
        // 설정 파일 경로 가져오기
        const configPathResult = await window.electronAPI.getConfigPath();
        console.log('JsonConfigEditor: Config path result:', configPathResult);
        
        if (!configPathResult.success) {
          throw new Error(configPathResult.error || 'Failed to get config path');
        }
        
        setConfigPath(configPathResult.data);
        
        // 파일 읽기
        const fileResult = await window.electronAPI.readFile(configPathResult.data);
        console.log('JsonConfigEditor: File read result:', fileResult);
        
        if (!fileResult.success) {
          if (fileResult.error?.includes('ENOENT')) {
            // 파일이 없으면 기본 설정으로 시작
            const defaultConfig = {
              mcpServers: {}
            };
            setJsonText(JSON.stringify(defaultConfig, null, 2));
          } else {
            throw new Error(fileResult.error || 'Failed to read config file');
          }
        } else {
          setJsonText(fileResult.data);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('JsonConfigEditor: Load config error:', error);
        setError(error instanceof Error ? error.message : 'Failed to load configuration');
        setLoading(false);
      }
    };
    
    loadConfig();
  }, []);

  // 편집 시작
  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  // 편집 취소
  const handleCancel = async () => {
    setIsEditing(false);
    
    // 원본 파일에서 다시 읽어오기
    try {
      const fileResult = await window.electronAPI.readFile(configPath);
      if (fileResult.success) {
        setJsonText(fileResult.data);
      }
    } catch (error) {
      console.error('Failed to reload original content:', error);
    }
  };

  // JSON 포맷 정리
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (e) {
      setError('Invalid JSON format');
    }
  };

  // 저장
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // JSON 파싱 체크
      JSON.parse(jsonText);
      
      // 실제 파일에 쓰기
      const result = await window.electronAPI.writeFile(configPath, jsonText);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save');
      }
      
      setIsEditing(false);
      setSaving(false);
    } catch (error) {
      setSaving(false);
      setError(error instanceof Error ? error.message : 'Save failed');
    }
  };

  if (loading) {
    return (
      <Box p={2}>
        <Typography>Loading configuration...</Typography>
        <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
          <Typography variant="caption" component="div">
            디버그 정보:
          </Typography>
          <Typography variant="caption" component="div">
            • electronAPI 존재: {window.electronAPI ? '✅' : '❌'}
          </Typography>
          <Typography variant="caption" component="div">
            • getConfigPath 함수: {window.electronAPI?.getConfigPath ? '✅' : '❌'}
          </Typography>
          <Typography variant="caption" component="div">
            • readFile 함수: {window.electronAPI?.readFile ? '✅' : '❌'}
          </Typography>
          <Typography variant="caption" component="div">
            • 설정 파일 경로: {configPath || '미확인'}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box p={2}>
      {/* 상단 버튼들 */}
      <Box display="flex" gap={1} mb={2} alignItems="center">
        <Typography variant="h6" flexGrow={1}>
          claude_desktop_config.json
        </Typography>
        {configPath && (
          <Typography variant="caption" color="text.secondary">
            {configPath}
          </Typography>
        )}
        
        {!isEditing ? (
          <Button
            startIcon={<EditIcon />}
            variant="contained"
            onClick={handleEdit}
          >
            Edit
          </Button>
        ) : (
          <>
            <Button
              startIcon={<FormatIcon />}
              variant="outlined"
              onClick={handleFormat}
              disabled={saving}
            >
              Format JSON
            </Button>
            <Button
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              startIcon={<SaveIcon />}
              variant="contained"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </>
        )}
      </Box>

      {/* 에러 표시 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* JSON 에디터 */}
      <Paper variant="outlined" sx={{ p: 0 }}>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          readOnly={!isEditing}
          style={{
            width: '100%',
            height: '600px',
            border: 'none',
            outline: 'none',
            padding: '16px',
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            fontSize: '14px',
            lineHeight: '1.5',
            resize: 'vertical',
            backgroundColor: isEditing ? '#fff' : '#f5f5f5',
            color: isEditing ? '#000' : '#666',
          }}
          placeholder="Loading configuration..."
        />
      </Paper>
    </Box>
  );
};

export default JsonConfigEditor;