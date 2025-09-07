import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { authAPI } from '../../services/api';
import { login } from '../../utils/auth';

const GoogleSignInButton = ({ onSuccess, onError, buttonText = 'Sign in with Google' }) => {
  const handleSuccess = async (credentialResponse) => {
    if (!credentialResponse.credential) {
      const error = new Error('No credential received from Google');
      console.error('Google sign-in error:', error);
      if (onError) onError({ message: 'No credential received from Google' });
      return;
    }

    try {
      const response = await authAPI.googleAuth({
        credential: credentialResponse.credential
      });
      
      if (!response?.token) {
        throw new Error('Invalid response from server');
      }
      
      // Handle successful login
      const { token, user } = response;
      login(token, user);
      
      if (onSuccess) onSuccess({ token, user });
    } catch (error) {
      console.error('Google sign-in error:', error);
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Google sign-in failed';
      if (onError) onError({ message: errorMessage });
    }
  };

  const handleError = () => {
    const error = new Error('Google sign-in was unsuccessful');
    console.error('Google sign-in failed');
    if (onError) onError(error);
  };

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    console.error('Google Client ID is not set in environment variables');
    return <div className='text-red-500'>Google sign-in is not configured</div>;
  }

  // Ensure the client ID is properly formatted without quotes
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.replace(/['"]+/g, '');
  
  return (
    <GoogleOAuthProvider 
      clientId={clientId}
      onScriptLoadError={() => console.error('Failed to load Google OAuth script')}
    >
      <div className="w-full">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap={false}
          auto_select={false}
          theme="outline"
          size="large"
          text={buttonText.includes('up') ? 'signup_with' : 'signin_with'}
          shape="rectangular"
          width="100%"
          cookiePolicy={'single_host_origin'}
          isSignedIn={false}
        />
      </div>
    </GoogleOAuthProvider>
  );
};

export default GoogleSignInButton;
