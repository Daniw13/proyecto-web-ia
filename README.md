# proyecto-web-ia
# Explorador Interactivo de Rick and Morty

## Integrantes
- Angel Daniel Hernandez Hernandez

## Descripción del proyecto
Aplicación web tipo Single Page Application (SPA) desarrollada para consultar información en tiempo real desde la API pública de Rick and Morty. Permite buscar personajes, filtrar por estado y género, gestionar una lista de favoritos persistente mediante `localStorage`, ver un historial de búsquedas recientes y alternar entre modo claro y oscuro con una interfaz adaptable y fluida basada en diseño Cupertino.

## Instrucciones de uso
1. Entra al enlace de GitHub Pages publicado.
2. Utiliza la barra de búsqueda superior para encontrar personajes por nombre en tiempo real.
3. Aplica filtros usando los botones de estado (Alive, Dead, Unknown) o el menú desplegable de género.
4. Haz clic en el icono de corazón (♡/♥) de cualquier tarjeta para agregar o quitar personajes de tus favoritos.
5. Cambia entre la vista "Todos" y "Favoritos" usando el control segmentado superior.
6. Alterna entre modo claro y oscuro haciendo clic en el icono de sol/luna (☀️/🌙) ubicado en la barra de navegación.

## Prompts importantes (Claude)
1. "Actúa como un desarrollador frontend senior. Necesito que me ayudes a construir una aplicación web tipo SPA consumiendo la Rick and Morty API mediante fetch asíncrono, con buscador, filtros y almacenamiento en localStorage..."
2. "Ayúdame a integrar un botón de modo oscuro y claro dentro del componente de segmento superior (junto a Todos y Favoritos), asegurando que guarde la preferencia del usuario en localStorage sin romper la lógica existente."
3. "Revisa este bloque de código JavaScript para identificar por qué hay un error de sintaxis con la declaración repetida de constantes y corrijámoslo manteniendo la compatibilidad con los estilos Cupertino."

## Corrección de la IA y errores resueltos
- **Error encontrado:** Al intentar inicializar el script con el soporte para el modo oscuro, se declaró dos veces la constante `KEYS` utilizando `const`, lo que generó un error de sintaxis en la consola (*Uncaught SyntaxError: Identifier 'KEYS' has already been declared*).
- **Cómo se resolvió:** Se unificaron ambas declaraciones de constantes en una sola línea al inicio del archivo `script.js` incorporando todas las llaves necesarias para favoritos, historial y tema oscuro.
