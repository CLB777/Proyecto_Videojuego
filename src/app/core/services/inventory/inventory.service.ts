import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { PokeapiService, PokemonCard } from '../pokeapi/pokeapi.service';

export interface Inventory {
  cartas: PokemonCard[];
  sobres_disponibles: number;
  recargas: number;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private supabase = inject(SupabaseService);
  private pokeapi = inject(PokeapiService);

  async getInventory(): Promise<Inventory> {
    const { data: userAuth } = await this.supabase.auth.getUser();
    if (!userAuth.user) throw new Error("No autenticado");

    const userId = userAuth.user.id;
    let { data, error } = await this.supabase.client
      .from('inventario')
      .select('cartas, sobres_disponibles, recargas')
      .eq('id_usuario', userId)
      .single();

    if (error || !data) {
      // Create new inventory with 3 free packs
      const newInv = {
        id_usuario: userId,
        cartas: [],
        sobres_disponibles: 3,
        recargas: 0
      };
      await this.supabase.client.from('inventario').insert(newInv);
      return { cartas: [], sobres_disponibles: 3, recargas: 0 };
    }

    return data as Inventory;
  }

  async openPack(): Promise<PokemonCard[]> {
    const inv = await this.getInventory();
    if (inv.sobres_disponibles <= 0) throw new Error("No tienes sobres disponibles.");

    // Obtener 5 cartas nuevas
    const newCards = await this.pokeapi.getRandomPokemonCards(5);
    
    const { data: userAuth } = await this.supabase.auth.getUser();
    if (!userAuth.user) throw new Error("No autenticado");

    const updatedCards = [...inv.cartas];
    const cardsToReturn: PokemonCard[] = [];

    for (const newCard of newCards) {
      // Buscar si el jugador ya tiene este Pokémon en su inventario
      const existingIdx = updatedCards.findIndex(c => c.name.toLowerCase() === newCard.name.toLowerCase());
      if (existingIdx >= 0) {
        const existingCard = updatedCards[existingIdx];
        existingCard.level = (existingCard.level || 1) + 1;
        existingCard.attack = (existingCard.attack || 0) + 20;
        existingCard.defense = (existingCard.defense || 0) + 10;
        existingCard.hp = (existingCard.hp || 0) + 50;
        // Retornamos la copia modificada para la visualización del gacha
        cardsToReturn.push({ ...existingCard });
      } else {
        newCard.level = 1;
        updatedCards.push(newCard);
        cardsToReturn.push(newCard);
      }
    }

    await this.supabase.client.from('inventario')
      .update({
        cartas: updatedCards,
        sobres_disponibles: inv.sobres_disponibles - 1
      })
      .eq('id_usuario', userAuth.user.id);

    return cardsToReturn;
  }

  async addWinRewards(isOnline: boolean): Promise<{ recargasEarned: number, packEarned: boolean }> {
    const inv = await this.getInventory();
    const { data: userAuth } = await this.supabase.auth.getUser();
    
    // IA wins = 1 recarga. Online wins = 2 recargas.
    const recargasEarned = isOnline ? 2 : 1;
    let newRecargas = inv.recargas + recargasEarned;
    let packEarned = false;
    let newSobres = inv.sobres_disponibles;

    if (newRecargas >= 3) {
      newRecargas -= 3;
      newSobres += 1;
      packEarned = true;
    }

    await this.supabase.client.from('inventario')
      .update({
        recargas: newRecargas,
        sobres_disponibles: newSobres
      })
      .eq('id_usuario', userAuth.user!.id);

    return { recargasEarned, packEarned };
  }
}
