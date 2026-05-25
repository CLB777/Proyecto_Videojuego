import { Component, inject, OnInit, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase/supabase.service';
import { InventoryService } from '../../core/services/inventory/inventory.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="min-height: 100vh; padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; background: url('https://images.unsplash.com/photo-1613771404724-11d2d7a02294?auto=format&fit=crop&w=1200&q=60') no-repeat center center fixed; background-size: cover; position: relative; overflow-x: hidden;">
      
      <!-- Overlay oscuro inmersivo original -->
      <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(10,10,15,0.45) 0%, rgba(5,5,10,0.85) 100%); pointer-events: none; z-index: 1;"></div>

      <div style="position: relative; z-index: 2; width: 100%; max-width: 1200px; display: flex; flex-direction: column; align-items: center;">
        
        <!-- Cabecera y Bienvenida con controles de Guía/Tutorial -->
        <div style="text-align: center; margin-bottom: 4rem; width: 100%;">
          <div style="display: flex; justify-content: center; gap: 1rem; align-items: center; margin-bottom: 1.5rem;">
            <button class="btn btn-cyan" style="font-size: 0.9rem; padding: 0.5rem 1.5rem;" (click)="showGuide = true">
              Guía de Juego
            </button>
            <button class="btn btn-pink" style="font-size: 0.9rem; padding: 0.5rem 1.5rem;" (click)="startTutorial()">
              Iniciar Tutorial
            </button>
          </div>
          <h1 class="title glow-text-cyan" style="font-size: 3.5rem; margin-bottom: 0.5rem; letter-spacing: 2px;">
            Bienvenido, Entrenador <span style="color: var(--neon-pink);">{{ username || '...' }}</span>
          </h1>
          <p style="color: #aaa; font-size: 1.2rem; max-width: 600px; margin: 0 auto;">TCG Pocket Edition: Elige tu próximo movimiento y prepárate para la batalla.</p>
        </div>

        <div class="home-grid">
          
          <!-- Panel Izquierdo: Menú Principal (Modos de Juego) -->
          <div [class.tutorial-highlight]="tutorialStep === 2" style="display: flex; flex-direction: column; gap: 1.5rem; transition: all 0.3s;">
            <h2 class="glow-text-cyan" style="font-size: 2rem; margin-bottom: 1.5rem; border-bottom: 2px solid var(--neon-cyan); padding-bottom: 0.5rem;">Modos de Juego</h2>
            
            <button class="skewed-btn" (click)="goTo('/game?difficulty=facil')" style="--border-color: #00ff66; --shadow-color: 0, 255, 102; --bg-hover: rgba(0, 255, 102, 0.15); background: rgba(0, 40, 20, 0.55);">
              <div class="skewed-btn-inner">
                <div style="font-size: 1.4rem; color: #00ff66; margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.5rem; font-weight: bold;">
                  <span style="display:inline-block; width: 8px; height: 8px; border-radius: 50%; background: #00ff66;"></span>
                  Vs Máquina (Fácil)
                </div>
                <div style="font-size: 0.8rem; color: #aaa; font-weight: normal;">Práctica relajada</div>
              </div>
            </button>
            
            <button class="skewed-btn" (click)="goTo('/game?difficulty=medio')" style="--border-color: #ffff00; --shadow-color: 255, 255, 0; --bg-hover: rgba(255, 255, 0, 0.15); background: rgba(40, 40, 0, 0.55);">
              <div class="skewed-btn-inner">
                <div style="font-size: 1.4rem; color: #ffff00; margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.5rem; font-weight: bold;">
                  <span style="display:inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ffff00;"></span>
                  Vs Máquina (Medio)
                </div>
                <div style="font-size: 0.8rem; color: #aaa; font-weight: normal;">Desafío balanceado</div>
              </div>
            </button>
            
            <button class="skewed-btn" (click)="goTo('/game?difficulty=dificil')" style="--border-color: #ff3333; --shadow-color: 255, 51, 51; --bg-hover: rgba(255, 51, 51, 0.15); background: rgba(40, 0, 10, 0.55);">
              <div class="skewed-btn-inner">
                <div style="font-size: 1.4rem; color: #ff3333; margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.5rem; font-weight: bold;">
                  <span style="display:inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ff3333;"></span>
                  Vs Máquina (Difícil)
                </div>
                <div style="font-size: 0.8rem; color: #aaa; font-weight: normal;">Solo para expertos</div>
              </div>
            </button>

            <button class="skewed-btn" (click)="goTo('/lobby')" style="--border-color: var(--neon-cyan); --shadow-color: 0, 243, 255; --bg-hover: rgba(0, 243, 255, 0.15); margin-top: 1rem; background: rgba(0, 30, 60, 0.55);">
              <div class="skewed-btn-inner">
                <div style="font-size: 1.4rem; color: var(--neon-cyan); margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.5rem; font-weight: bold;">
                  <span style="display:inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--neon-cyan);"></span>
                  Combate P2P
                </div>
                <div style="font-size: 0.8rem; color: #aaa; font-weight: normal;">Lucha contra el mundo</div>
              </div>
            </button>
          </div>

          <!-- Panel Derecho: HUB del Jugador -->
          <div style="display: flex; flex-direction: column; gap: 2rem;">
            
            <!-- Hub Superior: Historial, Colección y Mazo -->
            <div class="hub-grid">
              <button class="skewed-btn" [class.tutorial-highlight]="tutorialStep === 6" (click)="goTo('/history')" style="--border-color: var(--neon-purple); --shadow-color: 176, 38, 255; --bg-hover: rgba(176, 38, 255, 0.15); text-align: center; background: rgba(30, 10, 50, 0.55); height: 110px;">
                <div class="skewed-btn-inner" style="align-items: center; justify-content: center; height: 100%;">
                  <h2 style="font-size: 1.3rem; color: var(--neon-purple); margin-bottom: 0.2rem;">Historial</h2>
                  <p style="color: #aaa; font-size: 0.75rem;">Historial de victorias</p>
                </div>
              </button>
              <button class="skewed-btn" [class.tutorial-highlight]="tutorialStep === 4" (click)="goTo('/collection')" style="--border-color: var(--neon-cyan); --shadow-color: 0, 243, 255; --bg-hover: rgba(0, 243, 255, 0.15); text-align: center; background: rgba(0, 30, 45, 0.55); height: 110px;">
                <div class="skewed-btn-inner" style="align-items: center; justify-content: center; height: 100%;">
                  <h2 style="font-size: 1.3rem; color: var(--neon-cyan); margin-bottom: 0.2rem;">Colección</h2>
                  <p style="color: #aaa; font-size: 0.75rem;">Tus cartas conseguidas</p>
                </div>
              </button>
              <button class="skewed-btn" [class.tutorial-highlight]="tutorialStep === 3" (click)="goTo('/deck-builder')" style="--border-color: var(--neon-pink); --shadow-color: 255, 0, 255; --bg-hover: rgba(255, 0, 255, 0.15); text-align: center; background: rgba(50, 10, 30, 0.55); height: 110px;">
                <div class="skewed-btn-inner" style="align-items: center; justify-content: center; height: 100%;">
                  <h2 style="font-size: 1.3rem; color: var(--neon-pink); margin-bottom: 0.2rem;">Armar Mazo</h2>
                  <p style="color: #aaa; font-size: 0.75rem;">Elige tus 5 cartas</p>
                </div>
              </button>
            </div>

            <!-- Hub Inferior: Gacha y Progreso -->
            <div class="glass-panel" [class.tutorial-highlight]="tutorialStep === 5" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2.5rem 3rem; position: relative; overflow: hidden; border-color: var(--neon-pink); transition: all 0.3s;">
              
              <div *ngIf="loading" style="display: flex; flex-direction: column; align-items: center;">
                <div class="glow-text-cyan" style="font-size: 2rem; animation: pulse 1s infinite;">ESCANENANDO SISTEMAS...</div>
                <div style="width: 200px; height: 4px; background: #333; margin-top: 1rem; border-radius: 2px; overflow: hidden;">
                  <div style="width: 50%; height: 100%; background: var(--neon-cyan); animation: slideBanner 1s infinite;"></div>
                </div>
              </div>

              <div *ngIf="!loading" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
                <h2 style="font-size: 2.5rem; color: var(--neon-pink); margin-bottom: 1rem; text-transform: uppercase;">La Tienda Gacha</h2>
                
                <div style="font-size: 1.5rem; margin-bottom: 1.5rem;">
                  Sobres disponibles: <span style="font-weight: bold; color: var(--neon-cyan); font-size: 2rem;">{{ inv?.sobres_disponibles || 0 }}</span>
                </div>
                
                <button class="btn" *ngIf="(inv?.sobres_disponibles || 0) > 0" (click)="goTo('/gacha')" style="font-size: 1.5rem; padding: 1rem 3rem; background: rgba(255,0,255,0.2); border: 2px solid var(--neon-pink); box-shadow: 0 0 20px rgba(255,0,255,0.5); margin-bottom: 2rem;">
                  ABRIR SOBRE AHORA
                </button>

                <button class="btn" *ngIf="(inv?.sobres_disponibles || 0) === 0" style="font-size: 1.5rem; padding: 1rem 3rem; background: rgba(100,100,100,0.2); border: 2px solid #555; color: #555; cursor: not-allowed; margin-bottom: 2rem;">
                  SIN SOBRES DISPONIBLES
                </button>

                <!-- Barra de Progreso de Recargas (3 Celdas) -->
                <div style="width: 100%; max-width: 500px; margin-top: 1rem; text-align: center;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 0.8rem;">
                    <span style="color: #aaa; text-transform: uppercase; font-size: 0.9rem; letter-spacing: 1px;">Energía Gacha ({{ inv?.recargas || 0 }}/3)</span>
                    <span style="color: var(--neon-cyan); font-weight: bold;">Recompensa: 1 Sobre</span>
                  </div>
                  
                  <div style="display: flex; gap: 1.5rem; justify-content: center; margin-bottom: 1rem;">
                    <div *ngFor="let charge of [1, 2, 3]" 
                         [style.background]="(inv?.recargas || 0) >= charge ? 'linear-gradient(135deg, var(--neon-cyan), var(--neon-pink))' : 'rgba(0,0,0,0.5)'"
                         [style.box-shadow]="(inv?.recargas || 0) >= charge ? '0 0 15px var(--neon-cyan), inset 0 0 5px rgba(255,255,255,0.8)' : 'none'"
                         [style.border]="(inv?.recargas || 0) >= charge ? '2px solid #fff' : '2px solid #444'"
                         style="width: 60px; height: 35px; border-radius: 6px; position: relative; transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; color: rgba(255,255,255,0.9);">
                      <div *ngIf="(inv?.recargas || 0) >= charge" style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%); pointer-events: none; border-radius: 4px;"></div>
                      {{ (inv?.recargas || 0) >= charge ? 'ON' : 'OFF' }}
                    </div>
                  </div>

                  <div style="color: #777; font-size: 0.8rem;">Gana batallas para llenar la barra.</div>
                </div>
              </div>
            </div>

            <!-- Controles de Sesión -->
            <div style="text-align: right; margin-top: 1rem;">
              <button class="btn" style="border-color: #555; color: #888; background: transparent; padding: 0.5rem 2rem;" (click)="logout()">Cerrar Sesión</button>
            </div>
          </div>

        </div>
      </div>

      <!-- Tutorial Interactivo de Rotom Dex (Con posicionamiento dinámico no bloqueante) -->
      <div *ngIf="tutorialActive" style="position: fixed; inset: 0; z-index: 10000; background: rgba(5,5,10,0.35); pointer-events: none;"></div>

      <div *ngIf="tutorialActive" [ngStyle]="getTutorialPositionStyle()" style="position: fixed; width: 90%; z-index: 10010; pointer-events: auto; transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);">
        <div class="glass-panel" style="border: 2px solid var(--neon-cyan); box-shadow: 0 0 25px rgba(0,243,255,0.4); padding: 1.2rem 2rem; background: rgba(10, 15, 30, 0.95); display: flex; align-items: center; gap: 2rem; border-radius: 16px;">
          
          <div style="width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0;">
            <div style="position: absolute; inset: -3px; border-radius: 50%; border: 2px dashed var(--neon-cyan); animation: spin 10s linear infinite;"></div>
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/479.png" alt="Rotom Dex" style="width: 85px; height: 85px; filter: drop-shadow(0 0 8px var(--neon-cyan)); animation: float 2.5s ease-in-out infinite; z-index: 2;">
          </div>

          <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem; text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h2 style="font-size: 1.3rem; color: var(--neon-cyan); text-transform: uppercase; letter-spacing: 1px; margin: 0; font-weight: bold;">
                Asistente Rotom Dex
              </h2>
              <div style="font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 1px;">
                Paso {{ tutorialStep }} de 6
              </div>
            </div>

            <div style="font-size: 0.95rem; line-height: 1.5; color: #eee; min-height: 60px; display: flex; align-items: center;">
              <p *ngIf="tutorialStep === 1">¡Hola, Entrenador! Soy tu Rotom Dex, una Pokédex especial habitada por el Pokémon Rotom que sirve como tu asistente personal de aventuras. ¡Te guiaré paso a paso por las secciones del menú para que estés listo para combatir!</p>
              <p *ngIf="tutorialStep === 2">En el panel de la izquierda verás la sección de Modos de Juego. Puedes luchar en modo Vs Máquina en tres niveles de dificultad para practicar, o entrar a Combate P2P para enfrentar en tiempo real a otros entrenadores reales.</p>
              <p *ngIf="tutorialStep === 3">¡Esto es sumamente importante! Antes de empezar cualquier combate, debes ingresar a la opción de Armar Mazo. Tienes que elegir exactamente 5 cartas de tu colección para formar tu mazo de juego.</p>
              <p *ngIf="tutorialStep === 4">En la sección de Colección podrás admirar todas las cartas de Pokémon que has conseguido hasta ahora, revisar sus estadísticas de combate y conocer sus tipos elementales.</p>
              <p *ngIf="tutorialStep === 5">Esta es la Tienda Gacha, el lugar donde usas tus Sobres Disponibles para abrir nuevos paquetes con 5 cartas aleatorias. Consigues Energía Gacha ganando batallas (3 celdas ON equivalen a 1 sobre gratis).</p>
              <p *ngIf="tutorialStep === 6">Por último, en la sección de Historial puedes revisar tu récord privado de victorias y derrotas acumuladas contra la IA o contra otros jugadores en línea. ¡Prepárate y sé un Campeón!</p>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.5rem; margin-top: 0.3rem;">
              <button class="btn" style="border-color: #555; color: #aaa; font-size: 0.8rem; padding: 0.3rem 1rem;" (click)="skipTutorial()">Omitir</button>
              <button class="btn btn-cyan" style="font-size: 0.85rem; padding: 0.4rem 1.5rem;" (click)="nextTutorialStep()">
                {{ tutorialStep === 6 ? '¡Entendido!' : 'Siguiente' }}
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- Modal de Guía del Entrenador -->
      <div *ngIf="showGuide" style="position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); padding: 2rem;">
        <div class="glass-panel" style="width: 100%; max-width: 800px; max-height: 85vh; overflow-y: auto; border: 2px solid var(--neon-cyan); box-shadow: 0 0 30px rgba(0,255,255,0.4); padding: 3rem; background: rgba(10, 15, 30, 0.95); position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 2px solid var(--neon-cyan); padding-bottom: 1rem;">
            <h2 class="title glow-text-cyan" style="font-size: 2.2rem; margin: 0; font-family: inherit; letter-spacing: 2px;">Manual del Entrenador</h2>
            <button class="btn" style="border-color: var(--neon-pink); color: var(--neon-pink); padding: 0.4rem 1rem; font-size: 0.9rem;" (click)="closeGuide()">Cerrar Manual</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 2rem; font-size: 1rem; color: #ccc; line-height: 1.6;">
            <div>
              <h3 style="color: var(--neon-pink); font-size: 1.3rem; margin-bottom: 0.5rem; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">1. El Menú Principal</h3>
              <p>Esta es tu base de operaciones. Desde aquí puedes acceder a los combates, a tu colección de cartas, a la tienda gacha para conseguir nuevos Pokémon, a la zona de construcción de mazos y al registro de batallas.</p>
            </div>

            <div>
              <h3 style="color: var(--neon-pink); font-size: 1.3rem; margin-bottom: 0.5rem; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">2. Sobres y Colección</h3>
              <p>En la tienda gacha puedes abrir sobres cerrados que contienen 5 cartas de Pokémon seleccionados al azar desde la PokeAPI. Cada carta tiene estadísticas únicas de ataque, defensa y vida, además de habilidades elementales. Puedes coleccionarlas y verlas en la sección Mi Colección.</p>
            </div>

            <div>
              <h3 style="color: var(--neon-pink); font-size: 1.3rem; margin-bottom: 0.5rem; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">3. Energía Gacha</h3>
              <p>Para abrir sobres en la tienda necesitas sobres disponibles. Consigues energía ganando combates (1 punto contra la IA, 2 puntos en multijugador en línea). Al alcanzar 3 puntos de energía gacha, se canjean automáticamente por 1 sobre adicional.</p>
            </div>

            <div>
              <h3 style="color: var(--neon-pink); font-size: 1.3rem; margin-bottom: 0.5rem; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">4. Construcción del Mazo</h3>
              <p>Antes de entrar al campo de batalla debes preparar un mazo de exactamente 5 cartas. Entra en Construir Mazo, selecciona tus Pokémon favoritos y guarda los cambios para que estén disponibles durante la pelea.</p>
            </div>

            <div>
              <h3 style="color: var(--neon-pink); font-size: 1.3rem; margin-bottom: 0.5rem; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">5. Mecánica de Combate</h3>
              <p>El combate es por turnos de 1v1. Primero debes elegir un Pokémon activo de tu banca para que empiece a pelear. Durante tu turno, puedes presionar ATACAR para dañar al Pokémon activo del oponente. El daño toma en cuenta tu ataque, la defensa del enemigo y las ventajas elementales de tipo:</p>
              <ul style="list-style-type: square; margin-left: 1.5rem; margin-top: 0.5rem;">
                <li>Agua tiene ventaja sobre Fuego.</li>
                <li>Fuego tiene ventaja sobre Planta.</li>
                <li>Planta tiene ventaja sobre Agua.</li>
                <li>Eléctrico tiene ventaja sobre Agua.</li>
                <li>Psíquico tiene ventaja sobre Veneno.</li>
              </ul>
              <p style="margin-top: 0.5rem;">Cuando el Pokémon activo es derrotado, el entrenador debe sacar otro de su banca. Quien se quede sin cartas en la banca y sin Pokémon activo en el campo pierde la partida.</p>
            </div>

            <div>
              <h3 style="color: var(--neon-pink); font-size: 1.3rem; margin-bottom: 0.5rem; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">6. Modo Multijugador</h3>
              <p>En las salas multijugador, puedes crear una sala o conectarte a la de otro entrenador. Las batallas online se sincronizan en tiempo real mediante Supabase Realtime, permitiéndote jugar turnos interactivos contra rivales de todo el mundo.</p>
            </div>
          </div>

          <div style="margin-top: 3rem; text-align: center;">
            <button class="btn btn-cyan" style="font-size: 1.2rem; padding: 0.8rem 3rem;" (click)="closeGuide()">Entendido, Entrenador</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class HomeComponent implements OnInit {
  inv: any = null;
  username = '';
  loading = true;
  showGuide = false;
  
  tutorialActive = false;
  tutorialStep = 0;

  getTutorialPositionStyle(): { [key: string]: string } {
    switch (this.tutorialStep) {
      case 2: // Modos de juego (panel izquierdo) -> Rotom Dex en la derecha
        return {
          bottom: '2rem',
          right: '2rem',
          left: 'auto',
          transform: 'none',
          'max-width': '450px'
        };
      case 3: // Armar Mazo (arriba derecha) -> Rotom Dex abajo izquierda
      case 4: // Colección (arriba centro) -> Rotom Dex abajo izquierda
        return {
          bottom: '2rem',
          left: '2rem',
          right: 'auto',
          transform: 'none',
          'max-width': '450px'
        };
      case 5: // Tienda Gacha (abajo panel derecho) -> Rotom Dex arriba centro
        return {
          top: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 'auto',
          right: 'auto',
          'max-width': '680px'
        };
      case 6: // Historial (arriba izquierda) -> Rotom Dex abajo derecha
        return {
          bottom: '2rem',
          right: '2rem',
          left: 'auto',
          transform: 'none',
          'max-width': '450px'
        };
      default: // Bienvenido (Paso 1) -> Centrado abajo
        return {
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          right: 'auto',
          top: 'auto',
          'max-width': '750px'
        };
    }
  }

  private supabase = inject(SupabaseService);
  private inventoryService = inject(InventoryService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  async ngOnInit() {
    if (!this.isBrowser) return;
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const { data: userAuth } = await this.supabase.auth.getUser();
      if (userAuth.user) {
        const { data: userData } = await this.supabase.client.from('usuarios').select('username').eq('id', userAuth.user.id).single();
        if (userData && userData.username) {
          this.username = userData.username;
        }

        if (this.isBrowser) {
          const tutorialSeen = localStorage.getItem('tcg_tutorial_seen_' + userAuth.user.id);
          if (!tutorialSeen) {
            localStorage.setItem('tcg_tutorial_seen_' + userAuth.user.id, 'true');
            this.startTutorial();
          }
        }
      }
      this.inv = await this.inventoryService.getInventory();
    } catch(e) {
      console.error(e);
    }

    this.loading = false;
    this.cdr.detectChanges();
  }

  startTutorial() {
    this.tutorialActive = true;
    this.tutorialStep = 1;
    this.cdr.detectChanges();
  }

  nextTutorialStep() {
    this.tutorialStep++;
    if (this.tutorialStep > 6) {
      this.endTutorial();
    }
    this.cdr.detectChanges();
  }

  skipTutorial() {
    this.endTutorial();
  }

  async endTutorial() {
    this.tutorialActive = false;
    this.tutorialStep = 0;
    if (this.isBrowser) {
      const { data: userAuth } = await this.supabase.auth.getUser();
      if (userAuth.user) {
        localStorage.setItem('tcg_tutorial_seen_' + userAuth.user.id, 'true');
      }
    }
    this.cdr.detectChanges();
  }

  closeGuide() {
    this.showGuide = false;
    if (this.isBrowser) {
      localStorage.setItem('tcg_guide_seen', 'true');
    }
    this.cdr.detectChanges();
  }

  goTo(path: string) {
    this.router.navigateByUrl(path);
  }

  async logout() {
    await this.supabase.auth.signOut();
    this.router.navigate(['/auth']);
  }
}
