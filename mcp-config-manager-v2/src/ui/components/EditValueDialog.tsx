/**
 * Edit Value Dialog Component
 * 값을 편집하기 위한 모달 다이얼로그
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  ContentCopy as CopyIcon,
  ContentPaste as PasteIcon,
} from '@mui/icons-material';

interface EditValueDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  value: string;
  title?: string;
  isKey?: boolean;
  placeholder?: string;
  helperText?: string;
  maxLength?: number;
  multiline?: boolean;
}

export const EditValueDialog: React.FC<EditValueDialogProps> = ({
  open,
  onClose,
  onSave,
  value,
  title = '값 편집',
  isKey = false,
  placeholder = '값을 입력하세요',
  helperText,
  maxLength,
  multiline = true,
}) => {
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const textFieldRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  // Dialog가 열릴 때 값 초기화 및 포커스
  useEffect(() => {
    if (open) {
      setEditValue(value);
      setError(null);
      
      // 포커스 및 텍스트 선택
      setTimeout(() => {
        if (textFieldRef.current) {
          textFieldRef.current.focus();
          textFieldRef.current.select();
        }
      }, 100);
    }
  }, [open, value]);

  // 값 검증
  const validateValue = (val: string): boolean => {
    if (isKey && val.trim() === '') {
      setError('키는 비어있을 수 없습니다');
      return false;
    }
    
    if (isKey && /[^a-zA-Z0-9_-]/.test(val)) {
      setError('키는 영문, 숫자, -, _ 만 사용 가능합니다');
      return false;
    }

    if (maxLength && val.length > maxLength) {
      setError(`최대 ${maxLength}자까지 입력 가능합니다`);
      return false;
    }

    setError(null);
    return true;
  };

  // 저장 처리
  const handleSave = () => {
    if (validateValue(editValue)) {
      onSave(editValue);
      onClose();
    }
  };

  // 취소 처리
  const handleCancel = () => {
    setEditValue(value);
    setError(null);
    onClose();
  };

  // 키보드 단축키
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // 복사하기
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editValue);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // 붙여넣기
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setEditValue(text);
      validateValue(text);
    } catch (err) {
      console.error('Failed to paste:', err);
    }
  };

  // 값 표시 정보
  const getValueInfo = () => {
    const length = editValue.length;
    const lines = editValue.split('\n').length;
    
    if (editValue.length > 100) {
      return (
        <Box display="flex" gap={1} mt={1}>
          <Chip size="small" label={`${length}자`} />
          {multiline && lines > 1 && <Chip size="small" label={`${lines}줄`} />}
        </Box>
      );
    }
    return null;
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      aria-labelledby="edit-dialog-title"
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: multiline ? 400 : 'auto',
        }
      }}
    >
      <DialogTitle id="edit-dialog-title">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="span">
            {title}
          </Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={handleCancel}
            aria-label="닫기"
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ pt: 2 }}>
          <TextField
            inputRef={textFieldRef}
            fullWidth
            multiline={multiline}
            rows={multiline ? 10 : 1}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              validateValue(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            error={!!error}
            helperText={error || helperText}
            variant="outlined"
            autoFocus
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '14px',
                lineHeight: 1.6,
              }
            }}
            InputProps={{
              endAdornment: (
                <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                  <IconButton
                    size="small"
                    onClick={handleCopy}
                    title="복사 (현재 값)"
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={handlePaste}
                    title="붙여넣기"
                  >
                    <PasteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )
            }}
          />
          {getValueInfo()}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleCancel}
          color="inherit"
          size="large"
        >
          취소 (Esc)
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={!!error}
          size="large"
          sx={{ minWidth: 120 }}
        >
          저장 (Ctrl+Enter)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditValueDialog;