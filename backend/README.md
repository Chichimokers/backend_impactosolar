# DotaRankNExt Backend - Guía de Configuración

## 📋 Requisitos Previos

- Node.js 18+ (para desarrollo local)
- Docker y Docker Compose (para producción)
- Steam API Key (ver instrucciones abajo)

## 🔑 Cómo Obtener la Steam API Key

Para implementar el login con Steam, necesitas obtener una API Key de Steam:

1. **Inicia sesión en Steam**
   - Ve a [https://steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
   - Inicia sesión con tu cuenta de Steam

2. **Registra tu aplicación**
   - **Domain Name**: Coloca el dominio de tu aplicación
     - Para desarrollo local: `localhost`
     - Para producción: `inventory.cloudns.be` (o tu dominio)
   - Acepta los términos de uso
   - Haz clic en "Register"

3. **Copia tu API Key**
   - Steam te mostrará tu API Key (una cadena hexadecimal de 32 caracteres)
   - Ejemplo: `ABCDEF1234567890ABCDEF1234567890`

4. **Configura las variables de entorno**
   - Copia la API Key a `.env.local` (desarrollo) y `.env.prod` (producción)
   - Reemplaza `YOUR_STEAM_API_KEY_HERE` con tu key real

## 🚀 Configuración de Entornos

### Desarrollo Local (con Node.js)

```bash
# Instalar dependencias
npm install

# Ejecutar servidor (usa .env.local)
npm start
```

El servidor se ejecutará en `http://localhost:5500` y usará la base de datos local `./steam_friends.db`

### Producción (con Docker)

```bash
# Crear directorio para la base de datos persistente
mkdir -p data

# Construir y ejecutar con Docker Compose (usa .env.prod)
docker-compose up --build -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

La base de datos se guardará en `./data/steam_friends.db` en tu máquina host (fuera del contenedor).

## 📁 Estructura de Archivos de Entorno

### `.env.local` (Desarrollo)
```env
PORT=5500
JWT_SECRET=supersecret_jwt_key_local
STEAM_API_KEY=TU_API_KEY_DE_STEAM_AQUI
REALM=http://localhost:5500/
RETURN_URL=http://localhost:5500/dota/auth/steam/return
FRONTEND_URL=http://localhost:3000
DB_PATH=./steam_friends.db
```

### `.env.prod` (Producción)
```env
PORT=5500
JWT_SECRET=supersecret_jwt_key_prod_CHANGE_THIS
STEAM_API_KEY=TU_API_KEY_DE_STEAM_AQUI
REALM=https://inventory.cloudns.be/
RETURN_URL=https://inventory.cloudns.be/dota/auth/steam/return
FRONTEND_URL=https://inventory.cloudns.be
DB_PATH=/data/steam_friends.db
```

**⚠️ IMPORTANTE:** 
- Cambia `JWT_SECRET` en producción a un valor aleatorio seguro
- Nunca subas los archivos `.env*` a Git (ya están en `.gitignore`)
- Asegúrate de poner tu Steam API Key real en ambos archivos

## 🐳 Docker y Persistencia de Datos

El `docker-compose.yml` está configurado para mantener la base de datos fuera del contenedor:

```yaml
volumes:
  - ./data:/data  # Carpeta local 'data' mapeada a '/data' en el contenedor
```

Esto significa que:
- La base de datos se guarda en `./data/steam_friends.db` en tu host
- Si borras o recreas el contenedor, los datos persisten
- Puedes hacer backup simplemente copiando la carpeta `data/`

## 🔐 Autenticación

### Login de Admin (username/password)
```bash
POST /dota/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "123"
}
```

### Login de Usuarios (Steam OpenID)
1. Redirige al usuario a: `GET /dota/auth/steam`
2. Steam autentica al usuario
3. Steam redirige a: `/dota/auth/steam/return`
4. El backend crea el usuario en la BD y redirige al frontend con el JWT:
   ```
   {FRONTEND_URL}/auth/callback?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## 📡 Endpoints Principales

Todos los endpoints están bajo el prefijo `/dota`:

- `GET /dota` - Health check
- `POST /dota/auth/login` - Login admin
- `GET /dota/auth/steam` - Iniciar login con Steam
- `GET /dota/auth/steam/return` - Callback de Steam
- `GET /dota/players` - Listar players (público)
- `POST /dota/players` - Añadir player (requiere auth admin)
- `POST /dota/players/import` - Importar Excel (requiere auth admin)

Ver `api.yaml` para documentación completa de la API.

## 🔄 Actualización Automática de Players

El sistema incluye un job que se ejecuta cada hora (a los 0 minutos) para actualizar automáticamente la información de todos los players desde OpenDota API.

## 📊 Formato del Excel para Importación

El Excel debe contener (mínimo) estas columnas (no case-sensitive):

- `ID` o `SteamID`: Steam ID de 64 bits
- `JUGADOR` o `player` o `name`: Nombre del jugador
- `Dotabuff`: URL del perfil de Dotabuff

Ejemplo:
| ID | JUGADOR | Dotabuff |
|----|---------|----------|
| 76561198000000000 | PlayerName | https://www.dotabuff.com/players/123456 |

## 🛠️ CI/CD con GitHub Actions

El workflow `.github/workflows/deploy.yml` se activa automáticamente al hacer push a `master` y:

1. Hace checkout del código
2. Instala dependencias
3. Construye la imagen Docker
4. Levanta el servicio con `docker-compose up --build -d`
5. Ejecuta un smoke test

Asegúrate de tener un runner self-hosted configurado en tu VPS.

## 📝 Notas Adicionales

- El usuario admin predeterminado es: `admin` / `123`
- El job de actualización corre cada hora automáticamente
- La base de datos SQLite es ligera y eficiente para este caso de uso
- Para backups, simplemente copia la carpeta `data/`
