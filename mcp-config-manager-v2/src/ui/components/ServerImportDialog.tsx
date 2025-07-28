/**
 * Server Import Dialog Component
 * Allows users to import MCP server configurations from JSON
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  IconButton,
  Tooltip,
  CircularProgress,
  Typography,
  Collapse,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ContentPaste as PasteIcon,
  Clear as ClearIcon,
  Code as CodeIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

import { parseMCPServers, ParsedServer, exampleConfigurations } from '../utils/mcpServerParser';
import { 
  validateServers, 
  checkConflicts, 
  resolveConflicts, 
  ValidationError,
  ConflictInfo 
} from '../utils/serverValidation';

interface ServerImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (servers: ParsedServer[]) => void;
  existingServers: string[];
}

type ConflictResolution = 'skip' | 'replace' | 'rename';

export const ServerImportDialog: React.FC<ServerImportDialogProps> = ({
  open,
  onClose,
  onImport,
  existingServers
}) => {
  const [inputText, setInputText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedServers, setParsedServers] = useState<ParsedServer[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<ValidationError[]>([]);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [resolution, setResolution] = useState<ConflictResolution>('skip');
  const [showDetails, setShowDetails] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  const handleParse = useCallback(async () => {
    if (!inputText.trim()) return;

    setParsing(true);
    setParseErrors([]);
    setValidationErrors([]);
    setValidationWarnings([]);
    setConflicts([]);

    try {
      // Parse the input
      const parseResult = parseMCPServers(inputText);
      
      if (parseResult.errors.length > 0) {
        setParseErrors(parseResult.errors);
      }

      if (parseResult.servers.length > 0) {
        setParsedServers(parseResult.servers);

        // Validate servers
        const validationResult = validateServers(parseResult.servers);
        setValidationErrors(validationResult.errors);
        setValidationWarnings(validationResult.warnings);

        // Check for conflicts
        const conflictInfo = checkConflicts(parseResult.servers, existingServers);
        setConflicts(conflictInfo);
      } else {
        setParsedServers([]);
      }
    } catch (error) {
      setParseErrors([`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      setParsedServers([]);
    } finally {
      setParsing(false);
    }
  }, [inputText, existingServers]);

  const handleImport = useCallback(() => {
    if (parsedServers.length === 0) return;

    const resolvedServers = resolveConflicts(parsedServers, existingServers, resolution);
    onImport(resolvedServers);
    
    // Reset state
    setInputText('');
    setParsedServers([]);
    setParseErrors([]);
    setValidationErrors([]);
    setValidationWarnings([]);
    setConflicts([]);
  }, [parsedServers, existingServers, resolution, onImport]);

  const handleClose = useCallback(() => {
    setInputText('');
    setParsedServers([]);
    setParseErrors([]);
    setValidationErrors([]);
    setValidationWarnings([]);
    setConflicts([]);
    setShowDetails(false);
    setShowExamples(false);
    onClose();
  }, [onClose]);

  const loadExample = useCallback((example: keyof typeof exampleConfigurations) => {
    setInputText(exampleConfigurations[example]);
    setShowExamples(false);
  }, []);

  const hasErrors = parseErrors.length > 0 || validationErrors.length > 0;
  const canImport = parsedServers.length > 0 && !hasErrors;
  const finalServerCount = resolution === 'skip' 
    ? parsedServers.length - conflicts.length 
    : parsedServers.length;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh', maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Import MCP Server Configurations</Typography>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {/* Input Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Paste your MCP server JSON configurations below:
          </Typography>
          
          <TextField
            multiline
            rows={8}
            fullWidth
            variant="outlined"
            placeholder="Paste JSON configurations here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            sx={{ 
              fontFamily: 'Monaco, Consolas, monospace',
              '& .MuiInputBase-input': {
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '13px'
              }
            }}
          />
          
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box display="flex" gap={1}>
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={() => setInputText('')}
                disabled={!inputText}
              >
                Clear
              </Button>
              <Button
                size="small"
                startIcon={<CodeIcon />}
                onClick={() => setShowExamples(!showExamples)}
              >
                Examples
              </Button>
            </Box>
            <Button
              variant="contained"
              startIcon={parsing ? <CircularProgress size={16} /> : <PasteIcon />}
              onClick={handleParse}
              disabled={!inputText.trim() || parsing}
            >
              Parse
            </Button>
          </Box>

          {/* Examples Section */}
          <Collapse in={showExamples}>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Example Configurations:</Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Button size="small" onClick={() => loadExample('single')}>
                  Single Server
                </Button>
                <Button size="small" onClick={() => loadExample('multiple')}>
                  Multiple Servers
                </Button>
                <Button size="small" onClick={() => loadExample('direct')}>
                  Direct Config
                </Button>
              </Box>
            </Box>
          </Collapse>
        </Box>

        {/* Parse Errors */}
        {parseErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Parse Errors:</Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {parseErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Validation Errors:</Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {validationErrors.map((error, idx) => (
                <li key={idx}>
                  <strong>{error.serverName}</strong> - {error.field}: {error.message}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Validation Warnings */}
        {validationWarnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Warnings:</Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {validationWarnings.map((warning, idx) => (
                <li key={idx}>
                  <strong>{warning.serverName}</strong> - {warning.field}: {warning.message}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Preview Section */}
        {parsedServers.length > 0 && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle1">
                Preview ({parsedServers.length} server{parsedServers.length !== 1 ? 's' : ''} found)
              </Typography>
              <Button
                size="small"
                onClick={() => setShowDetails(!showDetails)}
                endIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              >
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>
            </Box>
            
            <List dense>
              {parsedServers.map((server, idx) => {
                const hasConflict = conflicts.some(c => c.serverName === server.name);
                const hasValidationError = validationErrors.some(e => e.serverName === server.name);
                
                return (
                  <ListItem key={idx} divider>
                    <ListItemIcon>
                      {hasValidationError ? (
                        <ErrorIcon color="error" />
                      ) : hasConflict ? (
                        <WarningIcon color="warning" />
                      ) : (
                        <CheckIcon color="success" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1" fontWeight="medium">
                            {server.name}
                          </Typography>
                          {hasConflict && (
                            <Chip label="Exists" color="warning" size="small" />
                          )}
                          {hasValidationError && (
                            <Chip label="Error" color="error" size="small" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {server.config.command} {server.config.args?.join(' ') || ''}
                          </Typography>
                          <Collapse in={showDetails}>
                            <Box sx={{ mt: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                              <pre style={{ margin: 0, fontSize: '12px', overflow: 'auto' }}>
                                {JSON.stringify(server.config, null, 2)}
                              </pre>
                            </Box>
                          </Collapse>
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>

            {/* Conflict Resolution */}
            {conflicts.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ mb: 2 }} />
                <FormControl component="fieldset">
                  <FormLabel component="legend">
                    <Typography variant="subtitle2" color="warning.main">
                      Conflict Resolution ({conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''})
                    </Typography>
                  </FormLabel>
                  <RadioGroup
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as ConflictResolution)}
                    sx={{ mt: 1 }}
                  >
                    <FormControlLabel 
                      value="skip" 
                      control={<Radio />} 
                      label={
                        <Box>
                          <Typography variant="body2">Skip existing servers</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Don't import servers that already exist
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel 
                      value="replace" 
                      control={<Radio />} 
                      label={
                        <Box>
                          <Typography variant="body2">Replace existing servers</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Overwrite existing servers with new configurations
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel 
                      value="rename" 
                      control={<Radio />} 
                      label={
                        <Box>
                          <Typography variant="body2">Rename conflicting servers</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Add suffix to conflicting server names (e.g., server_1)
                          </Typography>
                        </Box>
                      }
                    />
                  </RadioGroup>
                </FormControl>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleImport}
          disabled={!canImport}
        >
          Import {finalServerCount} Server{finalServerCount !== 1 ? 's' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
};