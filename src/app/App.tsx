import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router';
import './styles/global.css';

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
