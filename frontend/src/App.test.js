import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Simple smoke test to check if the app renders
test('renders login page when not authenticated', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  
  // Checking for some text that should be in the LoginPage
  const welcomeText = screen.getByText(/Welcome back/i);
  expect(welcomeText).toBeInTheDocument();
});
