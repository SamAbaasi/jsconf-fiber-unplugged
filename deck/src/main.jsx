import { createRoot } from 'react-dom/client';
import './styles/fonts.generated.css';
import './styles/base.css';
import { Deck } from './engine/Deck.jsx';
import { Presenter } from './engine/Presenter.jsx';

const isPresenter = new URLSearchParams(location.search).get('view') === 'presenter';
document.documentElement.dataset.view = isPresenter ? 'presenter' : 'audience';
createRoot(document.getElementById('root')).render(isPresenter ? <Presenter /> : <Deck />);
