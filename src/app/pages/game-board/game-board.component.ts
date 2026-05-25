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
      <div style="background: rgba(10, 10, 15, 0.85); border-bottom: 2px solid rgba(255,255,255,0.1); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 90; backdrop-filter: blur(5px); position: relative;">
        <!-- Botón Rendirse -->
        <div>
          <button class="btn" style="border-color: var(--neon-red); color: #fff; background: rgba(255,51,51,0.25); font-size: 0.9rem; padding: 0.5rem 1.5rem; transition: all 0.3s; box-shadow: 0 0 10px rgba(255,51,51,0.2);" (click)="abandonGame()">
            Rendirse
          </button>
        </div>

        <!-- Info Oponente -->
        <div class="glass-panel" style="padding: 0.5rem 1rem; border-color: var(--neon-red); background: rgba(20,0,0,0.5); min-width: 200px; text-align: center;">
          <div style="font-size: 0.75rem; color: var(--neon-red); text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">
            Rival {{ isOnline ? '(En Linea)' : '(IA - ' + difficulty + ')' }}
          </div>
          <div style="font-size: 0.9rem; color: #fff;">Cartas: {{ opponentBench.length + (opponentActive ? 1 : 0) }}</div>
        </div>

        <!-- Turno Central -->
        <div style="text-align: center;">
          <div class="glow-text-pink" style="font-size: 1.8rem; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; line-height: 1;">
            TURNO {{ turn }}
          </div>
        </div>

        <!-- Info Jugador -->
        <div class="glass-panel" style="padding: 0.5rem 1rem; border-color: var(--neon-cyan); background: rgba(0,20,40,0.5); min-width: 200px; text-align: center;">
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
               [ngClass]="attackProjectile"
               class="attack-projectile">
          </div>

          <!-- Oponente Activo -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; position: relative;">
            <div *ngIf="opponentDamage" class="floating-damage">{{ opponentDamage }}</div>
            <div *ngIf="opponentEffectiveMsg" style="position: absolute; top: -30px; color: var(--neon-pink); font-weight: 900; font-size: 1.5rem; text-shadow: 0 0 10px #000; animation: summonCard 0.3s forwards; z-index: 60;">{{ opponentEffectiveMsg }}</div>
            
            <div class="tcg-card" [class.is-hidden]="turn === 1 && activeTurn === 'player' && !playerActive" [class.flash-red]="opponentFlash" [class.faint-animation]="opponentFainting" style="width: 180px; height: 260px; border-color: var(--neon-red); transform: scale(1.2);">
              <div class="tcg-flip-inner">
                <div class="tcg-card-front" *ngIf="opponentActive">
                  <div class="tcg-image-container" style="min-height: 120px;"><img [src]="opponentActive.image" style="height: 100px;"></div>
                  <div class="tcg-content" style="padding: 0.5rem; text-align: center;">
                    <div style="font-size: 1rem; font-weight: bold;">
                      {{ opponentActive.name }} <span *ngIf="opponentActive.level && opponentActive.level > 1" style="color: var(--neon-pink); font-size: 0.8rem; font-weight: bold; margin-left: 3px;">Nv. {{ opponentActive.level }}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: #ff5555; font-weight: 900;">ATK: {{ opponentActive.attack }} | DEF: {{ opponentActive.defense }}</div>
                    <div style="font-size: 0.7rem; color: #aaa; text-transform: uppercase;">Tipo: {{ opponentActive.types[0] }}</div>
                    <div style="margin-top: 0.5rem; background: #333; height: 10px; border-radius: 5px; overflow: hidden; border: 1px solid #000;">
                       <div style="background: linear-gradient(90deg, #f00, #ff0); height: 100%; transition: width 0.5s;" [style.width.%]="(opponentActive.hp / opponentActiveMaxHP) * 100"></div>
                    </div>
                    <div style="font-size: 0.8rem; margin-top: 2px; font-weight: bold;">HP: {{ opponentActive.hp | number:'1.0-0' }} / {{ opponentActiveMaxHP }}</div>
                  </div>
                </div>
                <div class="tcg-card-back"></div>
              </div>
            </div>
          </div>

          <!-- Botón de Ataque Épico (Solo visible en tu turno si tienes activo) -->
          <div style="height: 60px; display: flex; align-items: center; justify-content: center; z-index: 50;">
            <button *ngIf="activeTurn === 'player' && playerActive && opponentActive && !playerFainting && !opponentFainting" 
                    class="btn" 
                    [disabled]="actionBlocked || isAttacking"
                    [style.opacity]="(actionBlocked || isAttacking) ? 0.4 : 1"
                    [style.pointer-events]="(actionBlocked || isAttacking) ? 'none' : 'auto'"
                    [style.cursor]="(actionBlocked || isAttacking) ? 'not-allowed' : 'pointer'"
                    [style.animation]="(actionBlocked || isAttacking) ? 'none' : 'pulse 1.5s infinite'"
                    style="border: 3px solid var(--neon-pink); color: #fff; background: rgba(255,0,255,0.2); font-size: 2rem; font-weight: 900; padding: 0.5rem 3rem; text-shadow: 0 0 10px var(--neon-pink); box-shadow: 0 0 20px rgba(255,0,255,0.5); border-radius: 50px;"
                    (click)="attackOpponent()">
              ATACAR
            </button>
            <div *ngIf="!playerActive && activeTurn === 'player' && !gameOver" style="font-size: 1.5rem; color: var(--neon-cyan); font-weight: bold; animation: pulse 1s infinite;">
              SELECCIONA UN POKÉMON DE TU BANCA
            </div>
          </div>

          <!-- Jugador Activo -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; position: relative;">
            <div *ngIf="playerDamage" class="floating-damage">{{ playerDamage }}</div>
            <div *ngIf="playerEffectiveMsg" style="position: absolute; top: -30px; color: var(--neon-pink); font-weight: 900; font-size: 1.5rem; text-shadow: 0 0 10px #000; animation: summonCard 0.3s forwards; z-index: 60;">{{ playerEffectiveMsg }}</div>
            
            <div class="tcg-card" [class.summon-animation]="playerJustSummoned" [class.flash-red]="playerFlash" [class.faint-animation]="playerFainting" style="width: 180px; height: 260px; border-color: var(--neon-cyan); transform: scale(1.2);">
              <div class="tcg-flip-inner">
                <div class="tcg-card-front" *ngIf="playerActive">
                  <div class="tcg-image-container" style="min-height: 120px;"><img [src]="playerActive.image" style="height: 100px;"></div>
                  <div class="tcg-content" style="padding: 0.5rem; text-align: center;">
                    <div style="font-size: 1rem; font-weight: bold;">
                      {{ playerActive.name }} <span *ngIf="playerActive.level && playerActive.level > 1" style="color: var(--neon-pink); font-size: 0.8rem; font-weight: bold; margin-left: 3px;">Nv. {{ playerActive.level }}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--neon-cyan); font-weight: 900;">ATK: {{ playerActive.attack }} | DEF: {{ playerActive.defense }}</div>
                    <div style="font-size: 0.7rem; color: #aaa; text-transform: uppercase;">Tipo: {{ playerActive.types[0] }}</div>
                    <div style="margin-top: 0.5rem; background: #333; height: 10px; border-radius: 5px; overflow: hidden; border: 1px solid #000;">
                       <div style="background: linear-gradient(90deg, #0f0, #0ff); height: 100%; transition: width 0.5s;" [style.width.%]="(playerActive.hp / playerActiveMaxHP) * 100"></div>
                    </div>
                    <div style="font-size: 0.8rem; margin-top: 2px; font-weight: bold;">HP: {{ playerActive.hp | number:'1.0-0' }} / {{ playerActiveMaxHP }}</div>
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
        <div style="height: 180px; background: rgba(0,0,0,0.85); border-top: 4px solid var(--neon-purple); display: flex; gap: 1.5rem; padding: 1.5rem; overflow-x: auto; align-items: flex-end; justify-content: center; border-radius: 12px 12px 0 0; z-index: 10; box-shadow: 0 -10px 30px rgba(0,0,0,0.5); position: relative;">
          
          <div style="position: absolute; left: 1rem; bottom: 150px; color: var(--neon-purple); font-weight: bold; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px;">Tu Banca</div>
          <div *ngFor="let card of playerBench; let i = index" 
               (click)="setActivePokemon(i)"
               class="tcg-card" style="width: 120px; height: 160px; min-width: 120px; transition: transform 0.3s; transform-origin: bottom; cursor: pointer; border-color: #555;"
               [style.opacity]="(activeTurn === 'player' && !playerActive) ? 1 : 0.5">
            <div class="tcg-flip-inner">
              <div class="tcg-card-front">
                <div class="tcg-image-container" style="min-height: 80px; background: transparent;"><img [src]="card.image" style="height: 60px;"></div>
                <div class="tcg-content" style="padding: 0.3rem; text-align: center;">
                  <div style="font-size: 0.8rem; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    {{ card.name }} <span *ngIf="card.level && card.level > 1" style="color: var(--neon-pink); font-size: 0.7rem; font-weight: bold; margin-left: 2px;">Nv. {{ card.level }}</span>
                  </div>
                  <div style="font-size: 0.6rem; color: #aaa; margin-top: 2px;">HP: {{ card.hp }}</div>
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
  attackProjectile: 'player-atk' | 'enemy-atk' | null = null;
  showTurnBanner = false;

  // Rotación Dinámica de Arenas (Estadios de batalla fotorrealistas optimizados para carga rápida)
  arenaBackgrounds = [
    'url("https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1200&q=60")', // Hierba (Bosque)
    'url("https://images.unsplash.com/photo-1518098268026-4e66f1a9c869?auto=format&fit=crop&w=1200&q=60")', // Fuego (Volcán)
    'url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=60")', // Agua (Costa)
    'url("https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=60")', // Psíquico (Nebulosa)
    'url("https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=60")'  // Eléctrico (Gimnasio Neon)
  ];
  currentArena = '';

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

    // Pre-cargar la imagen en memoria para evitar demoras
    const cleanUrl = chosen.replace(/url\(['"]?/, '').replace(/['"]?\)/, '');
    const img = new Image();
    img.src = cleanUrl;
    
    this.currentArena = chosen;

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
        if (this.role === 'host') {
          this.channel.send({
            type: 'broadcast',
            event: 'DECK',
            payload: { deck: this.playerBench, username: this.username }
          });
        }
      })
      .on('broadcast', { event: 'DECK' }, (payload: any) => {
        this.opponentBench = payload.payload.deck;
        
        if (this.role === 'guest') {
          this.channel.send({
            type: 'broadcast',
            event: 'DECK',
            payload: { deck: this.playerBench, username: this.username }
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
        
        this.triggerShake();
        this.playerFlash = true;
        this.playerDamage = `-${dmg}`;
        if (mult === 2) this.playerEffectiveMsg = "Súper Efectivo";
        else if (mult === 0.5) this.playerEffectiveMsg = "Poco Efectivo";

        setTimeout(() => { this.playerFlash = false; this.playerDamage = ''; this.playerEffectiveMsg = ''; }, 1000);

        if (this.playerActive) {
          this.playerActive.hp = payload.payload.newHp;
          if (this.playerActive.hp <= 0) {
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
            payload: { username: this.username }
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
    this.opponentBench = await this.pokeapi.getRandomPokemonCards(5);
    
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
    if (this.activeTurn !== 'player' && this.isOnline) return;
    
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

  async attackOpponent() {
    if (this.activeTurn !== 'player' || !this.playerActive || !this.opponentActive || this.actionBlocked || this.isAttacking) return;

    this.isAttacking = true;
    this.cdr.detectChanges();

    // Reproducir sonido de lanzamiento de ataque y activar proyectil
    this.playSynthSound('attack');
    this.attackProjectile = 'player-atk';
    this.cdr.detectChanges();

    // Esperar 400ms a que el proyectil viaje
    await new Promise(resolve => setTimeout(resolve, 400));

    // Desactivar proyectil al impactar y reproducir sonido de golpe
    this.attackProjectile = null;
    this.playSynthSound('hit');

    // Aplicar Daño
    const { dmg, multiplier } = this.calculateDamage(this.playerActive, this.opponentActive);
    
    this.triggerShake();
    this.opponentFlash = true;
    this.opponentDamage = `-${dmg}`;
    if (multiplier === 2) this.opponentEffectiveMsg = "Súper Efectivo";
    else if (multiplier === 0.5) this.opponentEffectiveMsg = "Poco Efectivo";
    
    setTimeout(() => { this.opponentFlash = false; this.opponentDamage = ''; this.opponentEffectiveMsg = ''; }, 1000);

    this.opponentActive.hp -= dmg;
    this.cdr.detectChanges();
    
    if (this.isOnline) {
      this.channel.send({
        type: 'broadcast',
        event: 'ATTACK',
        payload: { damage: dmg, multiplier, newHp: this.opponentActive.hp }
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
    
    // IA Flow ultrarrápido
    setTimeout(async () => {
      if (!this.opponentActive && this.opponentBench.length > 0) {
        this.opponentActive = this.opponentBench.shift() || null;
        if (this.opponentActive) this.opponentActiveMaxHP = this.opponentActive.hp;
        this.cdr.detectChanges();
        await new Promise(r => setTimeout(r, 800));
      }

      if (this.opponentActive && this.playerActive) {
        // IA Lanza Ataque
        this.playSynthSound('attack');
        this.attackProjectile = 'enemy-atk';
        this.cdr.detectChanges();

        // Esperar 400ms a que el proyectil viaje
        await new Promise(resolve => setTimeout(resolve, 400));

        // Desactivar proyectil e impacto
        this.attackProjectile = null;
        this.playSynthSound('hit');

        const { dmg, multiplier } = this.calculateDamage(this.opponentActive, this.playerActive);
        
        this.triggerShake();
        this.playerFlash = true;
        this.playerDamage = `-${dmg}`;
        if (multiplier === 2) this.playerEffectiveMsg = "Súper Efectivo";
        else if (multiplier === 0.5) this.playerEffectiveMsg = "Poco Efectivo";
        
        setTimeout(() => { this.playerFlash = false; this.playerDamage = ''; this.playerEffectiveMsg = ''; }, 1000);

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
          }, 1200);
        }
      } else {
        this.triggerTurnBanner('player');
      }
    }, 2000);
  }

  async abandonGame() {
    this.gameOver = true;
    this.winner = this.isOnline ? 'EL RIVAL (Por Abandono)' : 'LA IA (Por Abandono)';
    this.saveMatchHistory('lose');
    
    if (this.isOnline) {
      this.channel.send({
        type: 'broadcast',
        event: 'SURRENDER',
        payload: { winner: 'opponent' }
      });
      const { data: userAuth } = await this.supabase.auth.getUser();
      await this.supabase.client.from('partidas').update({
        estado: 'finalizada',
        ganador: null // Indica que se finalizó por rendición
      }).eq('id', this.matchId);
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
          await this.supabase.client.from('partidas').update({
            estado: 'finalizada',
            ganador: isWinner ? userAuth.user.id : null
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
      }

      this.cdr.detectChanges();
    }
  }

  playSynthSound(type: 'attack' | 'hit' | 'faint' | 'victory') {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
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
