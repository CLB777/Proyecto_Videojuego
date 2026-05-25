import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public client: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor() {
    const supabaseUrl = 'https://bknzwuukoiqceeejuayc.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbnp3dXVrb2lxY2VlZWp1YXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDg1OTksImV4cCI6MjA5NDk4NDU5OX0.s1jfntq84tS-JCJZsmYimrrokO51L7U49F1_qwhrUF8';
    
    this.client = createClient(supabaseUrl, supabaseKey);

    // Initial session load
    this.client.auth.getSession().then(({ data: { session } }) => {
      this.currentUserSubject.next(session?.user ?? null);
    });

    // Listen to auth changes
    this.client.auth.onAuthStateChange((_event, session) => {
      this.currentUserSubject.next(session?.user ?? null);
    });
  }

  get auth() {
    return this.client.auth;
  }
}
