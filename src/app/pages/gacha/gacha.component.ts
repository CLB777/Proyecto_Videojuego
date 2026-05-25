import { Component, inject, OnInit, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InventoryService } from '../../core/services/inventory/inventory.service';
import { PokemonCard } from '../../core/services/pokeapi/pokeapi.service';
import { SupabaseService } from '../../core/services/supabase/supabase.service';

@Component({
  selector: 'app-gacha',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div style="min-height: 100vh; padding: 2rem; display: flex; flex-direction: column; align-items: center; position: relative; overflow: hidden; background: url('https://images.unsplash.com/photo-1613771404724-11d2d7a02294?auto=format&fit=crop&w=1200&q=60') no-repeat center center fixed; background-size: cover;">
      
      <!-- Overlay oscuro inmersivo aligerado -->
      <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(30,15,50,0.55) 0%, rgba(5,5,10,0.85) 100%); pointer-events: none; z-index: 1;"></div>

      <!-- Rayo de luz celestial -->
      <div class="light-beam" *ngIf="openingState >= 2"></div>

      <div style="width: 100%; max-width: 800px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; position: relative; z-index: 10;">
        <a routerLink="/home" class="btn" (click)="playGachaSound('select')">Volver al Cuartel</a>
        <h1 class="title glow-text-pink" style="margin: 0; font-size: 3rem;">Tienda Pokémon</h1>
        <div class="glass-panel glow-cyan" style="padding: 0.5rem 1rem; display: flex; gap: 1rem; background: rgba(10,25,50,0.85); border: 2px solid var(--neon-cyan); box-shadow: 0 0 15px rgba(0, 243, 255, 0.2);">
          <div style="text-align: center;">
            <div style="font-size: 0.8rem; color: #aaa; text-transform: uppercase; letter-spacing: 1px;">Sobres</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: var(--neon-cyan);">CANTIDAD: {{ inv?.sobres_disponibles || 0 }}</div>
          </div>
        </div>
      </div>

      <div *ngIf="loading" style="color: var(--neon-cyan); font-size: 1.5rem; animation: pulse 1s infinite; z-index: 10; margin-top: 5rem;">
        Accediendo a la tienda...
      </div>

      <!-- Fase 0: Selección de Sobres -->
      <div *ngIf="!loading && openingState === 0" style="text-align: center; margin-top: 2rem; z-index: 10;">
        <div *ngIf="(inv?.sobres_disponibles || 0) > 0" style="display: flex; gap: 2rem; perspective: 1000px; justify-content: center; flex-wrap: wrap;">
          <div *ngFor="let i of [1,2,3]; let idx = index" 
               class="gacha-pack" 
               (click)="selectPack(idx)"
               style="position: relative; width: 180px; height: 260px; cursor: pointer; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); transition: transform 0.3s; transform-style: preserve-3d;"
               onmouseover="this.style.transform='scale(1.05) translateY(-10px)'" 
               onmouseout="this.style.transform='scale(1) translateY(0)'">
            
            <div style="position: absolute; inset: 0; background: linear-gradient(135deg, #ff0055, #5500ff); border-radius: 10px; border: 3px solid #fff; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: space-between;">
              <div style="width: 100%; height: 30px; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-weight: bold; letter-spacing: 2px;">BOOSTER</div>
              <img [src]="packCovers[idx]" style="width: 120px; height: 120px; filter: drop-shadow(0 0 10px rgba(255,255,255,0.5)); animation: float 3s infinite;">
              <div style="width: 100%; padding: 0.5rem; text-align: center; background: rgba(0,0,0,0.5); font-size: 0.8rem; font-weight: bold;">ELEGIR SOBRE</div>
            </div>
            
            <!-- Efecto Brillo Metálico -->
            <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.8) 100%); mix-blend-mode: overlay; pointer-events: none; border-radius: 10px;"></div>
          </div>
        </div>

        <div *ngIf="(inv?.sobres_disponibles || 0) === 0">
          <h1 class="title glow-text-pink" style="font-size: 3rem; margin-bottom: 0.5rem; text-transform: uppercase;">
            Tienda de Sobres
          </h1>
          <p style="color: #ccc; font-size: 1.2rem;">¿Qué suerte tendrás hoy, Entrenador <span style="color: var(--neon-cyan); font-weight: bold;">{{ username || '...' }}</span>?</p>
          <div style="display: flex; justify-content: center; margin: 2rem 0;">
            <div style="width: 80px; height: 80px; border-radius: 50%; border: 3px dashed var(--neon-pink); display: flex; align-items: center; justify-content: center; color: var(--neon-pink); font-weight: bold; box-shadow: 0 0 15px rgba(255,0,85,0.3); animation: rotate 10s linear infinite;">
              VACÍO
            </div>
          </div>
          <p style="color: #aaa; font-size: 1.2rem;">Gana batallas para conseguir Recargas.</p>
        </div>
      </div>

      <!-- Fase 1: Sobre interactivo gigante (Apertura por clicks) -->
      <div *ngIf="!loading && openingState === 1" style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 1rem; z-index: 10; animation: summonCard 0.4s forwards;">
        <h2 class="glow-text-cyan" style="font-size: 2rem; margin-bottom: 1rem; text-shadow: 0 0 10px var(--neon-cyan);">¡SOBRE SELECCIONADO!</h2>
        <p style="color: #aaa; margin-bottom: 2rem; font-size: 1.1rem; letter-spacing: 1px;">Haz clic en el sobre <span style="color: var(--neon-pink); font-weight: bold;">3 veces</span> para romper el sello.</p>
        
        <div (click)="onPackClick()" 
             class="gacha-pack-giant" 
             [class.shake]="packShaking"
             [style.transform]="'scale(' + (1.1 + packClicks * 0.08) + ')'"
             style="position: relative; width: 220px; height: 320px; cursor: pointer; border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-style: preserve-3d;">
          
          <div style="position: absolute; inset: 0; background: linear-gradient(135deg, #ff0055, #5500ff); border-radius: 12px; border: 4px solid #fff; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: space-between;">
            <div style="width: 100%; height: 35px; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-weight: bold; letter-spacing: 2px; font-size: 1.1rem;">ABRIR</div>
            <img [src]="packCovers[selectedPackIndex]" style="width: 150px; height: 150px; filter: drop-shadow(0 0 15px rgba(255,255,255,0.6)); pointer-events: none;">
            <div style="width: 100%; padding: 0.6rem; text-align: center; background: rgba(0,0,0,0.6); font-size: 0.9rem; font-weight: bold; letter-spacing: 1px;">TCG POCKET</div>
          </div>
          
          <!-- Brillo metálico -->
          <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.7) 100%); mix-blend-mode: overlay; pointer-events: none; border-radius: 12px;"></div>

          <!-- Grietas Visuales Superpuestas -->
          <div *ngIf="packClicks >= 1" style="position: absolute; inset: 0; border-radius: 12px; background: rgba(0,0,0,0.1); pointer-events: none; display: flex; align-items: center; justify-content: center; overflow: hidden; z-index: 5;">
            <!-- Línea de grieta 1 -->
            <div style="position: absolute; width: 120%; height: 4px; background: #00f3ff; transform: rotate(35deg); box-shadow: 0 0 15px #00f3ff;"></div>
          </div>
          <div *ngIf="packClicks >= 2" style="position: absolute; inset: 0; border-radius: 12px; pointer-events: none; display: flex; align-items: center; justify-content: center; overflow: hidden; z-index: 6;">
            <!-- Línea de grieta 2 -->
            <div style="position: absolute; width: 120%; height: 4px; background: #ff00ff; transform: rotate(-45deg); box-shadow: 0 0 15px #ff00ff;"></div>
            <!-- Luces de sobrepresión -->
            <div style="position: absolute; inset: 0; background: radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 70%);"></div>
          </div>
        </div>

        <!-- Indicador de Clics -->
        <div style="display: flex; gap: 1rem; margin-top: 3rem;">
          <div *ngFor="let dot of [1,2,3]" 
               [style.background]="packClicks >= dot ? 'var(--neon-pink)' : '#333'"
               [style.box-shadow]="packClicks >= dot ? '0 0 10px var(--neon-pink)' : 'none'"
               style="width: 15px; height: 15px; border-radius: 50%; border: 2px solid #fff; transition: all 0.3s;">
          </div>
        </div>
      </div>

      <!-- Fase 2: Rayo de Luz de la Explosión -->
      <div *ngIf="openingState === 2" style="display: flex; align-items: center; justify-content: center; min-height: 50vh; z-index: 10;">
        <div style="font-size: 2.5rem; font-weight: bold; text-transform: uppercase; color: #fff; letter-spacing: 5px; animation: pulse 0.5s infinite; text-shadow: 0 0 20px #fff;">
          ¡Abriendo Sobre!
        </div>
      </div>

      <!-- Fase 3: Revelando Cartas -->
      <div *ngIf="openingState === 3" style="width: 100%; text-align: center; z-index: 10;">
        <h2 class="glow-text-cyan" style="font-size: 3rem; margin-bottom: 3rem; animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">¡NUEVAS CARTAS OBTENIDAS!</h2>
        
        <div style="display: flex; gap: 2rem; justify-content: center; flex-wrap: wrap;">
          <div *ngFor="let card of openedCards; let i = index" class="tcg-card card-drop" style="width: 200px; border-color: var(--neon-cyan);" [style.animation-delay]="(i * 0.3) + 's'">
            <div class="tcg-flip-inner" style="transform: rotateY(0deg);">
              <div class="tcg-card-front">
                <div class="tcg-rarity" [ngClass]="card.rarity.replace(' ', '')">{{ card.rarity }}</div>
                <div class="tcg-image-container" style="min-height: 140px;">
                  <img [src]="card.image" style="height: 120px;" [alt]="card.name">
                </div>
                <div class="tcg-content" style="padding: 1rem; text-align: center;">
                  <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ card.name }}
                  </div>
                  <div *ngIf="card.level && card.level > 1" style="color: var(--neon-pink); font-size: 0.95rem; font-weight: 900; margin-bottom: 0.3rem;">
                    ¡Nv. {{ card.level }} FUSIONADO!
                  </div>
                  <div class="tcg-stats" style="font-size: 0.7rem; justify-content: space-around;">
                    <span class="tcg-stat-atk">ATK: {{ card.attack }}</span>
                    <span class="tcg-stat-def">DEF: {{ card.defense }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button class="btn btn-pink" style="margin-top: 4rem; font-size: 1.5rem;" (click)="resetGacha()">Abrir Otro Sobre</button>
      </div>

    </div>
  `,
  styles: [`
    @keyframes float {
      0% { transform: translateY(0px); box-shadow: 0 10px 20px rgba(255,0,255,0.2); }
      50% { transform: translateY(-15px); box-shadow: 0 25px 50px rgba(255,0,255,0.6); }
      100% { transform: translateY(0px); box-shadow: 0 10px 20px rgba(255,0,255,0.2); }
    }
    @keyframes popIn {
      0% { transform: scale(0); opacity: 0; }
      80% { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
  `]
})
export class GachaComponent implements OnInit {
  inv: any = null;
  username = '';
  loading = true;
  openingState: number = 0; // 0=Choose, 1=Clicking Pack, 2=Light beam/Explosion, 3=Show cards
  openedCards: PokemonCard[] = [];
  selectedPackIndex = -1;
  packClicks = 0;
  packShaking = false;
  packCovers: string[] = [
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/3.png',
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/9.png'
  ];

  private inventoryService = inject(InventoryService);
  private supabase = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.loadInventory();
  }

  async loadInventory() {
    this.loading = true;
    try {
      this.inv = await this.inventoryService.getInventory();
      
      const { data: userAuth } = await this.supabase.auth.getUser();
      if (userAuth.user) {
        const { data: userData } = await this.supabase.client.from('usuarios').select('username').eq('id', userAuth.user.id).single();
        if (userData && userData.username) {
          this.username = userData.username;
        }
      }
      
      const randomIds = Array.from({length: 3}, () => Math.floor(Math.random() * 151) + 1);
      this.packCovers = randomIds.map(id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`);

    } catch(e) {
      console.error(e);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  selectPack(idx: number) {
    if (this.openingState !== 0) return;
    if (!this.inv || this.inv.sobres_disponibles <= 0) return;
    this.selectedPackIndex = idx;
    this.openingState = 1;
    this.packClicks = 0;
    this.packShaking = false;
    this.playGachaSound('select');
    this.cdr.detectChanges();
  }

  onPackClick() {
    if (this.openingState !== 1 || this.packClicks >= 3) return;
    this.packClicks++;
    this.packShaking = true;
    this.playGachaSound('shake');
    this.cdr.detectChanges();
    
    setTimeout(() => {
      this.packShaking = false;
      this.cdr.detectChanges();
    }, 150);

    if (this.packClicks === 3) {
      this.playGachaSound('burst');
      this.abrirSobre();
    }
  }

  async abrirSobre() {
    if (!this.inv || this.inv.sobres_disponibles <= 0) return;
    
    this.openingState = 2;
    this.cdr.detectChanges();

    try {
      this.openedCards = await this.inventoryService.openPack();
      
      setTimeout(() => {
        this.openingState = 3;
        this.playGachaSound('reveal');
        this.loadInventory();
        this.cdr.detectChanges();
      }, 1200);

    } catch(e) {
      console.error(e);
      this.openingState = 0;
      this.cdr.detectChanges();
    }
  }

  resetGacha() {
    this.openingState = 0;
    this.openedCards = [];
    this.selectedPackIndex = -1;
    this.packClicks = 0;
    this.packShaking = false;
    this.playGachaSound('select');
    this.cdr.detectChanges();
  }

  playGachaSound(type: 'select' | 'shake' | 'burst' | 'reveal') {
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

      if (type === 'select') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'shake') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.12);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'burst') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
        
        const noiseOsc = ctx.createOscillator();
        const noiseGain = ctx.createGain();
        noiseOsc.type = 'sawtooth';
        noiseOsc.frequency.setValueAtTime(120, now);
        noiseOsc.frequency.linearRampToValueAtTime(10, now + 0.3);
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        noiseOsc.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        osc.start(now);
        osc.stop(now + 0.4);
        noiseOsc.start(now);
        noiseOsc.stop(now + 0.4);
      } else if (type === 'reveal') {
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, index) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.setValueAtTime(freq, now + index * 0.1);
          g.gain.setValueAtTime(0.12, now + index * 0.1);
          g.gain.exponentialRampToValueAtTime(0.005, now + index * 0.1 + 0.3);
          o.start(now + index * 0.1);
          o.stop(now + index * 0.1 + 0.35);
        });
      }
    } catch (e) {
      console.warn("AudioContext error:", e);
    }
  }
}
