import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase/supabase.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: url('https://images.unsplash.com/photo-1613771404724-11d2d7a02294?auto=format&fit=crop&w=1200&q=60') no-repeat center center fixed; background-size: cover; position: relative;">
      
      <!-- Viñeta inmersiva y overlay oscuro -->
      <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, rgba(10,10,15,0.6) 0%, rgba(5,5,10,0.9) 100%); pointer-events: none; z-index: 1;"></div>


      <div class="glass-panel" style="width: 100%; max-width: 450px; padding: 2.5rem 2.5rem 3rem 2.5rem; background: rgba(20, 40, 80, 0.85); border: 2px solid var(--neon-cyan); box-shadow: 0 0 30px rgba(0, 255, 255, 0.3), inset 0 0 20px rgba(0,255,255,0.2); border-radius: 20px; backdrop-filter: blur(15px); position: relative; z-index: 10;">
        
        <!-- Pokedex Camera UI -->
        <div style="position: absolute; top: -30px; left: -30px; width: 60px; height: 60px; background: radial-gradient(circle, #fff 10%, #0ff 40%, #005555 80%); border-radius: 50%; border: 4px solid #ddd; box-shadow: 0 0 20px #0ff;"></div>
        <div style="position: absolute; top: -15px; left: 40px; width: 20px; height: 20px; background: radial-gradient(circle, #fff 10%, #f00 40%, #500 80%); border-radius: 50%; border: 2px solid #ddd;"></div>
        <div style="position: absolute; top: -15px; left: 70px; width: 20px; height: 20px; background: radial-gradient(circle, #fff 10%, #ff0 40%, #550 80%); border-radius: 50%; border: 2px solid #ddd;"></div>
        <div style="position: absolute; top: -15px; left: 100px; width: 20px; height: 20px; background: radial-gradient(circle, #fff 10%, #0f0 40%, #050 80%); border-radius: 50%; border: 2px solid #ddd;"></div>

        <!-- Imagen de Pokémon flotando (Pikachu) -->
        <div style="display: flex; justify-content: center; margin-bottom: 0.5rem; margin-top: -1.5rem;">
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png" alt="Pikachu" style="width: 140px; height: 140px; filter: drop-shadow(0 0 12px var(--neon-cyan)); animation: float 3s ease-in-out infinite;">
        </div>

        <div style="text-align: center; margin-bottom: 2rem;">
          <h1 class="title glow-text-cyan" style="font-size: 2.8rem; margin-bottom: 0.5rem; font-family: 'Courier New', Courier, monospace; letter-spacing: 2px;">Pokébatallas</h1>
          <p class="subtitle" style="color: #0ff;">{{ isLoginMode ? 'Identificación de Entrenador' : 'Registro en la Liga Pokémon' }}</p>
        </div>

        <div *ngIf="errorMessage" style="background: rgba(255,0,0,0.3); border: 1px solid var(--neon-red); padding: 1rem; border-radius: 8px; color: #fff; margin-bottom: 1rem; font-size: 0.9rem; text-align: center; box-shadow: 0 0 10px red;">
          {{ errorMessage }}
        </div>

        <form [formGroup]="authForm" (ngSubmit)="onSubmit()">
          
          <div class="form-group" *ngIf="!isLoginMode">
            <label class="form-label" style="color: var(--neon-cyan);">Nombre de Entrenador</label>
            <input type="text" formControlName="username" class="form-input" style="background: rgba(0,0,0,0.5); border-color: var(--neon-cyan); color: #fff;">
            <span *ngIf="authForm.get('username')?.invalid && authForm.get('username')?.touched" class="error-text">Tu nombre (mín. 3 caracteres)</span>
          </div>

          <div class="form-group">
            <label class="form-label" style="color: var(--neon-cyan);">Correo Electrónico</label>
            <input type="email" formControlName="email" class="form-input" style="background: rgba(0,0,0,0.5); border-color: var(--neon-cyan); color: #fff;">
            <span *ngIf="authForm.get('email')?.invalid && authForm.get('email')?.touched" class="error-text">Ingresa un correo válido</span>
          </div>

          <div class="form-group">
            <label class="form-label" style="color: var(--neon-cyan);">Contraseña</label>
            <input type="password" formControlName="password" class="form-input" style="background: rgba(0,0,0,0.5); border-color: var(--neon-cyan); color: #fff;">
            <span *ngIf="authForm.get('password')?.invalid && authForm.get('password')?.touched" class="error-text">Mínimo 6 caracteres</span>
          </div>

          <button type="submit" class="btn btn-cyan" style="width: 100%; margin-top: 1.5rem; font-size: 1.2rem; padding: 1rem;" [disabled]="authForm.invalid || loading">
            {{ loading ? 'Sincronizando...' : (isLoginMode ? 'Conectar' : 'Registrar Entrenador') }}
          </button>
        </form>

        <div style="margin: 2rem 0; display: flex; align-items: center; justify-content: center; gap: 1rem;">
          <div style="flex: 1; height: 1px; background: rgba(0,255,255,0.3);"></div>
          <span style="color: #0ff; font-size: 0.9rem;">O CONECTA CON</span>
          <div style="flex: 1; height: 1px; background: rgba(0,255,255,0.3);"></div>
        </div>

        <button type="button" class="btn" style="width: 100%; background: white; color: #333; border: 2px solid #ddd; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 1rem; box-shadow: 0 0 10px rgba(255,255,255,0.2);" (click)="loginWithGoogle()">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style="width: 20px; height: 20px;">
          Iniciar con Google
        </button>

        <div style="text-align: center; margin-top: 2rem;">
          <button type="button" (click)="toggleMode()" style="background: none; border: none; color: #88c; text-decoration: none; cursor: pointer; font-family: inherit; font-size: 0.9rem; transition: color 0.3s;" onmouseover="this.style.color='#0ff'" onmouseout="this.style.color='#88c'">
            {{ isLoginMode ? '¿Nuevo aquí? Solicita tu ID de Entrenador' : '¿Ya tienes ID? Conéctate al PC' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class AuthComponent {
  isLoginMode = true;
  loading = false;
  errorMessage = '';

  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  authForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    username: ['']
  });

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
    this.authForm.reset();
    if (this.isLoginMode) {
      this.authForm.get('username')?.clearValidators();
    } else {
      this.authForm.get('username')?.setValidators([Validators.required, Validators.minLength(3)]);
    }
    this.authForm.get('username')?.updateValueAndValidity();
  }

  async loginWithGoogle() {
    this.loading = true;
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/home'
        }
      });
      if (error) throw error;
      // El redireccionamiento lo maneja Supabase
    } catch(err: any) {
      this.errorMessage = err.message || 'Error al conectar con Google. Verifica que el proveedor OAuth esté configurado en tu panel de Supabase.';
    } finally {
      this.loading = false;
    }
  }

  async onSubmit() {
    if (this.authForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';
    const { email, password, username } = this.authForm.value;

    try {
      if (this.isLoginMode) {
        const { error } = await this.supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        this.router.navigate(['/home']);
      } else {
        const { data, error } = await this.supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          const { error: dbError } = await this.supabase.client.from('usuarios').insert({
            id: data.user.id,
            username: username
          });
          if (dbError) throw dbError;
        }
        alert('Registro de Entrenador exitoso. Puedes conectarte ahora.');
        this.toggleMode();
      }
    } catch (err: any) {
      this.errorMessage = err.message || 'Error en la conexión';
    } finally {
      this.loading = false;
    }
  }
}
