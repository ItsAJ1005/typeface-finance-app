import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { sendMessage } from '../../services/aiService';
import { isAuthenticated } from '../../utils/auth';
import { 
  Box, 
  IconButton, 
  TextField, 
  Paper, 
  Typography, 
  Avatar, 
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  Send as SendIcon, 
  Close as CloseIcon, 
  Chat as ChatIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const ChatContainer = styled(Paper)({
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  width: '350px',
  maxHeight: '500px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  zIndex: 1000,
  borderRadius: '12px',
  overflow: 'hidden',
  border: '1px solid #e5e7eb',
});

const ChatHeader = styled(Box)({
  backgroundColor: '#ef4444', /* Red-500 */
  color: 'white',
  padding: '12px 16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  fontWeight: '500',
});

const ChatMessages = styled(Box)({
  flex: 1,
  padding: '19px',
  overflowY: 'auto',
  backgroundColor: '#f9f9f9',
  '& > *:not(:last-child)': {
    marginBottom: '12px',
  },
});

const MessageContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '100%',
  margin: '4px 0',
  alignItems: 'flex-start',
  '&.user': {
    alignItems: 'flex-end',
  },
});

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser',
})(({ isUser }) => ({
  maxWidth: '80%',
  padding: '10px 14px',
  borderRadius: '18px',
  backgroundColor: isUser ? '#f3f4f6' : '#ffffff',
  color: '#1f2937',
  fontSize: '0.9375rem',
  lineHeight: '1.5',
  wordBreak: 'break-word',
  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  border: '1px solid #e5e7eb',
}));

const MessageHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginBottom: '4px',
  fontSize: '0.75rem',
  color: '#6b7280',
  gap: '6px',
});

const Timestamp = styled('span')({
  fontSize: '0.7rem',
  color: '#9ca3af',
  marginTop: '2px',
});

const ChatInput = styled(Box)({
  display: 'flex',
  padding: '12px',
  borderTop: '1px solid #e5e7eb',
  backgroundColor: 'white',
  gap: '8px',
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    '& fieldset': {
      borderColor: '#e5e7eb',
    },
    '&:hover fieldset': {
      borderColor: '#d1d5db',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#9ca3af',
      boxShadow: '0 0 0 1px #e5e7eb',
    },
  },
  '& .MuiIconButton-root': {
    backgroundColor: '#ef4444',
    color: 'white',
    '&:hover': {
      backgroundColor: '#dc2626',
    },
    '&.Mui-disabled': {
      backgroundColor: '#fca5a5',
      color: '#fee2e2',
    },
  },
});

const ChatButton = styled(IconButton)({
  position: 'relative',
  bottom: 0,
  right: 0,
  backgroundColor: '#ef4444',
  color: 'white',
  '&:hover': {
    backgroundColor: '#dc2626',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
  },
  width: '60px',
  height: '60px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  transition: 'all 0.3s ease',
  '&:active': {
    transform: 'translateY(0)',
  },
  '@keyframes pulse': {
    '0%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.05)' },
    '100%': { transform: 'scale(1)' },
  },
  animation: 'pulse 2s infinite',
});

const Chatbot = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      id: 'welcome',
      text: "Hello! I'm your financial assistant. I can help you understand your spending, track expenses, and provide financial insights. What would you like to know?", 
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-close and hide on auth pages like /login and /register
  useEffect(() => {
    const path = location.pathname || '';
    if (path.startsWith('/login') || path.startsWith('/register')) {
      setIsOpen(false);
    }
  }, [location]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { 
      id: Date.now(),
      text: input, 
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage(input);
      setMessages(prev => [...prev, { 
        id: `ai-${Date.now()}`,
        text: response.data, 
        isUser: false,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      const msg = error?.message || 'Failed to get response from the assistant. Please try again.';
      if (msg.toLowerCase().includes('sign in')) {
        setMessages(prev => [...prev, {
          id: `auth-${Date.now()}`,
          text: msg,
          isUser: false,
          type: 'auth',
          timestamp: new Date()
        }]);
        setError(null);
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const navigate = useNavigate();
  const isUserAuthenticated = isAuthenticated();

  // Hide the chatbot entirely on login/register pages
  if (location.pathname.startsWith('/login') || location.pathname.startsWith('/register')) {
    return null;
  }

  if (!isOpen) {
    return (
      <Box sx={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
        <Tooltip 
          title={isUserAuthenticated ? "Chat with financial assistant" : "Sign in to chat with our financial assistant"}
          placement="left"
          arrow
          open={!isUserAuthenticated}
          componentsProps={{
            tooltip: {
              sx: {
                bgcolor: 'white',
                color: '#1f2937',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                '& .MuiTooltip-arrow': {
                  color: 'white',
                  '&:before': {
                    border: '1px solid #e5e7eb',
                  }
                }
              }
            }
          }}
        >
          <ChatButton 
            onClick={() => isUserAuthenticated ? toggleChat() : navigate('/login')}
            sx={{
              backgroundColor: isUserAuthenticated ? '#ef4444' : '#ef4444',
              color: 'white',
              '&:hover': {
                backgroundColor: isUserAuthenticated ? '#dc2626' : '#dc2626',
                transform: 'translateY(-2px)',
              },
              animation: !isUserAuthenticated ? 'pulse 2s infinite' : 'none'
            }}
          >
            {isUserAuthenticated ? (
              <ChatIcon fontSize="large" />
            ) : (
              <ChatIcon fontSize="large" />
            )}
          </ChatButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <ChatContainer elevation={3}>
      <ChatHeader onClick={toggleChat}>
        <Typography variant="subtitle1" fontWeight="bold">Financial Assistant</Typography>
        <IconButton 
          size="small" 
          onClick={(e) => {
            e.stopPropagation();
            toggleChat();
          }}
          style={{ color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </ChatHeader>
      
      <ChatMessages>
        {messages.map((message) => (
          <MessageContainer key={message.id} className={message.isUser ? 'user' : ''}>
            <MessageHeader>
              <span>{message.isUser ? 'You' : 'Assistant'}</span>
              <span>•</span>
              <span>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </MessageHeader>
            <MessageBubble isUser={message.isUser}>
              {message.type === 'auth' ? (
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>{message.text}</Typography>
                  <Link to="/login" style={{ textDecoration: 'none' }}>
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-block',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        padding: '8px 14px',
                        borderRadius: '9999px',
                        fontSize: '0.875rem',
                      }}
                    >
                      Go to Sign in
                    </Box>
                  </Link>
                </Box>
              ) : (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{message.text}</Typography>
              )}
            </MessageBubble>
          </MessageContainer>
        ))}
        {isLoading && (
          <MessageBubble isUser={false}>
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={16} />
              <Typography variant="body2">Thinking...</Typography>
            </Box>
          </MessageBubble>
        )}
        <div ref={messagesEndRef} />
      </ChatMessages>
      
      <form onSubmit={handleSendMessage}>
        <ChatInput>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Ask me about your finances..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '20px',
                backgroundColor: '#f5f5f5',
              },
            }}
          />
          <IconButton 
            type="submit" 
            color="primary" 
            disabled={!input.trim() || isLoading}
            sx={{ ml: 1 }}
          >
            <SendIcon />
          </IconButton>
        </ChatInput>
      </form>
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          <div>
            <div>{error}</div>
            {String(error).toLowerCase().includes('sign in') && (
              <div className="mt-2">
                <Link to="/login" className="text-sm font-medium text-red-700 underline">Go to Sign in</Link>
              </div>
            )}
          </div>
        </Alert>
      </Snackbar>
    </ChatContainer>
  );
};

export default Chatbot;
