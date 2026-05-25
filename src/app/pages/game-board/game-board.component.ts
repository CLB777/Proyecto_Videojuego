import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { PokeapiService, PokemonCard } from '../../core/services/pokeapi/pokeapi.service';
import { SqliteService } from '../../core/services/sqlite/sqlite.service';
import { SupabaseService } from '../../core/services/supabase/supabase.service';
import { InventoryService } from '../../core/services/inventory/inventory.service';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Stadium BG and Container -->
    <div class="stadium-bg" [style.background-image]="currentArena" style="min-height: 100vh; display: flex; flex-direction: column; overflow: hidden; position: relative;">
      
      <!-- Cartel de Turno Cinemático -->
      <div *ngIf="showTurnBanner" class="turn-banner" [ngClass]="{'enemy': activeTurn === 'enemy'}">
        {{ activeTurn === 'player' ? 'TU TURNO' : 'TURNO DEL RIVAL' }}
      </div>

      <!-- Header HUD Premium sin encimarse -->
      <div class="hud-container" style="background: rgba(10, 10, 15, 0.85); border-bottom: 2px solid rgba(255,255,255,0.1); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 90; backdrop-filter: blur(5px); position: relative;">
        <!-- Botón Rendirse -->
        <div>
          <button class="btn" style="border-color: var(--neon-red); color: #fff; background: rgba(255,51,51,0.25); font-size: 0.9rem; padding: 0.5rem 1.5rem; transition: all 0.3s; box-shadow: 0 0 10px rgba(255,51,51,0.2);" (click)="abandonGame()">
            Rendirse
          </button>
        </div>

        <!-- Info Oponente -->
        <div class="glass-panel hud-info" style="padding: 0.5rem 1rem; border-color: var(--neon-red); background: rgba(20,0,0,0.5); min-width: 200px; text-align: center;">
          <div style="font-size: 0.75rem; color: var(--neon-red); text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">
            Rival {{ isOnline ? '(En Linea)' : '(IA - ' + difficulty + ')' }}
          </div>
          <div style="font-size: 0.9rem; color: #fff;">Cartas: {{ opponentBench.length + (opponentActive ? 1 : 0) }}</div>
        </div>

        <!-- Turno Central -->
        <div class="hud-title">
          <div class="glow-text-pink" style="font-size: 1.8rem; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; line-height: 1;">
            TURNO {{ turn }}
          </div>
        </div>

        <!-- Info Jugador -->
        <div class="glass-panel hud-info" style="padding: 0.5rem 1rem; border-color: var(--neon-cyan); background: rgba(0,20,40,0.5); min-width: 200px; text-align: center;">
          <div style="font-size: 0.75rem; color: var(--neon-cyan); text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">
            {{ username || 'Entrenador' }}
          </div>
          <div style="font-size: 0.9rem; color: #fff;">Cartas: {{ playerBench.length + (playerActive ? 1 : 0) }}</div>
        </div>
      </div>

      <div class="stadium-content" style="flex: 1; display: flex; flex-direction: column; position: relative; z-index: 10;" [class.shake]="shaking">
        
        <!-- Overlay Juego Terminado -->
        <div *ngIf="gameOver" style="position: absolute; inset: 0; background: rgba(0,0,0,0.9); z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
          <h1 class="title" [ngClass]="{'glow-text-cyan': winner === 'TÚ', 'glow-text-red': winner !== 'TÚ'}" style="font-size: 5rem; margin-bottom: 2rem; animation: summonCard 0.5s forwards;">
            {{ winner === 'TÚ' ? 'VICTORIA' : 'DERROTA' }}
          </h1>
          <p *ngIf="rewards && winner === 'TÚ'" style="color: var(--neon-cyan); font-size: 1.5rem; margin-bottom: 1rem;">
            +{{ rewards.recargas }} Recargas obtenidas.
          </p>
          <p *ngIf="rewards && rewards.sobres && winner === 'TÚ'" style="color: var(--neon-pink); font-size: 1.5rem; margin-bottom: 2rem; font-weight: bold; animation: pulse 1s infinite;">
            Ganaste 1 Sobre Nuevo
          </p>
          <p *ngIf="winner !== 'TÚ'" style="color: #ff3333; font-size: 1.5rem; margin-bottom: 2rem;">
            Vuelve a intentarlo...
          </p>
          <a routerLink="/home" class="btn btn-cyan" style="font-size: 1.5rem;">Volver al Cuartel</a>
        </div>

        <!-- Área de Combate 1v1 -->
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2rem; position: relative;">
          
          <!-- Elemento de Proyectil de Ataque Elemental -->
          <div *ngIf="attackProjectile" 
               [ngClass]="[attackProjectileType, attackProjectileDirection]"
               class="attack-projectile">
          </div>

          <!-- Oponente Activo -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; position: relative;">
            <div *ngIf="opponentDamage" class="floating-damage">{{ opponentDamage }}</div>
            <div *ngIf="opponentEffectiveMsg" style="position: absolute; top: -30px; color: var(--neon-pink); font-weight: 900; font-size: 1.5rem; text-shadow: 0 0 10px #000; animation: summonCard 0.3s forwards; z-index: 60;">{{ opponentEffectiveMsg }}</div>
            
            <div class="tcg-card combat-card-wrapper" [class.is-hidden]="turn === 1 && (playerActive === null || opponentActive === null)" [class.flash-red]="opponentFlash" [class.faint-animation]="opponentFainting">
              <div class="tcg-flip-inner">
                <div class="tcg-card-front" [ngClass]="'type-' + (opponentActive.types[0]?.toLowerCase() || 'normal')" *ngIf="opponentActive">
                  <!-- Header: Nombre + HP -->
                  <div class="tcg-header-v">
                    <div style="display: flex; align-items: center; font-weight: 900; font-size: 0.9rem; color: #fff;">
                      <span class="tcg-badge-v">V</span>{{ opponentActive.name }}
                      <span *ngIf="opponentActive.level && opponentActive.level > 1" style="color: var(--neon-pink); font-size: 0.75rem; font-weight: bold; margin-left: 4px;">Nv. {{ opponentActive.level }}</span>
                    </div>
                    <div style="font-size: 0.85rem; font-weight: bold; color: #fff; display: flex; align-items: center; gap: 4px;">
                      HP {{ opponentActive.hp | number:'1.0-0' }}
                      <span class="energy-badge" [ngClass]="'energy-' + (opponentActive.types[0]?.toLowerCase() || 'normal')"></span>
                    </div>
                  </div>
                  <!-- Imagen -->
                  <div class="tcg-image-container-v">
                    <img [src]="opponentActive.image">
                  </div>
                  <!-- Panel de Ataques -->
                  <div class="tcg-attack-panel-v">
                    <div *ngFor="let atk of getCardAttacks(opponentActive); let i = index" class="tcg-attack-row">
                      <div class="tcg-attack-info">
                        <span class="energy-badge" [ngClass]="'energy-' + (i === 1 ? (opponentActive.types[0]?.toLowerCase() || 'normal') : 'normal')"></span>
                        <span class="tcg-attack-name">{{ atk.name }}</span>
                      </div>
                      <span class="tcg-attack-damage">{{ atk.damage }}</span>
                    </div>
                  </div>
                </div>
                <div class="tcg-card-back"></div>
              </div>
            </div>
          </div>

          <!-- Centro: Indicadores de Acción y Guías -->
          <div style="height: 50px; display: flex; align-items: center; justify-content: center; z-index: 50;">
            <div *ngIf="activeTurn === 'player' && playerActive && opponentActive && !playerFainting && !opponentFainting && !isAttacking" 
                 style="font-size: 1.1rem; color: var(--neon-cyan); font-weight: 900; letter-spacing: 2px; text-shadow: 0 0 8px var(--neon-cyan); animation: pulse 1.5s infinite; text-align: center;">
              ¡HAZ CLIC EN UN ATAQUE DE TU CARTA PARA COMBATIR!
            </div>
            <div *ngIf="activeTurn === 'player' && isAttacking" 
                 style="font-size: 1.1rem; color: var(--neon-pink); font-weight: 900; letter-spacing: 2px; text-shadow: 0 0 8px var(--neon-pink); text-align: center;">
              EJECUTANDO MOVIMIENTO...
            </div>
            <div *ngIf="activeTurn === 'enemy' && !gameOver" 
                 style="font-size: 1.1rem; color: var(--neon-red); font-weight: 900; letter-spacing: 2px; text-shadow: 0 0 8px var(--neon-red); text-align: center;">
              EL RIVAL ESTÁ PREPARANDO SU ATAQUE...
            </div>
            <div *ngIf="!playerActive && activeTurn === 'player' && !gameOver" 
                 style="font-size: 1.2rem; color: var(--neon-cyan); font-weight: bold; animation: pulse 1s infinite; letter-spacing: 1px; text-align: center;">
              SELECCIONA UN POKÉMON DE TU BANCA PARA PELEAR
            </div>
          </div>

          <!-- Jugador Activo -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; position: relative;">
            <div *ngIf="playerDamage" class="floating-damage">{{ playerDamage }}</div>
            <div *ngIf="playerEffectiveMsg" style="position: absolute; top: -30px; color: var(--neon-pink); font-weight: 900; font-size: 1.5rem; text-shadow: 0 0 10px #000; animation: summonCard 0.3s forwards; z-index: 60;">{{ playerEffectiveMsg }}</div>
            
            <div class="tcg-card combat-card-wrapper" [class.summon-animation]="playerJustSummoned" [class.flash-red]="playerFlash" [class.faint-animation]="playerFainting">
              <div class="tcg-flip-inner">
                <div class="tcg-card-front" [ngClass]="'type-' + (playerActive.types[0]?.toLowerCase() || 'normal')" *ngIf="playerActive">
                  <!-- Header: Nombre + HP -->
                  <div class="tcg-header-v">
                    <div style="display: flex; align-items: center; font-weight: 900; font-size: 0.9rem; color: #fff;">
                      <span class="tcg-badge-v">V</span>{{ playerActive.name }}
                      <span *ngIf="playerActive.level && playerActive.level > 1" style="color: var(--neon-pink); font-size: 0.75rem; font-weight: bold; margin-left: 4px;">Nv. {{ playerActive.level }}</span>
                    </div>
                    <div style="font-size: 0.85rem; font-weight: bold; color: #fff; display: flex; align-items: center; gap: 4px;">
                      HP {{ playerActive.hp | number:'1.0-0' }}
                      <span class="energy-badge" [ngClass]="'energy-' + (playerActive.types[0]?.toLowerCase() || 'normal')"></span>
                    </div>
                  </div>
                  <!-- Imagen -->
                  <div class="tcg-image-container-v">
                    <img [src]="playerActive.image">
                  </div>
                  <!-- Panel de Ataques (Estilo Mewtwo V, INTERACTIVO para el jugador) -->
                  <div class="tcg-attack-panel-v">
                    <div *ngFor="let atk of getCardAttacks(playerActive); let idx = index" 
                         (click)="!actionBlocked && !isAttacking && attackOpponent(idx + 1)"
                         [class.interactive]="!actionBlocked && !isAttacking"
                         [class.active-atk]="activeTurn === 'player' && !actionBlocked && !isAttacking"
                         class="tcg-attack-row">
                      <div class="tcg-attack-info">
                        <span class="energy-badge" [ngClass]="'energy-' + (idx === 1 ? (playerActive.types[0]?.toLowerCase() || 'normal') : 'normal')"></span>
                        <span class="tcg-attack-name">{{ atk.name }}</span>
                      </div>
                      <span class="tcg-attack-damage">{{ atk.damage }}</span>
                    </div>
                  </div>
                </div>
                <div class="tcg-card-front" *ngIf="!playerActive" style="align-items: center; justify-content: center; background: rgba(0,0,0,0.5);">
                </div>
                <div class="tcg-card-back"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Banca del Jugador -->
        <div class="bench-container" style="height: 180px; background: rgba(0,0,0,0.85); border-top: 4px solid var(--neon-purple); display: flex; gap: 1.5rem; padding: 1.5rem; overflow-x: auto; align-items: flex-end; justify-content: center; border-radius: 12px 12px 0 0; z-index: 10; box-shadow: 0 -10px 30px rgba(0,0,0,0.5); position: relative;">
          
          <div style="position: absolute; left: 1rem; bottom: 145px; color: var(--neon-purple); font-weight: bold; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px;">Tu Banca</div>
          <div *ngFor="let card of playerBench; let i = index" 
               (click)="setActivePokemon(i)"
               [ngClass]="'type-' + (card.types[0]?.toLowerCase() || 'normal')"
               class="tcg-card" style="width: 120px; height: 160px; min-width: 120px; transition: transform 0.3s; transform-origin: bottom; cursor: pointer;"
               [style.opacity]="!playerActive ? 1 : 0.5">
            <div class="tcg-flip-inner">
              <div class="tcg-card-front" style="background: transparent;">
                <div class="tcg-header-v" style="padding: 0.2rem 0.4rem;">
                  <span style="font-size: 0.65rem; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70px;">{{ card.name }}</span>
                  <span class="energy-badge" [ngClass]="'energy-' + (card.types[0]?.toLowerCase() || 'normal')" style="width: 10px; height: 10px; font-size: 0.45rem;"></span>
                </div>
                <div class="tcg-image-container-v" style="min-height: 70px;">
                  <img [src]="card.image" style="height: 50px;">
                </div>
                <div class="tcg-content" style="padding: 0.2rem; text-align: center; background: rgba(0,0,0,0.55); z-index: 10;">
                  <div style="font-size: 0.65rem; color: #fff; font-weight: bold; white-space: nowrap;">
                    HP: {{ card.hp }}
                    <span *ngIf="card.level && card.level > 1" style="color: var(--neon-pink); font-size: 0.55rem; font-weight: bold; margin-left: 2px;">Nv.{{ card.level }}</span>
                  </div>
                </div>
              </div>
              <div class="tcg-card-back"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class GameBoardComponent implements OnInit, OnDestroy {
  // Audio Context and Opponent Info
  audioCtx: AudioContext | null = null;
  opponentId = '';
  opponentUsername = 'Entrenador Online';

  // Estado Jugador
  playerBench: PokemonCard[] = [];
  playerActive: PokemonCard | null = null;
  playerActiveMaxHP = 0;

  // Estado Oponente
  opponentBench: PokemonCard[] = [];
  opponentActive: PokemonCard | null = null;
  opponentActiveMaxHP = 0;
  
  turn = 1;
  activeTurn: 'player' | 'enemy' = 'player';
  
  gameOver = false;
  winner = '';
  difficulty = 'medio';

  isOnline = false;
  matchId = '';
  role = ''; 
  channel: any;
  rewards: any = null;
  username = '';
  isAttacking = false;

  get actionBlocked(): boolean {
    return this.activeTurn !== 'player' || this.showTurnBanner || this.isAttacking || this.gameOver || !this.playerActive || !this.opponentActive || this.playerFainting || this.opponentFainting;
  }

  // Animaciones Cinemáticas
  shaking = false;
  opponentDamage = '';
  opponentFlash = false;
  opponentEffectiveMsg = '';
  opponentFainting = false;

  playerDamage = '';
  playerFlash = false;
  playerEffectiveMsg = '';
  playerFainting = false;
  playerJustSummoned = false;
  attackProjectile = false;
  attackProjectileType = 'normal-proj';
  attackProjectileDirection: 'player-atk' | 'enemy-atk' = 'player-atk';
  showTurnBanner = false;

  // Rotación Dinámica de Arenas (Estadios de batalla fotorrealistas optimizados para carga rápida)
  arenaBackgrounds = [
    'url("https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=60")', // Bosque (Planta)
    'url("https://images.unsplash.com/photo-1461696114087-3972713f9fc5?auto=format&fit=crop&w=1200&q=60")', // Volcán (Fuego)
    'url("https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1200&q=60")', // Costa (Agua)
    'url("https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=1200&q=60")', // Espacio (Psíquico)
    'url("https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=60")', // Cyber Neón (Eléctrico)
    'url("https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=60")'  // Desierto (Tierra/Normal)
  ];
  currentArena = 'radial-gradient(circle at center, #0f0f15 0%, #05050a 100%)';

  private pokeapi = inject(PokeapiService);
  private sqlite = inject(SqliteService);
  private supabase = inject(SupabaseService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventoryService = inject(InventoryService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    let chosen = this.arenaBackgrounds[Math.floor(Math.random() * this.arenaBackgrounds.length)];

    // Seleccionar estadio al azar evitando repeticiones consecutivas
    const lastArena = localStorage.getItem('tcg_last_arena');
    let availableArenas = this.arenaBackgrounds;
    if (lastArena && this.arenaBackgrounds.includes(lastArena)) {
      availableArenas = this.arenaBackgrounds.filter(a => a !== lastArena);
    }
    chosen = availableArenas[Math.floor(Math.random() * availableArenas.length)];
    localStorage.setItem('tcg_last_arena', chosen);

    // Pre-cargar la imagen en memoria para evitar demoras visuales
    const cleanUrl = chosen.replace(/url\(['"]?/, '').replace(/['"]?\)/, '');
    const img = new Image();
    img.onload = () => {
      this.currentArena = chosen;
      this.cdr.detectChanges();
    };
    img.src = cleanUrl;

    this.route.queryParams.subscribe(async params => {
      if (params['online']) {
        this.isOnline = true;
        this.matchId = params['matchId'];
        this.role = params['role'];
        this.setupOnline();
      } else {
        this.difficulty = params['difficulty'] || 'medio';
        this.setupOffline();
      }
    });
  }

  ngOnDestroy() {
    if (this.channel) this.channel.unsubscribe();
  }

  async setupOnline() {
    const inv = await this.inventoryService.getInventory();
    const { data: userAuth } = await this.supabase.auth.getUser();
    let deck: any[] = [];
    if (userAuth.user) {
      // Asegurar que el usuario existe en 'usuarios' para joins
      await this.supabase.client.from('usuarios').upsert({
        id: userAuth.user.id,
        username: userAuth.user.email?.split('@')[0] || 'Entrenador'
      });

      const { data: userData } = await this.supabase.client.from('usuarios').select('username').eq('id', userAuth.user.id).single();
      if (userData && userData.username) {
        this.username = userData.username;
      }
      
      const { data, error } = await this.supabase.client
        .from('mazos')
        .select('cartas')
        .eq('id_usuario', userAuth.user.id)
        .limit(1);

      if (!error && data && data.length > 0 && data[0].cartas) {
        deck = data[0].cartas;
      }

      // Intentar cargar la info del oponente de la base de datos de manera inicial
      try {
        const { data: matchData } = await this.supabase.client
          .from('partidas')
          .select('*, jugador1:usuarios!partidas_id_jugador1_fkey(username), jugador2:usuarios!partidas_id_jugador2_fkey(username)')
          .eq('id', this.matchId)
          .single();
        if (matchData) {
          if (this.role === 'host' && matchData.id_jugador2) {
            this.opponentId = matchData.id_jugador2;
            if (matchData.jugador2) this.opponentUsername = matchData.jugador2.username;
          } else if (this.role === 'guest' && matchData.id_jugador1) {
            this.opponentId = matchData.id_jugador1;
            if (matchData.jugador1) this.opponentUsername = matchData.jugador1.username;
          }
        }
      } catch (err) {
        console.error("Error fetching match participants:", err);
      }
    }
    
    if (deck && deck.length > 0) {
      // Sincronizar estadísticas y niveles con el inventario actual
      const syncedDeck = deck.map((savedCard: any) => {
        const invCard = inv.cartas.find(c => c.name.toLowerCase() === savedCard.name.toLowerCase());
        return invCard ? { ...savedCard, level: invCard.level, attack: invCard.attack, defense: invCard.defense, hp: invCard.hp } : savedCard;
      });
      this.playerBench = JSON.parse(JSON.stringify(syncedDeck));
      if (this.playerBench.length < 5) {
        const missing = 5 - this.playerBench.length;
        const extras = await this.pokeapi.getRandomPokemonCards(missing);
        this.playerBench.push(...extras);
      }
    } else {
      this.playerBench = await this.pokeapi.getRandomPokemonCards(5);
    }

    this.opponentBench = [];
    this.opponentActive = null;

    // Suscribirse al canal en tiempo real
    this.channel = this.supabase.client.channel(`match_${this.matchId}`, {
      config: {
        broadcast: { self: false }
      }
    });

    this.channel
      .on('broadcast', { event: 'JOIN' }, (payload: any) => {
        if (payload.payload) {
          if (payload.payload.username) this.opponentUsername = payload.payload.username;
          if (payload.payload.id) this.opponentId = payload.payload.id;
        }
        if (this.role === 'host') {
          this.channel.send({
            type: 'broadcast',
            event: 'DECK',
            payload: { deck: this.playerBench, username: this.username, id: userAuth?.user?.id }
          });
        }
        this.cdr.detectChanges();
      })
      .on('broadcast', { event: 'DECK' }, (payload: any) => {
        this.opponentBench = payload.payload.deck;
        if (payload.payload) {
          if (payload.payload.username) this.opponentUsername = payload.payload.username;
          if (payload.payload.id) this.opponentId = payload.payload.id;
        }
        
        if (this.role === 'guest') {
          this.channel.send({
            type: 'broadcast',
            event: 'DECK',
            payload: { deck: this.playerBench, username: this.username, id: userAuth?.user?.id }
          });
        }
        
        // Host empieza (player), Guest espera (enemy)
        this.activeTurn = this.role === 'host' ? 'player' : 'enemy';
        this.triggerTurnBanner(this.activeTurn);
        this.cdr.detectChanges();
      })
      .on('broadcast', { event: 'SET_ACTIVE' }, (payload: any) => {
        const card = payload.payload.card;
        this.opponentActive = card;
        if (card) {
          this.opponentActiveMaxHP = card.hp;
          this.opponentBench = this.opponentBench.filter(c => c.name !== card.name);
        }
        this.cdr.detectChanges();
      })
      .on('broadcast', { event: 'ATTACK' }, (payload: any) => {
        const dmg = payload.payload.damage;
        const mult = payload.payload.multiplier;
        const attackName = payload.payload.attackName || 'Ataque';
        
        // Lanzar proyectil del oponente en su dirección
        const projType = this.opponentActive ? this.getProjectileType(this.opponentActive) : 'normal-proj';
        this.attackProjectileType = projType;
        this.attackProjectileDirection = 'enemy-atk';
        this.attackProjectile = true;
        this.cdr.detectChanges();
        this.playSynthSound('attack');

        setTimeout(() => {
          this.attackProjectile = false;
          this.playSynthSound('hit');

          this.triggerShake();
          this.playerFlash = true;
          this.playerDamage = `-${dmg}`;
          
          this.playerEffectiveMsg = `¡El rival usó ${attackName}!`;
          if (mult === 2) this.playerEffectiveMsg += " (Súper Efectivo)";
          else if (mult === 0.5) this.playerEffectiveMsg += " (Poco Efectivo)";

          setTimeout(() => { this.playerFlash = false; this.playerDamage = ''; this.playerEffectiveMsg = ''; }, 1800);

          if (this.playerActive) {
            this.playerActive.hp = payload.payload.newHp;
            if (this.playerActive.hp <= 0) {
              this.playSynthSound('faint');
              this.playerFainting = true;
              this.cdr.detectChanges();
              setTimeout(async () => {
                this.playerFainting = false;
                this.playerActive = null;
                this.cdr.detectChanges();
                await this.checkWinCondition();
              }, 1500);
            }
          }
          this.cdr.detectChanges();
        }, 400);
      })
      .on('broadcast', { event: 'END_TURN' }, (payload: any) => {
        this.turn = payload.payload.turn + 1;
        this.activeTurn = 'player';
        this.triggerTurnBanner('player');
        this.cdr.detectChanges();
      })
      .on('broadcast', { event: 'SURRENDER' }, (payload: any) => {
        this.gameOver = true;
        this.winner = 'TÚ';
        this.saveMatchHistory('win');
        this.cdr.detectChanges();
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          this.channel.send({
            type: 'broadcast',
            event: 'JOIN',
            payload: { username: this.username, id: userAuth?.user?.id }
          });
        }
      });
  }

  async setupOffline() {
    const inv = await this.inventoryService.getInventory();
    const { data: userAuth } = await this.supabase.auth.getUser();
    let deck: any[] = [];
    if (userAuth.user) {
      const { data: userData } = await this.supabase.client.from('usuarios').select('username').eq('id', userAuth.user.id).single();
      if (userData && userData.username) {
        this.username = userData.username;
      }
      
      const { data, error } = await this.supabase.client
        .from('mazos')
        .select('cartas')
        .eq('id_usuario', userAuth.user.id)
        .limit(1);

      if (!error && data && data.length > 0 && data[0].cartas) {
        deck = data[0].cartas;
      }
    }
    
    if (deck && deck.length > 0) {
      // Sincronizar estadísticas y niveles con el inventario actual
      const syncedDeck = deck.map((savedCard: any) => {
        const invCard = inv.cartas.find(c => c.name.toLowerCase() === savedCard.name.toLowerCase());
        return invCard ? { ...savedCard, level: invCard.level, attack: invCard.attack, defense: invCard.defense, hp: invCard.hp } : savedCard;
      });
      this.playerBench = JSON.parse(JSON.stringify(syncedDeck));
      if (this.playerBench.length < 5) {
        const missing = 5 - this.playerBench.length;
        const extras = await this.pokeapi.getRandomPokemonCards(missing);
        this.playerBench.push(...extras);
      }
    } else {
      this.playerBench = await this.pokeapi.getRandomPokemonCards(5);
    }
    
    // Obtener cartas del oponente y aplicar dificultad
    const rawOpponent = await this.pokeapi.getRandomPokemonCards(5);
    this.opponentBench = rawOpponent.map(card => {
      const cloned = JSON.parse(JSON.stringify(card));
      if (this.difficulty === 'facil') {
        cloned.hp = Math.floor(cloned.hp * 0.65);
        cloned.attack = Math.floor(cloned.attack * 0.65);
        cloned.defense = Math.floor(cloned.defense * 0.65);
        cloned.level = 1;
      } else if (this.difficulty === 'dificil') {
        cloned.hp = Math.floor(cloned.hp * 1.35);
        cloned.attack = Math.floor(cloned.attack * 1.35);
        cloned.defense = Math.floor(cloned.defense * 1.35);
        cloned.level = 5;
      } else {
        cloned.level = 2;
      }
      return cloned;
    });
    
    this.opponentActive = this.opponentBench.shift() || null;
    if (this.opponentActive) this.opponentActiveMaxHP = this.opponentActive.hp;

    this.triggerTurnBanner('player');
    this.cdr.detectChanges();
  }

  triggerTurnBanner(turn: 'player' | 'enemy') {
    this.activeTurn = turn;
    this.showTurnBanner = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showTurnBanner = false;
      this.cdr.detectChanges();
    }, 2000);
  }

  setActivePokemon(index: number) {
    if (this.playerActive !== null) return;
    
    this.playerActive = this.playerBench[index];
    this.playerActiveMaxHP = this.playerActive.hp;
    this.playerBench.splice(index, 1);
    
    this.playerJustSummoned = true;
    setTimeout(() => { this.playerJustSummoned = false; }, 600);
    
    if (this.isOnline) {
      this.channel.send({
        type: 'broadcast',
        event: 'SET_ACTIVE',
        payload: { card: this.playerActive }
      });
    } else {
      if (!this.opponentActive && this.opponentBench.length > 0) {
        this.opponentActive = this.opponentBench.shift() || null;
        if (this.opponentActive) this.opponentActiveMaxHP = this.opponentActive.hp;
      }
    }

    this.cdr.detectChanges();
  }

  calculateDamage(attacker: PokemonCard, defender: PokemonCard): { dmg: number, multiplier: number } {
    let multiplier = 1;
    const typeA = attacker.types[0]?.toLowerCase();
    const typeD = defender.types[0]?.toLowerCase();

    // Ventajas elementales
    if (typeA === 'water' && typeD === 'fire') multiplier = 2;
    if (typeA === 'fire' && typeD === 'grass') multiplier = 2;
    if (typeA === 'grass' && typeD === 'water') multiplier = 2;
    if (typeA === 'electric' && typeD === 'water') multiplier = 2;
    if (typeA === 'psychic' && typeD === 'poison') multiplier = 2;

    // Resistencias elementales
    if (typeA === 'fire' && typeD === 'water') multiplier = 0.5;
    if (typeA === 'grass' && typeD === 'fire') multiplier = 0.5;
    if (typeA === 'water' && typeD === 'grass') multiplier = 0.5;

    // Nueva fórmula de daño más agresiva para combates rápidos
    // Incrementamos el peso del ataque base y reducimos el escudo de defensa para evitar el "daño 20" infinito
    let baseAttack = attacker.attack * 1.5; 
    let effDefense = defender.defense * 0.7;
    
    let dmg = Math.floor((baseAttack * multiplier) - effDefense);
    
    // Daño mínimo garantizado del 10% de la vida del rival para asegurar que nadie sea inmortal
    const minDmg = Math.floor(defender.hp * 0.15) || 100;
    if (dmg < minDmg) dmg = minDmg;

    return { dmg, multiplier };
  }

  triggerShake() {
    this.shaking = false;
    setTimeout(() => { this.shaking = true; }, 10);
    setTimeout(() => { this.shaking = false; }, 510);
  }

  getCardAttacks(card: PokemonCard) {
    if (!card) return [];
    const type = card.types[0]?.toLowerCase() || 'normal';
    let atk1 = { name: 'Golpe Cuerpo', damage: Math.round(card.attack * 0.65) };
    let atk2 = { name: card.specialAbility || 'Fuerza Bruta', damage: card.attack };

    if (type === 'fire') {
      atk1 = { name: 'Pistola Ígnea', damage: Math.round(card.attack * 0.65) };
      atk2 = { name: 'Llamarada', damage: card.attack };
    } else if (type === 'water') {
      atk1 = { name: 'Pistola Agua', damage: Math.round(card.attack * 0.65) };
      atk2 = { name: 'Hidrobomba', damage: card.attack };
    } else if (type === 'grass') {
      atk1 = { name: 'Hoja Afilada', damage: Math.round(card.attack * 0.65) };
      atk2 = { name: 'Rayo Solar', damage: card.attack };
    } else if (type === 'electric') {
      atk1 = { name: 'Impactrueno', damage: Math.round(card.attack * 0.65) };
      atk2 = { name: 'Trueno', damage: card.attack };
    } else if (type === 'psychic') {
      atk1 = { name: 'Psicorrayo', damage: Math.round(card.attack * 0.65) };
      atk2 = { name: 'Psíquico', damage: card.attack };
    } else if (type === 'poison') {
      atk1 = { name: 'Picotazo Veneno', damage: Math.round(card.attack * 0.65) };
      atk2 = { name: 'Bomba Lodo', damage: card.attack };
    }
    
    return [atk1, atk2];
  }

  getProjectileType(card: PokemonCard): string {
    if (!card) return 'normal-proj';
    const type = card.types[0]?.toLowerCase() || 'normal';
    if (type === 'electric') return 'electric-proj';
    if (['fire', 'dragon'].includes(type)) return 'fire-proj';
    if (['water', 'ice'].includes(type)) return 'water-proj';
    if (['grass', 'bug'].includes(type)) return 'grass-proj';
    if (['psychic', 'ghost', 'fairy'].includes(type)) return 'psychic-proj';
    return 'normal-proj';
  }

  async attackOpponent(attackNum: number = 1) {
    if (this.activeTurn !== 'player' || !this.playerActive || !this.opponentActive || this.actionBlocked || this.isAttacking) return;

    this.isAttacking = true;
    this.cdr.detectChanges();

    const attacks = this.getCardAttacks(this.playerActive);
    const chosenAttack = attacks[attackNum - 1];

    // Lanzar proyectil visual correspondiente
    const projType = this.getProjectileType(this.playerActive);
    this.attackProjectileType = projType;
    this.attackProjectileDirection = 'player-atk';
    this.attackProjectile = true;
    this.cdr.detectChanges();

    this.playSynthSound('attack');

    // Esperar 400ms a que el proyectil viaje
    await new Promise(resolve => setTimeout(resolve, 400));

    // Desactivar proyectil al impactar
    this.attackProjectile = false;
    this.playSynthSound('hit');

    // Calcular daño base
    let { dmg, multiplier } = this.calculateDamage(this.playerActive, this.opponentActive);
    
    // El Ataque 1 (Básico) tiene daño reducido
    if (attackNum === 1) {
      dmg = Math.floor(dmg * 0.65);
    }

    this.triggerShake();
    this.opponentFlash = true;
    this.opponentDamage = `-${dmg}`;
    
    // Mensaje descriptivo del ataque usado
    this.opponentEffectiveMsg = `¡${this.playerActive.name} usó ${chosenAttack.name}!`;
    if (multiplier === 2) this.opponentEffectiveMsg += " (Súper Efectivo)";
    else if (multiplier === 0.5) this.opponentEffectiveMsg += " (Poco Efectivo)";
    
    setTimeout(() => { this.opponentFlash = false; this.opponentDamage = ''; this.opponentEffectiveMsg = ''; }, 1800);

    this.opponentActive.hp -= dmg;
    this.cdr.detectChanges();
    
    if (this.isOnline) {
      this.channel.send({
        type: 'broadcast',
        event: 'ATTACK',
        payload: { damage: dmg, multiplier, newHp: this.opponentActive.hp, attackName: chosenAttack.name }
      });
    }

    // Check Muerte Rival
    if (this.opponentActive.hp <= 0) {
      this.playSynthSound('faint');
      this.opponentFainting = true;
      this.cdr.detectChanges();
      
      setTimeout(async () => {
        this.opponentFainting = false;
        this.opponentActive = null;
        this.cdr.detectChanges();
        await this.checkWinCondition();
        if (!this.gameOver) {
          this.endTurn();
        } else {
          this.isAttacking = false;
        }
      }, 1500);
    } else {
      setTimeout(() => {
        this.endTurn();
      }, 1200);
    }
  }

  async endTurn() {
    this.isAttacking = false;
    
    if (this.isOnline) {
      this.activeTurn = 'enemy';
      this.triggerTurnBanner('enemy');
      this.channel.send({
        type: 'broadcast',
        event: 'END_TURN',
        payload: { turn: this.turn }
      });
      this.cdr.detectChanges();
      return;
    }

    this.turn++;
    this.triggerTurnBanner('enemy');
    
    // IA Flow con dificultades adaptadas
    setTimeout(async () => {
      if (!this.opponentActive && this.opponentBench.length > 0) {
        this.opponentActive = this.opponentBench.shift() || null;
        if (this.opponentActive) this.opponentActiveMaxHP = this.opponentActive.hp;
        this.cdr.detectChanges();
        await new Promise(r => setTimeout(r, 800));
      }

      if (this.opponentActive && this.playerActive) {
        // La IA selecciona ataque según dificultad (Difícil usa más ataque especial)
        let attackNum: 1 | 2 = 1;
        const rand = Math.random();
        if (this.difficulty === 'dificil') {
          attackNum = rand < 0.7 ? 2 : 1;
        } else if (this.difficulty === 'facil') {
          attackNum = rand < 0.2 ? 2 : 1;
        } else {
          attackNum = rand < 0.5 ? 2 : 1;
        }

        // Penalización Dificultad Fácil: 30% de probabilidad de fallar turno
        if (this.difficulty === 'facil' && Math.random() < 0.3) {
          this.playerDamage = '¡Fallo!';
          this.playerEffectiveMsg = `¡${this.opponentActive.name} se distrajo y no atacó!`;
          this.playSynthSound('faint');
          
          setTimeout(() => {
            this.playerDamage = '';
            this.playerEffectiveMsg = '';
            this.triggerTurnBanner('player');
          }, 1800);
          return;
        }

        const attacks = this.getCardAttacks(this.opponentActive);
        const chosenAttack = attacks[attackNum - 1];

        // Lanzar proyectil de la IA
        const projType = this.getProjectileType(this.opponentActive);
        this.attackProjectileType = projType;
        this.attackProjectileDirection = 'enemy-atk';
        this.attackProjectile = true;
        this.cdr.detectChanges();

        this.playSynthSound('attack');

        // Esperar 400ms a que el proyectil viaje
        await new Promise(resolve => setTimeout(resolve, 400));

        // Desactivar proyectil e impacto
        this.attackProjectile = false;
        this.playSynthSound('hit');

        let { dmg, multiplier } = this.calculateDamage(this.opponentActive, this.playerActive);
        if (attackNum === 1) {
          dmg = Math.floor(dmg * 0.65);
        }

        // Bonificación Dificultad Difícil: 25% de golpe crítico
        let isCritical = false;
        if (this.difficulty === 'dificil' && Math.random() < 0.25) {
          dmg = Math.floor(dmg * 1.5);
          isCritical = true;
        }

        this.triggerShake();
        this.playerFlash = true;
        this.playerDamage = `-${dmg}`;
        
        this.playerEffectiveMsg = `¡${this.opponentActive.name} usó ${chosenAttack.name}!`;
        if (isCritical) {
          this.playerEffectiveMsg = `¡CRÍTICO! ${this.opponentActive.name} usó ${chosenAttack.name}`;
        } else if (multiplier === 2) {
          this.playerEffectiveMsg += " (Súper Efectivo)";
        } else if (multiplier === 0.5) {
          this.playerEffectiveMsg += " (Poco Efectivo)";
        }
        
        setTimeout(() => { this.playerFlash = false; this.playerDamage = ''; this.playerEffectiveMsg = ''; }, 1800);

        this.playerActive.hp -= dmg;
        this.cdr.detectChanges();

        if (this.playerActive.hp <= 0) {
          this.playSynthSound('faint');
          this.playerFainting = true;
          this.cdr.detectChanges();
          
          setTimeout(async () => {
            this.playerFainting = false;
            this.playerActive = null;
            this.cdr.detectChanges();
            await this.checkWinCondition();
            if (!this.gameOver) {
              this.triggerTurnBanner('player');
            }
          }, 1500);
        } else {
          setTimeout(() => {
            this.triggerTurnBanner('player');
          }, 1500);
        }
      } else {
        this.triggerTurnBanner('player');
      }
    }, 2000);
  }

  async abandonGame() {
    this.gameOver = true;
    this.winner = this.isOnline ? 'EL RIVAL (Por Abandono)' : 'LA IA (Por Abandono)';
    this.playSynthSound('defeat');
    this.saveMatchHistory('lose');
    
    if (this.isOnline) {
      this.channel.send({
        type: 'broadcast',
        event: 'SURRENDER',
        payload: { winner: 'opponent' }
      });
      const { data: userAuth } = await this.supabase.auth.getUser();
      if (userAuth.user) {
        let finalWinnerId: string | null = null;
        if (this.opponentId) {
          finalWinnerId = this.opponentId;
        } else {
          try {
            const { data: matchData } = await this.supabase.client
              .from('partidas')
              .select('id_jugador1, id_jugador2')
              .eq('id', this.matchId)
              .single();
            if (matchData) {
              finalWinnerId = matchData.id_jugador1 === userAuth.user.id ? matchData.id_jugador2 : matchData.id_jugador1;
            }
          } catch (err) {
            console.error("Error fetching opponent ID for surrender:", err);
          }
        }

        await this.supabase.client.from('partidas').update({
          estado: 'finalizada',
          ganador: finalWinnerId
        }).eq('id', this.matchId);
      }
    }
    
    this.cdr.detectChanges();
  }

  async checkWinCondition() {
    if ((!this.playerActive && this.playerBench.length === 0) || (!this.opponentActive && this.opponentBench.length === 0)) {
      this.gameOver = true;
      this.winner = (!this.opponentActive && this.opponentBench.length === 0) ? 'TÚ' : (this.isOnline ? 'EL RIVAL' : 'LA IA');
      
      const result = this.winner === 'TÚ' ? 'win' : 'lose';
      this.saveMatchHistory(result);

      if (this.isOnline) {
        const { data: userAuth } = await this.supabase.auth.getUser();
        if (userAuth.user) {
          const isWinner = this.winner === 'TÚ';
          let finalWinnerId: string | null = null;
          if (isWinner) {
            finalWinnerId = userAuth.user.id;
          } else if (this.opponentId) {
            finalWinnerId = this.opponentId;
          } else {
            try {
              const { data: matchData } = await this.supabase.client
                .from('partidas')
                .select('id_jugador1, id_jugador2')
                .eq('id', this.matchId)
                .single();
              if (matchData) {
                finalWinnerId = matchData.id_jugador1 === userAuth.user.id ? matchData.id_jugador2 : matchData.id_jugador1;
              }
            } catch (err) {
              console.error("Error fetching opponent ID for win check:", err);
            }
          }

          await this.supabase.client.from('partidas').update({
            estado: 'finalizada',
            ganador: finalWinnerId
          }).eq('id', this.matchId);
        }
      }

      if (this.winner === 'TÚ') {
        this.playSynthSound('victory');
        try {
          const rewardStats = await this.inventoryService.addWinRewards(this.isOnline);
          this.rewards = {
            recargas: rewardStats.recargasEarned,
            sobres: rewardStats.packEarned
          };
        } catch(e) {
          console.error("Error al asignar recompensas:", e);
        }
      } else {
        this.playSynthSound('defeat');
      }

      this.cdr.detectChanges();
    }
  }

  getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playSynthSound(type: 'attack' | 'hit' | 'faint' | 'victory' | 'defeat') {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (type === 'attack') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(20, now + 0.25);
        
        const noise = ctx.createOscillator();
        const noiseGain = ctx.createGain();
        noise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.type = 'sawtooth';
        noise.frequency.setValueAtTime(80, now);
        noiseGain.gain.setValueAtTime(0.25, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        noise.start(now);
        noise.stop(now + 0.2);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'faint') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.7);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);
      } else if (type === 'victory') {
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, index) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, now + index * 0.12);
          g.gain.setValueAtTime(0.15, now + index * 0.12);
          g.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + 0.4);
          o.start(now + index * 0.12);
          o.stop(now + index * 0.12 + 0.45);
        });
      } else if (type === 'defeat') {
        const notes = [392.00, 349.23, 311.13, 246.94]; // Sad descending minor chord
        notes.forEach((freq, index) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(freq, now + index * 0.15);
          g.gain.setValueAtTime(0.12, now + index * 0.15);
          g.gain.exponentialRampToValueAtTime(0.001, now + index * 0.15 + 0.5);
          o.start(now + index * 0.15);
          o.stop(now + index * 0.15 + 0.55);
        });
      }
    } catch (e) {
      console.warn("AudioContext error:", e);
    }
  }

  async saveMatchHistory(result: string) {
    try {
      const matchData = {
        result,
        timestamp: new Date().toISOString(),
        mode: this.isOnline ? 'online' : 'offline',
        difficulty: this.difficulty
      };
      
      if (!this.isOnline) {
        await this.sqlite.saveOfflineMatch(matchData);
      }
    } catch(e) {
      console.error(e);
    }
  }
}
