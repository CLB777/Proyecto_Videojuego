import { Injectable, Inject, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class SqliteService {
  private db!: Database;
  private SQL!: SqlJsStatic;
  public isReady = false;
  private isBrowser: boolean;
  private supabase = inject(SupabaseService);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.initDatabase();
    }
  }

  private async initDatabase() {
    try {
      this.SQL = await initSqlJs({
        locateFile: (file) => `/${file}`
      });

      const savedData = localStorage.getItem('sqlite_db');
      if (savedData) {
        const uInt8Array = new Uint8Array(atob(savedData).split('').map(c => c.charCodeAt(0)));
        this.db = new this.SQL.Database(uInt8Array);
      } else {
        this.db = new this.SQL.Database();
      }
      
      // Aseguramos que el esquema (tablas nuevas) siempre se cree
      this.createSchema();
      this.isReady = true;
      console.log('SQLite local database initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize SQLite local database:', error);
    }
  }

  private createSchema() {
    const initScript = `
      CREATE TABLE IF NOT EXISTS local_cache (
        id TEXT PRIMARY KEY,
        tipo TEXT NOT NULL,
        datos TEXT NOT NULL,
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS local_config (
        clave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      );
    `;
    this.db.run(initScript);
    this.saveDatabase();
  }

  public saveDatabase() {
    if (!this.isBrowser || !this.db) return;
    const data = this.db.export();
    const buffer = Array.from(data);
    const base64 = btoa(buffer.map(b => String.fromCharCode(b)).join(''));
    localStorage.setItem('sqlite_db', base64);
  }

  // --- Helpers Crud (Phase 1 structure) ---
  public async executeQuery(query: string, params: any[] = []): Promise<any[]> {
    if (!this.isBrowser) return [];
    await this.waitForReady();
    const stmt = this.db.prepare(query);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    this.saveDatabase();
    return results;
  }

  public async runQuery(query: string, params: any[] = []): Promise<void> {
    if (!this.isBrowser) return;
    await this.waitForReady();
    this.db.run(query, params);
    this.saveDatabase();
  }

  private async waitForReady() {
    if (!this.isBrowser) return;
    while (!this.isReady) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Historial de Partidas - Usamos LocalStorage Directo para ser 100% infalibles offline, segmentado por usuario
  public async saveOfflineMatch(matchData: any) {
    if (!this.isBrowser) return;
    let userId = 'guest';
    try {
      const userRes = await this.supabase.client.auth.getUser();
      if (userRes.data?.user?.id) {
        userId = userRes.data.user.id;
      }
    } catch (e) {
      console.warn("Could not retrieve user ID for history segmentation:", e);
    }
    const key = `tcg_offline_history_${userId}`;
    const historyData = localStorage.getItem(key);
    let history = [];
    if (historyData) {
      try {
        history = JSON.parse(historyData);
      } catch (e) {}
    }
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    const newRecord = { ...matchData, id };
    history.push(newRecord);
    localStorage.setItem(key, JSON.stringify(history));
  }

  public async getMatchHistory(): Promise<any[]> {
    if (!this.isBrowser) return [];
    let userId = 'guest';
    try {
      const userRes = await this.supabase.client.auth.getUser();
      if (userRes.data?.user?.id) {
        userId = userRes.data.user.id;
      }
    } catch (e) {
      console.warn("Could not retrieve user ID for loading history:", e);
    }
    const key = `tcg_offline_history_${userId}`;
    const historyData = localStorage.getItem(key);
    if (!historyData) return [];
    try {
      return JSON.parse(historyData);
    } catch (e) {
      return [];
    }
  }
}
