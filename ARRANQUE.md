# Arranque del proyecto

## Comandos
- npx expo start -c --dev-client
- npx expo run:android

## Notas
- Si falla router: revisar exports default en screens

## Flujo de arranque de la aplicación ##

1. Splash (logo) → app/index.tsx

2. Presentación (onboarding) → app/onboarding/index.tsx

3. Crear cuenta (registro básico) → app/onboarding/basic-profile.tsx

4. Activar PIN (obligatorio) → app/onboarding/pin-suggest.tsx

5. Crear PIN (pantalla donde lo ingresás/confirmás) → app/onboarding/set-pin.tsx

6. Elegir perfil (rol) → app/onboarding/role.tsx

7. Completar perfil según rol

Si elige Busco trabajo (worker) → app/onboarding/worker-form.tsx

Si elige Necesito un trabajador (seeker) → app/onboarding/seeker-form.tsx

8. App principal (Tabs/Home) → app/(tabs)/index.tsx (y las demás tabs)

Y cuando reiniciás la app:

9. Splash → app/index.tsx

10. Si PIN está activo y hay sesión → app/pin.tsx (desbloqueo)

11. Al meter el PIN correcto → debe llevar a Tabs/Home (/(tabs)), NO a role.tsx