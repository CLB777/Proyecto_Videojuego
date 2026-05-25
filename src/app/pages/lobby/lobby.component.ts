import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase/supabase.service';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div style="min-height: 100vh; padding: 2rem; background: url('https://images.unsplash.com/photo-1608889175123-8ec330b86f84?auto=format&fit=crop&w=1200&q=60') no-repeat center center fixed; background-size: cover; position: relative;">
      
      <!-- Overlay oscuro inmersivo -->
      <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(10,15,30,0.7) 0%, rgba(5,5,10,0.95) 100%); pointer-events: none; z-index: 1;"></div>

      <div style="position: relative; z-index: 2; max-width: 1200px; margin: 0 auto;">
        <header class="flex-between" style="margin-bottom: 3rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem;">
          <h1 class="title glow-text-purple" style="margin: 0;">Salas <span class="text-cyan">Multijugador</span></h1>
          <a routerLink="/home" class="btn btn-cyan" style="text-decoration: none;">Volver al Cuartel</a>
        </header>

        <div class="flex-between" style="margin-bottom: 2rem; background: rgba(0,0,0,0.6); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 0 15px rgba(0,243,255,0.1);">
          <h2 style="font-size: 1.2rem; font-weight: 300; text-transform: uppercase; letter-spacing: 2px;">
            Radar de Servidores
          </h2>
          <button (click)="createGame()" [disabled]="creating" class="btn btn-pink">
            {{ creating ? 'Iniciando Nodo...' : 'Crear Sala Nueva' }}
          </button>
        </div>

        <div *ngIf="loading" class="flex-center" style="height: 30vh;">
          <h2 class="glow-text-cyan" style="text-transform: uppercase; letter-spacing: 2px;">Escaneando red P2P...</h2>
        </div>

        <div *ngIf="!loading && partidas.length === 0" style="text-align: center; padding: 4rem; border: 2px dashed rgba(255,255,255,0.15); border-radius: 16px; color: #888; background: rgba(0,0,0,0.4);">
          <p style="font-size: 1.2rem; letter-spacing: 1px; margin-bottom: 1rem;">La red está inactiva.</p>
          <p style="font-size: 0.9rem;">Sé el primero en iniciar una sala de combate.</p>
        </div>

        <div *ngIf="!loading && partidas.length > 0" class="grid-cards">
          <div *ngFor="let p of partidas" class="glass-panel glow-cyan" style="display: flex; flex-direction: column; justify-content: space-between; padding: 1.5rem; background: rgba(10,20,40,0.8);">
            <div style="margin-bottom: 2rem;">
              <div style="font-size: 0.75rem; color: #888; margin-bottom: 0.5rem; letter-spacing: 1px;">SALA ID: {{ p.id.substring(0,8) }}</div>
              <div style="font-size: 1.2rem; font-weight: bold; text-transform: uppercase; margin-bottom: 0.5rem;">
                Host: <span class="text-cyan">{{ p.host_username || 'Jugador' }}</span>
              </div>
              <div style="display: inline-block; background: rgba(0,255,102,0.1); border: 1px solid var(--neon-green); color: var(--neon-green); padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 900; letter-spacing: 1px;">
                ESPERANDO RIVAL
              </div>
            </div>
            
            <button (click)="joinGame(p.id)" [disabled]="joining" class="btn btn-cyan" style="width: 100%;">
              Conectar a Sala
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LobbyComponent implements OnInit {
  partidas: any[] = [];
  loading = true;
  creating = false;
  joining = false;
  myId: string = '';

  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    const { data: userAuth } = await this.supabase.auth.getUser();
    if (!userAuth.user) {
      this.router.navigate(['/auth']);
      return;
    }
    this.myId = userAuth.user.id;
    this.loadGames();

    this.supabase.client.channel('public:partidas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidas' }, payload => {
        this.loadGames();
      })
      .subscribe();
  }

  async loadGames() {
    this.loading = true;
    try {
      const { data, error } = await this.supabase.client
        .from('partidas')
        .select('*, usuarios!partidas_id_jugador1_fkey(username)')
        .eq('estado', 'esperando');
      
      if (!error && data) {
        this.partidas = data.map(p => ({
          ...p,
          host_username: p.usuarios?.username
        }));
      }
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async createGame() {
    this.loading = true;
    try {
      const { data: userAuth } = await this.supabase.auth.getUser();
      if (!userAuth.user) throw new Error("No autenticado");

      // Solución al FK constraint: Asegurar que el usuario existe en 'usuarios'
      await this.supabase.client.from('usuarios').upsert({
        id: this.myId,
        username: userAuth.user.email?.split('@')[0] || 'Entrenador'
      });

      const { data, error } = await this.supabase.client
        .from('partidas')
        .insert({
          id_jugador1: this.myId,
          estado: 'esperando',
          estado_juego: {}
        })
        .select()
        .single();
      
      if (error) throw error;
      this.router.navigate(['/game'], { queryParams: { online: true, matchId: data.id, role: 'host' } });
    } catch (e: any) {
      alert("Error al crear partida: " + e.message);
    } finally {
      this.loading = false;
      this.creating = false;
    }
  }

  async joinGame(matchId: string) {
    this.joining = true;
    try {
      const { error } = await this.supabase.client
        .from('partidas')
        .update({
          id_jugador2: this.myId,
          estado: 'en_curso'
        })
        .eq('id', matchId);

      if (error) throw error;
      this.router.navigate(['/game'], { queryParams: { online: true, matchId, role: 'guest' } });
    } catch (e: any) {
      alert("Error al unirse: " + e.message);
    } finally {
      this.joining = false;
    }
  }
}
