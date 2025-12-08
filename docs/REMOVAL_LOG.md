# Log de Archivos Eliminados

Este documento registra archivos eliminados del proyecto con su justificación, para referencia futura.

---

## 2025-12-08: ReservationsManager.tsx

**Ruta eliminada:** `components/admin/ReservationsManager.tsx`  
**Razón:** Código duplicado/legacy sin uso activo  
**Contexto:** Feature de búsqueda de reservas

### Análisis pre-eliminación:
- ✅ **No importado** en ningún archivo del proyecto
- ✅ Solo mencionado en documentación obsoleta
- ✅ Funcionalidad duplicada en `components/views/ReservationsView.tsx`
- ✅ 516 líneas de código muerto

### Búsqueda de importaciones (negativo):
```bash
grep -r "from './ReservationsManager'" .
grep -r "from '../admin/ReservationsManager'" .
# Resultado: No matches found
```

### Hipótesis de origen:
Probablemente un refactor donde se movió la lógica de `admin/ReservationsManager.tsx` a `views/ReservationsView.tsx` y se olvidó eliminar el archivo original.

### Contenido preservado:
El archivo implementaba:
- Gestión de reservas con calendario
- Agrupación de breaks conjuntos/individuales
- Modales de creación (normal/especial/break)
- Filtrado por fecha

**Toda esta funcionalidad existe (y mejorada) en `ReservationsView.tsx`**

### Recuperación:
Si este archivo cumplía alguna función no detectada, se puede recuperar desde:
- Commit anterior al merge de `feature/busqueda-reservas`
- Git history: `git checkout <commit-hash> -- components/admin/ReservationsManager.tsx`

### Decisión aprobada por:
Usuario (Mathias) - 8 diciembre 2025

---

**Nota:** Si en el futuro se descubre que este archivo tenía alguna dependencia oculta, revisar este log para contexto completo.
