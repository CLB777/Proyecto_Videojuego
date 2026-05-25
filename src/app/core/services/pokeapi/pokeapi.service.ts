import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface PokemonCard {
  instanceId?: string;
  id: number;
  name: string;
  image: string;
  types: string[];
  attack: number;
  defense: number;
  hp: number;
  specialAbility: string;
  rarity: string;
  description: string;
  level?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PokeapiService {
  private baseUrl = 'https://pokeapi.co/api/v2';
  private http = inject(HttpClient);

  constructor() {}

  async getRandomPokemonCards(amount: number = 20): Promise<PokemonCard[]> {
    const promises = [];
    for (let i = 0; i < amount; i++) {
      const randomId = Math.floor(Math.random() * 151) + 1;
      promises.push(this.getPokemonCardById(randomId));
    }
    
    const results = await Promise.all(promises);
    return results.filter((card): card is PokemonCard => card !== null);
  }

  async getPokemonCardById(id: number): Promise<PokemonCard | null> {
    try {
      const data: any = await firstValueFrom(this.http.get(`${this.baseUrl}/pokemon/${id}`));
      
      const speciesData: any = await firstValueFrom(this.http.get(data.species.url));
      
      const esEntry = speciesData.flavor_text_entries.find((entry: any) => entry.language.name === 'es') 
                   || speciesData.flavor_text_entries.find((entry: any) => entry.language.name === 'en');
      const description = esEntry ? esEntry.flavor_text.replace(/[\n\f]/g, ' ') : 'Sin descripción.';

      const hpBase = data.stats.find((s: any) => s.stat.name === 'hp').base_stat;
      const atkBase = data.stats.find((s: any) => s.stat.name === 'attack').base_stat;
      const defBase = data.stats.find((s: any) => s.stat.name === 'defense').base_stat;

      const totalStats = hpBase + atkBase + defBase;
      let rarity = 'Común';
      if (totalStats > 250 && totalStats <= 320) rarity = 'Infrecuente';
      if (totalStats > 320 && totalStats <= 400) rarity = 'Rara';
      if (totalStats > 400 && totalStats <= 480) rarity = 'Holo Rara';
      if (totalStats > 480) rarity = 'Ultra Rara';

      return {
        instanceId: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        id: data.id,
        name: data.name.toUpperCase(),
        image: data.sprites.other['official-artwork'].front_default || data.sprites.front_default,
        types: data.types.map((t: any) => t.type.name),
        attack: atkBase * 10,
        defense: defBase * 10,
        hp: hpBase * 15,
        specialAbility: this.getSpecialAbilityByType(data.types[0].type.name),
        rarity,
        description
      };
    } catch (error) {
      console.error(`Error fetching pokemon ${id}:`, error);
      return null;
    }
  }

  private getSpecialAbilityByType(type: string): string {
    const abilities: any = {
      fire: 'Llamarada (Daño extra)',
      water: 'Hidrobomba (Bloqueo)',
      grass: 'Drenadoras (Cura)',
      electric: 'Impactrueno (Buff ATK)',
      psychic: 'Confusión (Debuff DEF)'
    };
    return abilities[type] || 'Golpe Crítico';
  }
}
