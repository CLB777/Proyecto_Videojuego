import { Component, inject, OnInit, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PokemonCard } from '../../core/services/pokeapi/pokeapi.service';
import { InventoryService } from '../../core/services/inventory/inventory.service';

@Component({
  selector: 'app-collection',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div style="min-height: 100vh; padding: 2rem; background: url('https://images.unsplash.com/photo-1608889175123-8ec330b86f84?auto=format&fit=crop&w=1200&q=60') no-repeat center center fixed; background-size: cover; position: relative;">
      
      <!-- Overlay oscuro inmersivo -->
      <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(10,15,30,0.75) 0%, rgba(5,5,10,0.96) 100%); pointer-events: none; z-index: 1;"></div>

      <div style="position: relative; z-index: 2; max-width: 1200px; margin: 0 auto;">
        <div class="flex-between" style="margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem;">
          <h1 class="title glow-text-cyan" style="margin: 0;">Mi Colección</h1>
          <a routerLink="/home" class="btn">Volver al Cuartel</a>
        </div>

        <div *ngIf="loading" style="text-align: center; margin-top: 5rem;">
          <h2 class="glow-text-cyan" style="animation: pulse 1s infinite;">Accediendo a tu inventario...</h2>
        </div>

        <div *ngIf="!loading && cards.length === 0" style="text-align: center; margin-top: 5rem;">
          <h2 style="color: #aaa;">No tienes ninguna carta todavía.</h2>
          <a routerLink="/gacha" class="btn btn-cyan" style="margin-top: 1rem;">Abre sobres en la tienda</a>
        </div>

        <div *ngIf="!loading && cards.length > 0" class="grid-cards">
          <div *ngFor="let card of cards" class="tcg-card" style="background: rgba(0,0,0,0.6);">
            <div class="tcg-flip-inner">
              <div class="tcg-card-front">
                <div class="tcg-rarity" [ngClass]="card.rarity.replace(' ', '')">{{ card.rarity }}</div>
                <div class="tcg-image-container">
                  <img [src]="card.image" [alt]="card.name">
                </div>
                <div class="tcg-content">
                  <div class="tcg-name">
                    {{ card.name }}
                    <span *ngIf="card.level && card.level > 1" style="color: var(--neon-pink); font-size: 0.85rem; font-weight: bold; margin-left: 0.5rem;">Nv. {{ card.level }}</span>
                  </div>
                  <div class="tcg-stats">
                    <span class="tcg-stat-atk">ATK: {{ card.attack }}</span>
                    <span class="tcg-stat-def">DEF: {{ card.defense }}</span>
                    <span class="tcg-stat-hp">HP: {{ card.hp }}</span>
                  </div>
                  <p style="margin-top: 0.5rem; font-size: 0.7rem; color: #aaa; text-transform: uppercase; letter-spacing: 1px;">
                    Habilidad: <span style="color: #fff;">{{ card.specialAbility }}</span>
                  </p>
                </div>
              </div>
              <div class="tcg-card-back"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes pulse {
      0% { opacity: 0.5; transform: scale(0.95); }
      50% { opacity: 1; transform: scale(1.05); }
      100% { opacity: 0.5; transform: scale(0.95); }
    }
  `]
})
export class CollectionComponent implements OnInit {
  cards: PokemonCard[] = [];
  loading = true;
  private inventoryService = inject(InventoryService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const inv = await this.inventoryService.getInventory();
      this.cards = inv.cartas;
    } catch(e) {
      console.error(e);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}
