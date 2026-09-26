import { createBrowserRouter, Navigate } from 'react-router';
import { App } from './App';
import { SearchPage } from '@/pages/SearchPage';
import { CardDetailPage } from '@/pages/CardDetailPage';
import { DecksPage } from '@/pages/DecksPage';
import { DeckDetailPage } from '@/pages/DeckDetailPage';
import { CollectionPage } from '@/pages/CollectionPage';
import { FavoritesPage } from '@/pages/FavoritesPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/buscar" replace /> },
      { path: 'buscar', element: <SearchPage /> },
      { path: 'cartas/:cardId', element: <CardDetailPage /> },
      { path: 'decks', element: <DecksPage /> },
      { path: 'decks/:deckId', element: <DeckDetailPage /> },
      { path: 'colecao', element: <CollectionPage /> },
      { path: 'favoritos', element: <FavoritesPage /> },
    ],
  },
]);
