import React, { useEffect, useMemo, useState } from 'react';
import { User, Lock, ShieldCheck, UserCircle, CheckCircle, XCircle, Mail, Eye, EyeOff, Users } from 'lucide-react';
import { getAuthUrl } from '../../config/apiConfig';
import './LoginPage.css';

const LoginPage = () => {
  const [userType, setUserType] = useState('user');
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);  // ✅ NEW: Loading state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  const validatePassword = (password) => {
    return {
      length: password.length === 12,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(password)
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const passwordChecks = useMemo(() => validatePassword(formData.password || ''), [formData.password]);
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  const handleSubmit = async () => {
    setErrors({});
    setMessage('');
    setLoading(true);  // ✅ Start loading

    // ✅ SECURITY FIX: Use backend API for admin authentication
    if (userType === 'admin' && isLogin) {
      try {
        const adminLoginUrl = getAuthUrl('admin-login');
        const response = await fetch(adminLoginUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password
          })
        });
        const data = await response.json();

        if (response.ok) {
          setMessage('✅ Login successful! Redirecting...');
          localStorage.setItem('userToken', data.token);
          localStorage.setItem('userRole', 'admin');
          setTimeout(() => window.location.reload(), 800);
        } else {
          setErrors({ general: 'Invalid credentials' });  // ✅ Generic error
        }
      } catch (error) {
        console.error('Admin login error:', error);
        setErrors({ general: 'Server error. Please try again.' });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (userType === 'user' && !isLogin) {
      if (!isPasswordValid) {
        setErrors({ password: 'Password does not meet requirements' });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrors({ confirmPassword: 'Passwords do not match' });
        return;
      }
      if (!formData.username || formData.username.length < 3) {
        setErrors({ username: 'Username must be at least 3 characters' });
        return;
      }

      try {
        const registerUrl = getAuthUrl('register');
        console.log('Registering at:', registerUrl);
        const response = await fetch(registerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password
          })
        });
        const data = await response.json();
        if (response.ok) {
          setMessage('✅ Registration successful! Please login.');
          setIsLogin(true);
          setFormData({ username: '', password: '', confirmPassword: '' });
        } else {
          setErrors({ general: data.error || 'Registration failed' });
        }
      } catch (error) {
        console.error('Registration error:', error);
        setErrors({ general: 'Server error. Please try again.' });
      } finally {
        setLoading(false);  // ✅ Stop loading
      }
      return;
    }

    if (userType === 'user' && isLogin) {
      try {
        const loginUrl = getAuthUrl('login');
        console.log('Logging in at:', loginUrl);
        const response = await fetch(loginUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password
          })
        });
        const data = await response.json();
        if (response.ok) {
          setMessage('✅ Login successful!');
          // Store the token and redirect
          localStorage.setItem('userToken', data.token);
          setTimeout(() => {
            window.location.reload(); // Reload to trigger auth check in App.jsx
          }, 1000);
        } else {
          setErrors({ general: data.error || 'Invalid credentials' });
        }
      } catch (error) {
        console.error('Login error:', error);
        setErrors({ general: 'Server error. Please try again.' });
      } finally {
        setLoading(false);  // ✅ Stop loading
      }
    }
  };

  // ✅ REMOVED: Copy/paste blocking prevents password managers (NIST 800-63B)

  const handleSwitchMode = (type) => {
    setUserType(type);
    setIsLogin(true);
    setFormData({ username: '', password: '', confirmPassword: '' });
    setErrors({});
    setMessage('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const clearAllErrors = () => {
    setErrors({});
    setMessage('');
    setFormData({ username: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="login-root">
      <div className="login-card">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem', animation: 'fadeInDown 0.7s ease' }}>
          <div className="login-icon-box">
            {userType === 'admin' ? <ShieldCheck size={32} /> : <User size={32} />}
          </div>
          <h1 className="login-title">RefTools Pro</h1>
          <p className="login-subtitle">HVAC Refrigerant Calculator System</p>
        </div>

        {/* Success Message */}
        {message && (
          <div className="success-message" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={20} style={{ minWidth: '20px' }} />
              <span>{message}</span>
            </div>
            <button
              onClick={() => setMessage('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#059669',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 4px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {/* User Type Toggle */}
        <div className="pill-toggle" role="tablist" aria-label="Login mode">
          <button
            onClick={() => handleSwitchMode('user')}
            role="tab"
            aria-selected={userType === 'user'}
            className={userType === 'user' ? 'active' : ''}
          >
            <UserCircle size={18} />
            User
          </button>
          <button
            onClick={() => handleSwitchMode('admin')}
            role="tab"
            aria-selected={userType === 'admin'}
            className={userType === 'admin' ? 'active' : ''}
          >
            <ShieldCheck size={18} />
            Admin
          </button>
        </div>

        {/* Form */}
        <div style={{ animation: 'fadeInUp 0.7s ease 0.2s both' }}>
          {/* Username Field */}
          <div className="form-group">
            <label htmlFor="username">
              {userType === 'admin' ? 'Admin ID' : 'Username'}
            </label>
            <div className="input-wrapper">
              <input
                id="username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder={userType === 'admin' ? 'Enter admin ID' : 'Enter your username'}
                aria-label={userType === 'admin' ? 'Admin ID' : 'Username'}
              />
            </div>
            {errors.username && (
              <div className="error-message">
                <XCircle size={16} style={{ minWidth: '16px' }} />
                {errors.username}
              </div>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper" style={{
              position: 'relative',
              background: showPassword ? 'rgba(245, 158, 11, 0.08)' : 'transparent',  // ✅ Visual warning
              transition: 'background 0.3s ease',
              borderRadius: 'var(--radius-sm)'
            }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                aria-label="Password"
                aria-describedby={userType === 'user' && !isLogin ? 'pw-requirements' : undefined}
                style={{ paddingRight: '48px' }}
                autoComplete="current-password"  // ✅ Allow password managers
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#667eea'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>

              {/* ✅ NEW: Password visibility warning */}
              {showPassword && (
                <div style={{
                  position: 'absolute',
                  bottom: '-26px',
                  left: '0',
                  fontSize: '11px',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  animation: 'fadeIn 0.2s ease'
                }}>
                  <span>⚠</span>
                  <span>Password is visible</span>
                </div>
              )}
            </div>
            {errors.password && (
              <div className="error-message">
                <XCircle size={16} style={{ minWidth: '16px' }} />
                {errors.password}
              </div>
            )}

            {/* Admin Helper Text */}
            {userType === 'admin' && isLogin && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%)',
                border: '1px solid #cffafe',
                borderRadius: '10px',
                fontSize: '13px',
                color: '#047857',
                fontWeight: '500'
              }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: '600' }}>Admin Login</p>
                <p style={{ margin: '0', fontSize: '12px' }}>Use your admin credentials to access the admin panel.</p>
              </div>
            )}

            {/* Password Requirements Checklist */}
            {userType === 'user' && !isLogin && (
              <div id="pw-requirements" style={{
                marginTop: '12px',
                padding: '12px',
                background: 'linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%)',
                border: '1px solid #cffafe',
                borderRadius: '10px',
                animation: 'scaleIn 0.4s ease'
              }} aria-live="polite">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: passwordChecks.length ? '#047857' : '#9ca3af',
                  marginBottom: '6px',
                  transition: 'all 0.2s ease'
                }}>
                  {passwordChecks.length ? (
                    <CheckCircle size={18} style={{ color: '#10b981', minWidth: '18px' }} />
                  ) : (
                    <XCircle size={18} style={{ color: '#d1d5db', minWidth: '18px' }} />
                  )}
                  <span>Exactly 12 characters</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: passwordChecks.uppercase ? '#047857' : '#9ca3af',
                  marginBottom: '6px',
                  transition: 'all 0.2s ease'
                }}>
                  {passwordChecks.uppercase ? (
                    <CheckCircle size={18} style={{ color: '#10b981', minWidth: '18px' }} />
                  ) : (
                    <XCircle size={18} style={{ color: '#d1d5db', minWidth: '18px' }} />
                  )}
                  <span>At least 1 uppercase letter</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: passwordChecks.number ? '#047857' : '#9ca3af',
                  marginBottom: '6px',
                  transition: 'all 0.2s ease'
                }}>
                  {passwordChecks.number ? (
                    <CheckCircle size={18} style={{ color: '#10b981', minWidth: '18px' }} />
                  ) : (
                    <XCircle size={18} style={{ color: '#d1d5db', minWidth: '18px' }} />
                  )}
                  <span>At least 1 number</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: passwordChecks.special ? '#047857' : '#9ca3af',
                  marginBottom: 0,
                  transition: 'all 0.2s ease'
                }}>
                  {passwordChecks.special ? (
                    <CheckCircle size={18} style={{ color: '#10b981', minWidth: '18px' }} />
                  ) : (
                    <XCircle size={18} style={{ color: '#d1d5db', minWidth: '18px' }} />
                  )}
                  <span>At least 1 special character</span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field (Signup Only) */}
          {userType === 'user' && !isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  aria-label="Confirm password"
                  style={{ paddingRight: '48px' }}
                  autoComplete="new-password"  // ✅ Allow password managers
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#667eea'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <div className="error-message">
                  <XCircle size={16} style={{ minWidth: '16px' }} />
                  {errors.confirmPassword}
                </div>
              )}
            </div>
          )}

          {/* General Error Message */}
          {errors.general && (
            <div className="error-message" style={{ marginBottom: '1.5rem', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={16} style={{ minWidth: '16px' }} />
                {errors.general}
              </div>
              <button
                onClick={() => setErrors({ ...errors, general: '' })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || (userType === 'user' && !isLogin && !isPasswordValid)}  // ✅ Disable during loading
            className="submit-button"
            title={
              userType === 'user' && !isLogin && !isPasswordValid
                ? 'Please meet all password requirements to continue'
                : ''
            }
            style={{ position: 'relative' }}
          >
            {loading ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                  marginRight: '8px'
                }}></span>
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>

          {/* Disabled State Helper */}
          {userType === 'user' && !isLogin && !isPasswordValid && (
            <div style={{
              marginTop: '12px',
              padding: '10px 12px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '18px' }}>ⓘ</span>
              <span>Complete all password requirements above to create your account</span>
            </div>
          )}
        </div>

        {/* Toggle Login/Signup (User Only) */}
        {userType === 'user' && (
          <>
            <div className="toggle-link">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFormData({ username: '', password: '', confirmPassword: '' });
                  setErrors({});
                  setMessage('');
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                }}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>

            <div className="guest-login-divider">
              <span>OR</span>
            </div>

            <button
              className="guest-login-btn"
              onClick={() => {
                localStorage.setItem('userMode', 'guest');
                localStorage.setItem('userRole', 'user');
                localStorage.setItem('userToken', 'guest-token'); // Dummy token
                window.location.reload();
              }}
            >
              <Users size={18} />
              Login as Guest
            </button>
          </>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '2rem',
          fontSize: '12px',
          color: '#9ca3af',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '1.5rem'
        }}>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;