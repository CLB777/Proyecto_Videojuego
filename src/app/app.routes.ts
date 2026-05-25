import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';
import { HomeComponent } from './pages/home/home.component';
import { CollectionComponent } from './pages/collection/collection.component';
import { DeckBuilderComponent } from './pages/deck-builder/deck-builder.component';
import { GameBoardComponent } from './pages/game-board/game-board.component';
import { LobbyComponent } from './pages/lobby/lobby.component';
import { HistoryComponent } from './pages/history/history.component';
import { GachaComponent } from './pages/gacha/gacha.component';

export const routes: Routes = [
  { path: 'auth', component: AuthComponent },
  { path: 'home', component: HomeComponent },
  { path: 'collection', component: CollectionComponent },
  { path: 'deck-builder', component: DeckBuilderComponent },
  { path: 'game', component: GameBoardComponent },
  { path: 'lobby', component: LobbyComponent },
  { path: 'history', component: HistoryComponent },
  { path: 'gacha', component: GachaComponent },
  { path: '', redirectTo: '/auth', pathMatch: 'full' },
  { path: '**', redirectTo: '/auth' }
];
