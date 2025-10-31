# ASTRA - Backend API Specs: Clientes Recurrentes Fase 2

**Target Agent:** Claude 4.5 (VS Code)  
**Fecha:** 31 Octubre 2025  
**Prerequisito:** Fase 1 Database Schema ✅ COMPLETADA  
**Tiempo estimado:** 45 minutos  

---

## 🎯 CONTEXTO DE IMPLEMENTACIÓN

### **Estado Actual Database (Post Fase 1)**
```sql
-- ✅ Tabla clients implementada y operacional
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ✅ Índices de performance creados
CREATE UNIQUE INDEX idx_clients_phone_business ON clients(business_id, phone);
CREATE INDEX idx_clients_business ON clients(business_id);
CREATE INDEX idx_clients_name ON clients USING gin(to_tsvector('spanish', name));
CREATE INDEX idx_clients_phone ON clients(phone);

-- ✅ RLS policies implementadas (4 policies: SELECT, INSERT, UPDATE, DELETE)

-- ✅ Tabla bookings actualizada
ALTER TABLE bookings ADD COLUMN client_id UUID REFERENCES clients(id);
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
```

### **Data State**
- ✅ 81 bookings existentes preservados (client_id = NULL para todos)
- ✅ 0 clients creados (tabla vacía, ready for data)
- ✅ Backup seguro: `bookings_backup_20251031_clientes_recurrentes`

---

## 📋 FUNCIONES A IMPLEMENTAR

### **1. createClient**
```typescript
export const createClient = async (clientData: {
  business_id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}): Promise<Client> => {
  // VALIDACIONES REQUERIDAS:
  // 1. Verificar teléfono único por business_id
  // 2. Sanitizar datos de entrada
  // 3. Error handling descriptivo
  
  // QUERY EXAMPLE:
  // SELECT para verificar duplicado:
  // SELECT id, name FROM clients 
  // WHERE business_id = ? AND phone = ? LIMIT 1
  
  // Si existe: throw Error con nombre del cliente existente
  // Si no existe: INSERT y return client creado
}
```

**Error handling esperado:**
```typescript
// Si duplicado:
throw new Error(`Ya existe un cliente con el teléfono ${phone}: ${existingClient.name}`);

// Si error de DB:
throw new Error(`Error creando cliente: ${error.message}`);
```

### **2. searchClients**
```typescript
export const searchClients = async (
  businessId: string, 
  query: string
): Promise<Client[]> => {
  // PROPÓSITO: Autocomplete en frontend
  // PERFORMANCE TARGET: < 500ms
  
  // QUERY LOGIC:
  // Buscar en name, phone, email usando ILIKE
  // Ordenar por name
  // Limitar a 10 resultados max
  
  // QUERY EXAMPLE:
  // SELECT * FROM clients 
  // WHERE business_id = ? 
  // AND (name ILIKE %query% OR phone ILIKE %query% OR email ILIKE %query%)
  // ORDER BY name LIMIT 10
}
```

### **3. updateClient**
```typescript
export const updateClient = async (
  clientId: string, 
  updates: Partial<Client>
): Promise<Client> => {
  // VALIDACIONES:
  // 1. Si se actualiza phone, verificar único por business
  // 2. No permitir cambiar business_id
  // 3. Sanitizar datos
  
  // NOTA: updated_at se actualiza automáticamente via trigger
}
```

### **4. deleteClient**
```typescript
export const deleteClient = async (clientId: string): Promise<void> => {
  // VALIDACIÓN CRÍTICA:
  // Verificar que NO tenga reservas futuras antes de eliminar
  
  // QUERY VERIFICATION:
  // SELECT id FROM bookings 
  // WHERE client_id = ? AND booking_date >= CURRENT_DATE LIMIT 1
  
  // Si tiene reservas fut