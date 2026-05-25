import { Component, inject, OnInit, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { PokemonCard } from '../../core/services/pokeapi/pokeapi.service';
import { SupabaseService } from '../../core/services/supabase/supabase.service';
import { InventoryService } from '../../core/services/inventory/inventory.service';

@Component({
  selector: 'app-deck-builder',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div style="min-height: 100vh; padding: 2rem; background: url('https://images.unsplash.com/photo-1608889175123-8ec330b86f84?auto=format&fit=crop&w=1200&q=60') no-repeat center center fixed; background-size: cover; position: relative;">
      
      <!-- Overlay oscuro inmersivo -->
      <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(10,15,30,0.75) 0%, rgba(5,5,10,0.96) 100%); pointer-events: none; z-index: 1;"></div>

      <div style="position: relative; z-index: 2; max-width: 1200px; margin: 0 auto;">
        <header class="flex-between" style="margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem;">
          <h1 class="title glow-text-pink" style="margin: 0;">Armador de <span class="text-cyan">Mazos</span></h1>
          <a routerLink="/home" class="btn btn-pink" style="text-decoration: none;">Volver al Cuartel</a>
        </header>

        <div class="glass-panel glow-cyan" style="margin-bottom: 2rem; position: sticky; top: 1rem; z-index: 100; background: rgba(10,20,40,0.95); border: 2px solid var(--neon-cyan);">
          <div class="flex-between" style="margin-bottom: 1rem;">
            <h2 style="font-size: 1.2rem; text-transform: uppercase; letter-spacing: 2px;">
              Tu Mazo Seleccionado <span class="text-pink">({{ selectedCards.length }} / 5)</span>
            </h2>
            <button (click)="saveDeck()" [disabled]="selectedCards.length !== 5 || saving" class="btn btn-cyan">
              {{ saving ? 'Guardando...' : 'Confirmar Mazo' }}
            </button>
          </div>
          
          <div style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem;">
            <div *ngFor="let card of selectedCards" (click)="toggleSelection(card)" class="tcg-card" style="min-width: 120px; border-color: var(--neon-pink); background: rgba(0,0,0,0.6);">
              <div class="tcg-flip-inner">
                <div class="tcg-card-front">
                  <div class="tcg-image-container" style="min-height: 80px;">
                    <img [src]="card.image" style="height: 60px;">
                  </div>
                  <div class="tcg-content" style="padding: 0.5rem; text-align: center;">
                    <div style="font-size: 0.7rem; font-weight: bold;">
                      {{ card.name }} <span *ngIf="card.level && card.level > 1" style="color: var(--neon-pink); font-size: 0.65rem;">Nv. {{ card.level }}</span>
                    </div>
                  </div>
                </div>
                <div class="tcg-card-back"></div>
              </div>
            </div>
            <div *ngIf="selectedCards.length === 0" style="color: #888; font-style: italic; width: 100%; text-align: center; padding: 2rem 0; letter-spacing: 1px;">
              Selecciona exactamente 5 Pokémon del catálogo inferior.
            </div>
          </div>
        </div>

        <div *ngIf="loading" class="flex-center" style="height: 30vh;">
          <h2 class="glow-text-cyan" style="text-transform: uppercase; letter-spacing: 2px;">Cargando inventario de cartas...</h2>
        </div>

        <div *ngIf="!loading" class="grid-cards" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));">
          <div *ngFor="let card of availableCards" (click)="toggleSelection(card)" class="tcg-card" [class.selected]="isSelected(card)" style="background: rgba(0,0,0,0.6);">
            <div class="tcg-flip-inner">
              <div class="tcg-card-front">
                <div class="tcg-rarity" [ngClass]="card.rarity.replace(' ', '')" style="font-size: 0.5rem; padding: 1px 4px;">{{ card.rarity }}</div>
                <div class="tcg-image-container" style="min-height: 100px;">
                  <img [src]="card.image" style="height: 80px;">
                </div>
                <div class="tcg-content" style="padding: 0.5rem; text-align: center;">
                  <div style="font-size: 0.8rem; font-weight: bold; margin-bottom: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ card.name }} <span *ngIf="card.level && card.level > 1" style="color: var(--neon-pink); font-size: 0.75rem;">Nv. {{ card.level }}</span>
                  </div>
                  <div class="tcg-stats" style="font-size: 0.65rem; flex-direction: row; justify-content: space-around; gap: 2px;">
                    <span class="tcg-stat-atk">ATK: {{ card.attack }}</span>
                    <span class="tcg-stat-def">DEF: {{ card.defense }}</span>
                  </div>
                </div>
              </div>
              <div class="tcg-card-back"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DeckBuilderComponent implements OnInit {
  availableCards: PokemonCard[] = [];
  selectedCards: PokemonCard[] = [];
  loading = true;
  saving = false;

  private inventoryService = inject(InventoryService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const inv = await this.inventoryService.getInventory();
      this.availableCards = inv.cartas;

      const { data: userAuth } = await this.supabase.auth.getUser();
      if (userAuth.user) {
        const { data, error } = await this.supabase.client
          .from('mazos')
          .select('cartas')
          .eq('id_usuario', userAuth.user.id)
          .limit(1);

        if (!error && data && data.length > 0 && data[0].cartas) {
          const savedCards = data[0].cartas;
          // Auto-seleccionar las cartas del mazo guardado mapeadas a su estado actual en el inventario
          this.selectedCards = savedCards.map((savedCard: any) => {
            const match = this.availableCards.find(c => c.name.toLowerCase() === savedCard.name.toLowerCase());
            return match ? match : savedCard;
          });
        }
      }
    } catch (e) {
      console.error("Error loading deck and inventory:", e);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  toggleSelection(card: PokemonCard) {
    const idx = this.selectedCards.findIndex(c => c.instanceId === card.instanceId);
    if (idx >= 0) {
      this.selectedCards.splice(idx, 1);
    } else if (this.selectedCards.length < 5) {
      this.selectedCards.push(card);
    }
    this.cdr.detectChanges();
  }

  isSelected(card: PokemonCard) {
    return this.selectedCards.some(c => c.instanceId === card.instanceId);
  }

  async saveDeck() {
    if (this.selectedCards.length !== 5) return;
    this.saving = true;
    try {
      const { data: userAuth } = await this.supabase.auth.getUser();
      if (!userAuth.user) throw new Error("No estás logueado.");
      
      // Primero limpiamos cualquier mazo existente para evitar duplicados que arruinen la consulta .single()
      await this.supabase.client.from('mazos').delete().eq('id_usuario', userAuth.user.id);

      const { error } = await this.supabase.client.from('mazos').insert({
        id_usuario: userAuth.user.id,
        nombre: 'Mazo Principal',
        cartas: this.selectedCards
      });

      if (error) throw error;
      alert("Mazo guardado correctamente en la base de datos.");
      this.router.navigate(['/home']);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      this.saving = false;
    }
  }
}
