# Componentes UI Base

Esta carpeta contiene componentes de UI base, reutilizables y de bajo nivel que forman el sistema de diseño de la aplicación. Estos componentes están diseñados para ser agnósticos de la lógica de negocio y altamente personalizables a través de props.

## 🎨 Guía de Estilo

### Colores
- `primary`: Color principal de la aplicación
- `surface`: Fondo de elementos interactivos
- `brand-text`: Color de texto principal

### Tamaños
- `sm`: Elementos pequeños
- `md`: Tamaño por defecto
- `lg`: Elementos grandes

## 🧩 Componentes

### Button
```tsx
<Button 
    variant="primary" | "secondary" | "ghost"
    size="sm" | "md" | "lg"
    disabled={boolean}
>
    Contenido
</Button>
```

### Input
```tsx
<Input 
    containerClassName="contenedor-personalizado"
    aria-invalid={boolean}
    disabled={boolean}
/>
```

## 📚 Ejemplos de Uso
...