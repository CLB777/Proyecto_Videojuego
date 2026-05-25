import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SqliteService } from '../../core/services/sqlite/sqlite.service';
import { SupabaseService } from '../../core/services/supabase/supabase.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div style="min-height: 100vh; padding: 2rem; background: url('https://images.unsplash.com/photo-1613771404724-11d2d7a02294?auto=format&fit=crop&w=1200&q=60') no-repeat center center fixed; background-size: cover; position: relative;">
      
      <!-- Overlay oscuro inmersivo -->
      <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(10,15,30,0.7) 0%, rgba(5,5,10,0.95) 100%); pointer-events: none; z-index: 1;"></div>

      <div style="position: relative; z-index: 2; max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; align-items: center;">
        
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem;">
        <a routerLink="/home" class="btn">Volver al Cuartel</a>
        <h1 class="title glow-text-cyan" style="margin: 0; font-size: 2.5rem;">Registro de Batallas</h1>
        <div style="width: 150px;"></div> <!-- Spacer -->
      </div>

      <!-- Resumen Global y Gráfica -->
      <div class="glass-panel" style="width: 100%; max-width: 1000px; display: flex; gap: 3rem; margin-bottom: 3rem; border-color: var(--neon-purple); justify-content: center; align-items: center;">
        
        <!-- Gráfica de Pastel usando conic-gradient -->
        <div style="position: relative; width: 150px; height: 150px; border-radius: 50%; box-shadow: 0 0 20px rgba(0,0,0,0.8), inset 0 0 10px rgba(0,0,0,0.5);"
             [style.background]="getPieChartStyle()">
          <!-- Centro de la Dona -->
          <div style="position: absolute; top: 20px; left: 20px; right: 20px; bottom: 20px; background: #111; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 10px rgba(0,0,0,0.8);">
            <div style="text-align: center;">
              <div style="font-size: 0.8rem; color: #aaa; text-transform: uppercase;">Total</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #fff;">{{ totalWins + totalLosses }}</div>
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <h2 style="font-size: 2rem; margin-bottom: 0;">Resumen Global</h2>
            <p style="color: #aaa;">Todas tus batallas registradas.</p>
          </div>
          <div style="display: flex; gap: 2rem;">
            <div>
              <div style="font-size: 0.8rem; color: #00ffcc; text-transform: uppercase;">Vs Máquina (Victoria)</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #00ffcc;">{{ getOfflineWins() }}</div>
            </div>
            <div>
              <div style="font-size: 0.8rem; color: #ff0055; text-transform: uppercase;">Vs Jugador (Victoria)</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #ff0055;">{{ getOnlineWins() }}</div>
            </div>
            <div>
              <div style="font-size: 0.8rem; color: #aaa; text-transform: uppercase;">Derrotas Globales</div>
              <div style="font-size: 1.5rem; font-weight: bold;">{{ totalLosses }}</div>
            </div>
          </div>
        </div>

      </div>

      <!-- Tablas Separadas -->
      <div style="width: 100%; max-width: 1200px; display: grid; grid-template-columns: 1fr 1fr; gap: 3rem;">
        
        <!-- Offline / vs Máquina -->
        <div class="glass-panel" style="border-color: #555; padding: 2rem;">
          <h2 class="glow-text-pink" style="margin-bottom: 1.5rem; font-size: 1.5rem;">Vs Máquina (IA)</h2>
          
          <div *ngIf="offlineHistory.length === 0" style="color: #aaa; text-align: center; padding: 2rem;">
            Aún no has luchado contra la IA.
          </div>
          
          <div *ngFor="let match of offlineHistory" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #333;">
            <div>
              <div style="font-weight: bold; text-transform: uppercase;">Dificultad: {{ match.difficulty }}</div>
              <div style="font-size: 0.8rem; color: #aaa;">{{ match.timestamp | date:'short' }}</div>
            </div>
            <div style="font-size: 1.2rem; font-weight: 900;" [ngStyle]="{'color': match.result === 'win' ? 'var(--neon-cyan)' : 'var(--neon-red)'}">
              {{ match.result === 'win' ? 'VICTORIA' : 'DERROTA' }}
            </div>
          </div>
        </div>

        <!-- Online / vs Jugadores -->
        <div class="glass-panel" style="border-color: #555; padding: 2rem;">
          <h2 class="glow-text-cyan" style="margin-bottom: 1.5rem; font-size: 1.5rem;">Vs Jugadores (Online)</h2>
          
          <div *ngIf="onlineHistory.length === 0" style="color: #aaa; text-align: center; padding: 2rem;">
            Aún no has luchado contra otros entrenadores.
          </div>

          <div *ngFor="let match of onlineHistory" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #333;">
            <div>
              <div style="font-weight: bold; text-transform: uppercase;">Rival: {{ match.opponentName }}</div>
              <div style="font-size: 0.8rem; color: #aaa;">{{ match.timestamp | date:'short' }}</div>
            </div>
            <div style="font-size: 1.2rem; font-weight: 900;" [ngStyle]="{'color': match.result === 'win' ? 'var(--neon-cyan)' : 'var(--neon-red)'}">
              {{ match.result === 'win' ? 'VICTORIA' : 'DERROTA' }}
            </div>
          </div>

      </div>
    </div>
    </div>
  `
})
export class HistoryComponent implements OnInit {
  offlineHistory: any[] = [];
  onlineHistory: any[] = [];

  totalWins = 0;
  totalLosses = 0;

  private sqlite = inject(SqliteService);
  private supabase = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    // Cargar historial Offline
    this.offlineHistory = await this.sqlite.getMatchHistory();
    // Ordenar de más reciente a más antiguo
    this.offlineHistory.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Contar victorias offline
    this.totalWins += this.offlineHistory.filter(m => m.result === 'win').length;
    this.totalLosses += this.offlineHistory.filter(m => m.result === 'lose').length;

    // Cargar historial Online de Supabase
    try {
      const { data: userAuth } = await this.supabase.auth.getUser();
      if (userAuth.user) {
        const { data } = await this.supabase.client
          .from('partidas')
          .select('*, jugador1:usuarios!partidas_id_jugador1_fkey(username), jugador2:usuarios!partidas_id_jugador2_fkey(username)')
          .or(`id_jugador1.eq.${userAuth.user.id},id_jugador2.eq.${userAuth.user.id}`)
          .neq('estado', 'esperando');
        
        if (data) {
          this.onlineHistory = data.map((p: any) => {
            const isJugador1 = p.id_jugador1 === userAuth.user.id;
            const opponentName = isJugador1 ? (p.jugador2?.username || 'Entrenador Online') : (p.jugador1?.username || 'Entrenador Online');
            return {
              timestamp: p.creada_en,
              result: p.ganador === userAuth.user.id ? 'win' : (p.ganador ? 'lose' : 'draw'),
              opponentName
            };
          }).filter(p => p.result !== 'draw');

          this.onlineHistory.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          this.totalWins += this.onlineHistory.filter(m => m.result === 'win').length;
          this.totalLosses += this.onlineHistory.filter(m => m.result === 'lose').length;
        }
      }
    } catch(e) {
      console.error(e);
    }
    
    // Forzar actualización de la UI
    this.cdr.detectChanges();
  }

  getOfflineWins(): number {
    return this.offlineHistory.filter(m => m.result === 'win').length;
  }

  getOnlineWins(): number {
    return this.onlineHistory.filter(m => m.result === 'win').length;
  }

  getPieChartStyle(): string {
    const total = this.totalWins + this.totalLosses;
    if (total === 0) {
      return 'conic-gradient(#555 0%, #555 100%)';
    }
    
    // Porcentajes para cada sección
    const offlineWins = this.getOfflineWins();
    const onlineWins = this.getOnlineWins();
    const losses = this.totalLosses;

    const offW_pct = (offlineWins / total) * 100;
    const onW_pct = (onlineWins / total) * 100;
    const loss_pct = (losses / total) * 100;

    // Colores: 
    // Vs Máquina (Cyan/Verde): #00ffcc
    // Vs Jugador (Magenta/Rojo): #ff0055
    // Derrotas (Gris oscuro): #444

    let grad = `conic-gradient(`;
    grad += `#00ffcc 0% ${offW_pct}%, `;
    grad += `#ff0055 ${offW_pct}% ${offW_pct + onW_pct}%, `;
    grad += `#444 ${offW_pct + onW_pct}% 100%)`;
    return grad;
  }
}
