import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './Redux/store';
import App from './App';

test('renders recommended movies header', () => {
  render(
    <Provider store={store}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </Provider>
  );
  
  const headerElement = screen.getByText(/Recommended Movies/i);
  expect(headerElement).toBeInTheDocument();
});
