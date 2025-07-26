/**
 * Server edit dialog component with comprehensive form validation and accessibility
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Divider,
  InputAdornment,
  Tooltip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandIcon,
  Help as HelpIcon,
  FileCopy as CopyIcon,
  Visibility as ShowIcon,
  VisibilityOff as HideIcon,
  Warning as WarningIcon,
  CheckCircle as ValidIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import type { MCPServer, CreateServerInput, UpdateServerInput } from '@core/domain/entities/server';
import type { UUID } from '@shared/types/branded';

// Component props
interface ServerEditDialogProps {
  readonly open: boolean;
  readonly server?: MCPServer | null;
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly onClose: () => void;
  readonly onSave: (input: CreateServerInput | UpdateServerInput) => void;
  readonly onValidate?: (input: Partial<CreateServerInput | UpdateServerInput>) => Promise<ValidationResult>;
  readonly 'data-testid'?: string;
}

// Validation result
interface ValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyMap<string, string>;
  readonly warnings?: ReadonlyMap<string, string>;
}

// Form data interface
interface FormData {
  readonly name: string;
  readonly description: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly workingDirectory: string;
  readonly environment: ReadonlyMap<string, string>;
  readonly tags: readonly string[];
  readonly autoStart: boolean;
  readonly restartOnCrash: boolean;
  readonly maxRestarts: number;
  readonly timeout: number;
  readonly showAdvanced: boolean;
}

// Environment variable entry
interface EnvironmentEntry {
  readonly key: string;
  readonly value: string;
  readonly hidden: boolean;
}

// Initial form data
const getInitialFormData = (server?: MCPServer | null): FormData => ({
  name: server?.name || '',
  description: server?.description || '',
  command: server?.configuration.command || '',
  args: server?.configuration.args || [],
  workingDirectory: server?.configuration.workingDirectory || '',
  environment: server?.configuration.environment || new Map(),
  tags: server?.tags || [],
  autoStart: server?.configuration.autoStart || false,
  restartOnCrash: server?.configuration.restartOnCrash || true,
  maxRestarts: server?.configuration.maxRestarts || 3,
  timeout: server?.configuration.timeout || 30000,
  showAdvanced: false,
});

export const ServerEditDialog: React.FC<ServerEditDialogProps> = ({
  open,
  server,
  loading = false,
  error,
  onClose,
  onSave,
  onValidate,
  'data-testid': testId,
}) => {
  // State
  const [formData, setFormData] = useState<FormData>(() => getInitialFormData(server));
  const [validation, setValidation] = useState<ValidationResult>({ valid: true, errors: new Map() });
  const [isDirty, setIsDirty] = useState(false);
  const [newArg, setNewArg] = useState('');
  const [newTag, setNewTag] = useState('');
  const [environmentEntries, setEnvironmentEntries] = useState<EnvironmentEntry[]>([]);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [showEnvValues, setShowEnvValues] = useState<Set<string>>(new Set());

  const isEditMode = Boolean(server);
  const title = isEditMode ? `Edit Server: ${server?.name}` : 'Create New Server';

  // Convert environment map to entries
  useEffect(() => {
    const entries: EnvironmentEntry[] = Array.from(formData.environment.entries()).map(([key, value]) => ({
      key,
      value,
      hidden: key.toLowerCase().includes('password') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('token'),
    }));
    setEnvironmentEntries(entries);
  }, [formData.environment]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      const initialData = getInitialFormData(server);
      setFormData(initialData);
      setIsDirty(false);
      setNewArg('');
      setNewTag('');
      setNewEnvKey('');
      setNewEnvValue('');
      setShowEnvValues(new Set());
    }
  }, [open, server]);

  // Validation
  const validateForm = useCallback(async (data: FormData): Promise<ValidationResult> => {
    const errors = new Map<string, string>();
    const warnings = new Map<string, string>();

    // Required fields
    if (!data.name.trim()) {
      errors.set('name', 'Server name is required');
    } else if (data.name.length < 3) {
      errors.set('name', 'Server name must be at least 3 characters');
    }

    if (!data.command.trim()) {
      errors.set('command', 'Command is required');
    }

    // Validate timeout
    if (data.timeout < 1000) {
      errors.set('timeout', 'Timeout must be at least 1000ms');
    } else if (data.timeout > 300000) {
      warnings.set('timeout', 'Timeout is very high (>5 minutes)');
    }

    // Validate max restarts
    if (data.maxRestarts < 0) {
      errors.set('maxRestarts', 'Max restarts cannot be negative');
    } else if (data.maxRestarts > 10) {
      warnings.set('maxRestarts', 'High restart count may indicate configuration issues');
    }

    // External validation
    if (onValidate && errors.size === 0) {
      try {
        const input = isEditMode
          ? {
              name: data.name,
              description: data.description || undefined,
              configuration: {
                command: data.command,
                args: [...data.args],
                workingDirectory: data.workingDirectory || undefined,
                environment: data.environment,
                autoStart: data.autoStart,
                restartOnCrash: data.restartOnCrash,
                maxRestarts: data.maxRestarts,
                timeout: data.timeout,
              },
              tags: [...data.tags],
            } as UpdateServerInput
          : {
              name: data.name,
              description: data.description || undefined,
              configuration: {
                command: data.command,
                args: [...data.args],
                workingDirectory: data.workingDirectory || undefined,
                environment: data.environment,
                autoStart: data.autoStart,
                restartOnCrash: data.restartOnCrash,
                maxRestarts: data.maxRestarts,
                timeout: data.timeout,
              },
              tags: [...data.tags],
            } as CreateServerInput;

        const externalResult = await onValidate(input);
        for (const [key, value] of externalResult.errors) {
          errors.set(key, value);
        }
        if (externalResult.warnings) {
          for (const [key, value] of externalResult.warnings) {
            warnings.set(key, value);
          }
        }
      } catch (validationError) {
        errors.set('validation', 'Validation failed');
      }
    }

    return {
      valid: errors.size === 0,
      errors,
      warnings,
    };
  }, [onValidate, isEditMode]);

  // Debounced validation
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (isDirty) {
        const result = await validateForm(formData);
        setValidation(result);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData, isDirty, validateForm]);

  // Form field update helper
  const updateFormData = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }, []);

  // Event handlers
  const handleClose = useCallback(() => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const handleSave = useCallback(async () => {
    const result = await validateForm(formData);
    setValidation(result);

    if (result.valid) {
      const input = isEditMode
        ? {
            name: formData.name,
            description: formData.description || undefined,
            configuration: {
              command: formData.command,
              args: [...formData.args],
              workingDirectory: formData.workingDirectory || undefined,
              environment: formData.environment,
              autoStart: formData.autoStart,
              restartOnCrash: formData.restartOnCrash,
              maxRestarts: formData.maxRestarts,
              timeout: formData.timeout,
            },
            tags: [...formData.tags],
          } as UpdateServerInput
        : {
            name: formData.name,
            description: formData.description || undefined,
            configuration: {
              command: formData.command,
              args: [...formData.args],
              workingDirectory: formData.workingDirectory || undefined,
              environment: formData.environment,
              autoStart: formData.autoStart,
              restartOnCrash: formData.restartOnCrash,
              maxRestarts: formData.maxRestarts,
              timeout: formData.timeout,
            },
            tags: [...formData.tags],
          } as CreateServerInput;

      onSave(input);
    }
  }, [formData, validateForm, isEditMode, onSave]);

  // Argument management
  const handleAddArg = useCallback(() => {
    if (newArg.trim()) {
      updateFormData('args', [...formData.args, newArg.trim()]);
      setNewArg('');
    }
  }, [newArg, formData.args, updateFormData]);

  const handleRemoveArg = useCallback((index: number) => {
    updateFormData('args', formData.args.filter((_, i) => i !== index));
  }, [formData.args, updateFormData]);

  // Tag management
  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      updateFormData('tags', [...formData.tags, newTag.trim()]);
      setNewTag('');
    }
  }, [newTag, formData.tags, updateFormData]);

  const handleRemoveTag = useCallback((tag: string) => {
    updateFormData('tags', formData.tags.filter(t => t !== tag));
  }, [formData.tags, updateFormData]);

  // Environment variable management
  const handleAddEnvironmentVariable = useCallback(() => {
    if (newEnvKey.trim() && newEnvValue.trim()) {
      const newEnvironment = new Map(formData.environment);
      newEnvironment.set(newEnvKey.trim(), newEnvValue.trim());
      updateFormData('environment', newEnvironment);
      setNewEnvKey('');
      setNewEnvValue('');
    }
  }, [newEnvKey, newEnvValue, formData.environment, updateFormData]);

  const handleRemoveEnvironmentVariable = useCallback((key: string) => {
    const newEnvironment = new Map(formData.environment);
    newEnvironment.delete(key);
    updateFormData('environment', newEnvironment);
  }, [formData.environment, updateFormData]);

  const toggleEnvValueVisibility = useCallback((key: string) => {
    setShowEnvValues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  // Keyboard handling
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    } else if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      handleSave();
    }
  }, [handleClose, handleSave]);

  // Field validation status
  const getFieldError = (field: string) => validation.errors.get(field);
  const getFieldWarning = (field: string) => validation.warnings?.get(field);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      data-testid={testId}
      onKeyDown={handleKeyDown}
      PaperProps={{
        sx: { minHeight: '70vh' },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Typography variant="h6" component="div">
          {title}
        </Typography>
        
        <IconButton
          onClick={handleClose}
          size="small"
          aria-label="Close dialog"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Basic Information */}
        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            Basic Information
          </Typography>
          
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2} mb={2}>
            <TextField
              label="Server Name"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              error={Boolean(getFieldError('name'))}
              helperText={getFieldError('name')}
              required
              fullWidth
              autoFocus
              inputProps={{
                'aria-describedby': 'name-help',
              }}
            />
            
            <TextField
              label="Command"
              value={formData.command}
              onChange={(e) => updateFormData('command', e.target.value)}
              error={Boolean(getFieldError('command'))}
              helperText={getFieldError('command')}
              required
              fullWidth
              placeholder="e.g., node, python, ./my-server"
            />
          </Box>

          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="Optional description of what this server does..."
            sx={{ mb: 2 }}
          />

          <TextField
            label="Working Directory"
            value={formData.workingDirectory}
            onChange={(e) => updateFormData('workingDirectory', e.target.value)}
            fullWidth
            placeholder="Leave empty to use current directory"
          />
        </Box>

        {/* Arguments */}
        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            Command Arguments
          </Typography>
          
          <Box display="flex" gap={1} mb={2}>
            <TextField
              label="Add argument"
              value={newArg}
              onChange={(e) => setNewArg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddArg()}
              size="small"
              sx={{ flexGrow: 1 }}
            />
            <Button
              onClick={handleAddArg}
              disabled={!newArg.trim()}
              variant="outlined"
              startIcon={<AddIcon />}
            >
              Add
            </Button>
          </Box>

          {formData.args.length > 0 && (
            <Box display="flex" flexWrap="wrap" gap={1}>
              {formData.args.map((arg, index) => (
                <Chip
                  key={index}
                  label={arg}
                  onDelete={() => handleRemoveArg(index)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Tags */}
        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            Tags
          </Typography>
          
          <Box display="flex" gap={1} mb={2}>
            <TextField
              label="Add tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              size="small"
              sx={{ flexGrow: 1 }}
            />
            <Button
              onClick={handleAddTag}
              disabled={!newTag.trim() || formData.tags.includes(newTag.trim())}
              variant="outlined"
              startIcon={<AddIcon />}
            >
              Add
            </Button>
          </Box>

          {formData.tags.length > 0 && (
            <Box display="flex" flexWrap="wrap" gap={1}>
              {formData.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Environment Variables */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Environment Variables ({environmentEntries.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box display="flex" gap={1} mb={2}>
              <TextField
                label="Variable name"
                value={newEnvKey}
                onChange={(e) => setNewEnvKey(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Variable value"
                value={newEnvValue}
                onChange={(e) => setNewEnvValue(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <Button
                onClick={handleAddEnvironmentVariable}
                disabled={!newEnvKey.trim() || !newEnvValue.trim()}
                variant="outlined"
                startIcon={<AddIcon />}
              >
                Add
              </Button>
            </Box>

            {environmentEntries.length > 0 && (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell width={100}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {environmentEntries.map((entry) => (
                      <TableRow key={entry.key}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {entry.key}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography
                              variant="body2"
                              fontFamily="monospace"
                              sx={{
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {entry.hidden && !showEnvValues.has(entry.key)
                                ? '••••••••'
                                : entry.value}
                            </Typography>
                            {entry.hidden && (
                              <IconButton
                                size="small"
                                onClick={() => toggleEnvValueVisibility(entry.key)}
                                aria-label={showEnvValues.has(entry.key) ? 'Hide value' : 'Show value'}
                              >
                                {showEnvValues.has(entry.key) ? <HideIcon /> : <ShowIcon />}
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveEnvironmentVariable(entry.key)}
                            color="error"
                            aria-label={`Remove ${entry.key}`}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Advanced Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Advanced Settings
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2} mb={2}>
              <TextField
                label="Timeout (ms)"
                type="number"
                value={formData.timeout}
                onChange={(e) => updateFormData('timeout', parseInt(e.target.value) || 0)}
                error={Boolean(getFieldError('timeout'))}
                helperText={getFieldError('timeout') || getFieldWarning('timeout')}
                inputProps={{ min: 1000, max: 300000, step: 1000 }}
              />
              
              <TextField
                label="Max Restarts"
                type="number"
                value={formData.maxRestarts}
                onChange={(e) => updateFormData('maxRestarts', parseInt(e.target.value) || 0)}
                error={Boolean(getFieldError('maxRestarts'))}
                helperText={getFieldError('maxRestarts') || getFieldWarning('maxRestarts')}
                inputProps={{ min: 0, max: 20, step: 1 }}
              />
            </Box>

            <Box display="flex" flexDirection="column" gap={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.autoStart}
                    onChange={(e) => updateFormData('autoStart', e.target.checked)}
                  />
                }
                label="Auto-start server"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.restartOnCrash}
                    onChange={(e) => updateFormData('restartOnCrash', e.target.checked)}
                  />
                }
                label="Restart on crash"
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Validation Summary */}
        {(validation.errors.size > 0 || (validation.warnings && validation.warnings.size > 0)) && (
          <Box mt={2}>
            {validation.errors.size > 0 && (
              <Alert severity="error" sx={{ mb: 1 }}>
                <Typography variant="body2" gutterBottom>
                  Please fix the following errors:
                </Typography>
                <List dense>
                  {Array.from(validation.errors.entries()).map(([field, message]) => (
                    <ListItem key={field} disablePadding>
                      <ListItemText primary={`${field}: ${message}`} />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            )}
            
            {validation.warnings && validation.warnings.size > 0 && (
              <Alert severity="warning">
                <Typography variant="body2" gutterBottom>
                  Warnings:
                </Typography>
                <List dense>
                  {Array.from(validation.warnings.entries()).map(([field, message]) => (
                    <ListItem key={field} disablePadding>
                      <ListItemText primary={`${field}: ${message}`} />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
        >
          Cancel
        </Button>
        
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || !validation.valid || !isDirty}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? 'Saving...' : isEditMode ? 'Update Server' : 'Create Server'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServerEditDialog;