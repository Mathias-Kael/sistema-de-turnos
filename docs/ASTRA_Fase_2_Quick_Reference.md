# 🚀 Quick Start - Clientes Recurrentes API

## Importar Backend

```typescript
import { supabaseBackend } from '@/services/supabaseBackend';
import type { Client, ClientInput } from '@/types';
```

---

## 1️⃣ Crear Cliente

```typescript
const newClient = await supabaseBackend.createClient({
  business_id: businessId,
  name: 'Juan Pérez',
  phone: '+5491112345678',
  email: 'juan@example.com',      // opcional
  notes: 'Prefiere turno tarde',   // opcional
  tags: ['VIP', 'Frecuente'],      // opcional
});

// Result: Client object
console.log(newClient.id); // "uuid-abc-123"
```

**Errores comunes:**
- Nombre vacío → `"El nombre del cliente es obligatorio"`
- Teléfono vacío → `"El teléfono del cliente es obligatorio"`
- Teléfono duplicado → `"Ya existe un cliente con este teléfono en tu negocio"`

---

## 2️⃣ Buscar Clientes (Autocomplete)

```typescript
// Búsqueda con query
const results = await supabaseBackend.searchClients(
  businessId, 
  'Juan'  // Busca en nombre y teléfono
);

// Lista inicial (sin query)
const recent = await supabaseBackend.searchClients(businessId, '');
// Retorna últimos 20 clientes

// Result: Client[]
results.forEach(client => {
  console.log(`${client.name} - ${client.phone}`);
});
```

**Performance:** < 500ms (optimizado con índices)

---

## 3️⃣ Actualizar Cliente

```typescript
// Partial update (solo campos modificados)
const updated = await supabaseBackend.updateClient(clientId, {
  email: 'nuevo@example.com',
  tags: ['VIP', 'Frecuente', 'Cumpleaños'],
});

// Actualizar todo
const updated2 = await supabaseBackend.updateClient(clientId, {
  name: 'Juan Pérez García',
  phone: '+5491198765432',
  email: 'juan.nuevo@example.com',
  notes: 'Cambió de teléfono',
  tags: ['Regular'],
});
```

**Validaciones:**
- Nombre no puede estar vacío
- Teléfono no puede estar vacío
- Teléfono debe ser único por business

---

## 4️⃣ Eliminar Cliente

```typescript
try {
  await supabaseBackend.deleteClient(clientId);
  console.log('Cliente eliminado');
} catch (error) {
  // Si tiene reservas futuras:
  // "No se puede eliminar el cliente porque tiene reservas futuras"
  console.error(error.message);
}
```

**Delete Protection:** No permite eliminar si tiene reservas con `booking_date >= CURRENT_DATE`

---

## 5️⃣ Crear Reserva con Cliente Registrado

```typescript
// Nueva forma (con cliente registrado)
const bookingId = await supabaseBackend.createBookingSafe({
  employee_id: employeeId,
  date: '2025-11-01',
  start_time: '10:00',
  end_time: '11:00',
  client_name: client.name,        // Del cliente registrado
  client_phone: client.phone,      // Del cliente registrado
  client_email: client.email,      // Nuevo campo opcional
  client_id: client.id,            // ← Asocia con cliente registrado
  business_id: businessId,
  service_ids: ['service-1', 'service-2'],
});

// Forma legacy (sin cliente registrado) - SIGUE FUNCIONANDO
const bookingId2 = await supabaseBackend.createBookingSafe({
  employee_id: employeeId,
  date: '2025-11-01',
  start_time: '14:00',
  end_time: '15:00',
  client_name: 'Cliente Anónimo',
  client_phone: '+5491199887766',
  business_id: businessId,
  service_ids: ['service-1'],
  // NO incluir client_id ni client_email
});
```

---

## 📘 Types Reference

### Client
```typescript
interface Client {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;  // ISO timestamp
  updatedAt: string;  // ISO timestamp
}
```

### ClientInput
```typescript
interface ClientInput {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  tags?: string[];
}
```

### BookingClient (para Booking interface)
```typescript
interface BookingClient {
  id?: string;  // Si viene de un cliente registrado
  name: string;
  phone: string;
  email?: string;
}
```

---

## 🎨 UI Patterns (Recomendaciones)

### Autocomplete Input
```typescript
const [query, setQuery] = useState('');
const [clients, setClients] = useState<Client[]>([]);

// Debounce search
useEffect(() => {
  const timer = setTimeout(async () => {
    if (query.length >= 2) {
      const results = await supabaseBackend.searchClients(businessId, query);
      setClients(results);
    } else if (query === '') {
      const recent = await supabaseBackend.searchClients(businessId, '');
      setClients(recent);
    }
  }, 300);
  
  return () => clearTimeout(timer);
}, [query, businessId]);
```

### Client Select Component
```tsx
<div>
  <input 
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    placeholder="Buscar cliente por nombre o teléfono"
  />
  
  <ul>
    {clients.map(client => (
      <li key={client.id} onClick={() => selectClient(client)}>
        <strong>{client.name}</strong>
        <span>{client.phone}</span>
        {client.tags && (
          <div>
            {client.tags.map(tag => (
              <span key={tag} className="badge">{tag}</span>
            ))}
          </div>
        )}
      </li>
    ))}
    
    <li onClick={createNewClient}>
      <strong>+ Crear nuevo cliente</strong>
    </li>
  </ul>
</div>
```

### Form Modal
```tsx
<form onSubmit={handleSubmit}>
  <input 
    name="name" 
    required 
    placeholder="Nombre completo"
  />
  
  <input 
    name="phone" 
    required 
    placeholder="+54 9 11 1234-5678"
  />
  
  <input 
    type="email"
    name="email" 
    placeholder="email@ejemplo.com (opcional)"
  />
  
  <textarea 
    name="notes" 
    placeholder="Notas sobre el cliente (opcional)"
  />
  
  <TagInput 
    tags={tags} 
    onChange={setTags}
    suggestions={['VIP', 'Frecuente', 'Nuevo']}
  />
  
  <button type="submit">Guardar Cliente</button>
</form>
```

---

## 🐛 Error Handling

```typescript
try {
  await supabaseBackend.createClient(clientData);
} catch (error) {
  if (error.message.includes('Ya existe un cliente')) {
    // Teléfono duplicado
    showError('Este número de teléfono ya está registrado');
  } else if (error.message.includes('obligatorio')) {
    // Campo vacío
    showError('Completa todos los campos requeridos');
  } else {
    // Error genérico
    showError('Error al guardar cliente. Intenta nuevamente.');
  }
}
```

---

## 🔍 Debugging

### Ver clientes en consola
```javascript
const clients = await supabaseBackend.searchClients(businessId, '');
console.table(clients);
```

### Verificar cliente asociado a booking
```sql
-- En DB directamente
SELECT 
  b.id,
  b.client_name,
  b.client_phone,
  b.client_id,
  c.name as registered_client_name
FROM bookings b
LEFT JOIN clients c ON b.client_id = c.id
WHERE b.business_id = 'your-business-id'
ORDER BY b.booking_date DESC;
```

---

## 📚 Ejemplos Completos

Ver archivos de referencia:
- `services/supabaseBackend.clients.test.ts` - Tests con ejemplos de uso
- `docs/ASTRA_Fase_2_Reporte_Completitud_Backend_API.md` - Documentación completa
- `docs/ASTRA_Backend_API_Specs_Clientes_Recurrentes.md` - Specs originales

---

## ❓ FAQ

**Q: ¿Puedo crear una reserva sin cliente registrado?**  
A: Sí, `client_id` es opcional. La forma legacy sigue funcionando.

**Q: ¿Qué pasa si elimino un cliente con reservas pasadas?**  
A: Se puede eliminar. La protección es solo para reservas futuras.

**Q: ¿Los tags tienen valores predefinidos?**  
A: No, son libres. El frontend puede sugerir valores comunes.

**Q: ¿Cómo busco por teléfono exacto?**  
A: Usa `searchClients(businessId, '+5491112345678')`. Hace LIKE %query%.

**Q: ¿Puedo actualizar el teléfono a uno ya existente?**  
A: No, lanza error "Ya existe un cliente con este teléfono...".

---

*Quick Reference v1.0 - 31 Oct 2025*
