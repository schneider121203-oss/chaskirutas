import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Claves que NUNCA deben salir en una respuesta HTTP.
const SENSITIVE_KEYS = new Set(['passwordHash', 'password_hash', 'codeHash', 'code_hash', 'password']);

/**
 * Elimina recursivamente campos sensibles (hashes de contraseña/OTP) de cualquier
 * respuesta, sin depender del serializador de class-transformer (que falla ante
 * las referencias circulares de las entidades TypeORM). A prueba de ciclos.
 */
@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.scrub(data, new WeakSet())));
  }

  private scrub(value: any, seen: WeakSet<object>): any {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return value;
    seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) this.scrub(item, seen);
      return value;
    }

    for (const key of Object.keys(value)) {
      if (SENSITIVE_KEYS.has(key)) {
        delete value[key];
      } else {
        this.scrub(value[key], seen);
      }
    }
    return value;
  }
}
