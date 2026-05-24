# Auth Service

Servicio de autenticación con soporte para registro/login manual (email + password) y OAuth 2.0 con Google. Construido con Node.js, Express, MongoDB y Passport.js.

---

## Stack

| Tecnología | Uso |
|---|---|
| Node.js + Express | Servidor HTTP |
| MongoDB + Mongoose | Base de datos |
| Passport.js | Estrategia OAuth Google |
| bcrypt | Hash de contraseñas |
| JWT (jsonwebtoken) | Tokens de sesión |

---

## Estructura del proyecto

```
auth-service/
├── src/
│   ├── config/
│   │   ├── db.js               # Conexión a MongoDB
│   │   └── passport.js         # Estrategia Google OAuth
│   ├── controllers/
│   │   └── auth.controller.js  # Lógica de cada endpoint
│   ├── middlewares/
│   │   └── auth.middleware.js  # Verificación de JWT
│   ├── models/
│   │   └── User.js             # Schema + métodos del usuario
│   ├── routes/
│   │   └── auth.routes.js      # Definición de rutas
│   └── app.js                  # Entry point
├── .env
├── .env.example
├── .gitignore
└── package.json
```

---

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/auth-service
JWT_SECRET=string_largo_y_aleatorio
JWT_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

FRONTEND_URL=http://localhost:5173
```

> `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` se obtienen en [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client ID.

---

## Instalación y arranque

```bash
# Instalar dependencias
npm install

# Desarrollo (con hot reload)
npm run dev

# Producción
npm start
```

---

## Endpoints

### Auth local

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | No | Registro con email y password |
| POST | `/api/auth/login` | No | Login con email y password |
| POST | `/api/auth/logout` | Sí | Cierre de sesión |
| GET | `/api/auth/me` | Sí | Datos del usuario autenticado |

### Google OAuth

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/auth/google` | No | Inicia el flujo OAuth con Google |
| GET | `/api/auth/google/callback` | No | Callback que maneja Google |

### Health check

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Verifica que el servidor esté corriendo |

---

### `POST /api/auth/register`

Crea un nuevo usuario con email y password. El password se hashea automáticamente antes de guardarse. Devuelve un JWT para que el usuario quede autenticado de inmediato.

**Body:**
```json
{
  "email": "juan@test.com",
  "password": "123456",
  "nombre": "Juan",
  "apellido": "Pérez"
}
```

**Respuesta exitosa `201`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "email": "juan@test.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "emailVerified": false,
    "googleId": null,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

**Errores:**
```json
// 409 - Email ya registrado
{ "message": "El email ya está registrado" }

// 400 - Faltan campos
{ "message": "Email y password son requeridos" }
```

---

### `POST /api/auth/login`

Verifica credenciales y devuelve un JWT. Si la cuenta fue creada con Google y no tiene password local, retorna un error descriptivo.

**Body:**
```json
{
  "email": "juan@test.com",
  "password": "123456"
}
```

**Respuesta exitosa `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

**Errores:**
```json
// 401 - Credenciales incorrectas
{ "message": "Credenciales inválidas" }

// 400 - Cuenta de Google sin password local
{ "message": "Esta cuenta usa Google para autenticarse" }
```

---

### `GET /api/auth/me`

Devuelve los datos del usuario autenticado. Requiere JWT en el header.

**Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Respuesta exitosa `200`:**
```json
{
  "user": {
    "_id": "...",
    "email": "juan@gmail.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "fotoUrl": "https://lh3.googleusercontent.com/...",
    "emailVerified": true
  }
}
```

**Errores:**
```json
// 401 - Sin token
{ "message": "Token requerido" }

// 401 - Token inválido o expirado
{ "message": "Token inválido o expirado" }
```

---

### `GET /api/auth/google`

Redirige al usuario a la pantalla de autenticación de Google. Passport intercepta esta ruta antes de que llegue a cualquier controller. El usuario nunca ve una respuesta directa de tu servidor aquí.

No requiere body ni headers. Abre directamente en el browser.

---

### `GET /api/auth/google/callback`

Google redirige a esta URL después de que el usuario acepta los permisos. Passport intercepta el código que envía Google, lo intercambia por un access token, obtiene el perfil del usuario y ejecuta la lógica en `passport.js`. Si todo es exitoso, genera un JWT y redirige al frontend.

No se llama manualmente. Google la invoca automáticamente.

---

## Descripción de archivos

### `src/app.js`

Entry point del servidor. Registra middlewares globales (CORS, JSON parser, Passport), monta las rutas y arranca la conexión a MongoDB antes de escuchar peticiones.

```
app.js
  ├── dotenv.config()          → carga variables de entorno
  ├── cors()                   → permite requests del frontend
  ├── express.json()           → parsea body JSON
  ├── passport.initialize()    → activa Passport sin sesiones
  ├── /api/auth → auth.routes  → monta las rutas de auth
  └── connectDB() → app.listen → conecta MongoDB y arranca servidor
```

---

### `src/config/db.js`

Encapsula la conexión a MongoDB con Mongoose. Si la conexión falla, termina el proceso con `process.exit(1)` para evitar que el servidor arranque sin base de datos.

---

### `src/config/passport.js`

Registra la estrategia Google OAuth en Passport. Se ejecuta una sola vez al arrancar el servidor. Contiene la lógica de tres escenarios:

- **Usuario ya tiene `googleId`** → lo devuelve directamente
- **Mismo email, registro manual previo** → vincula el `googleId` a la cuenta existente (account linking)
- **Usuario nuevo** → crea la cuenta con los datos del perfil de Google

---

### `src/models/User.js`

Define el schema de MongoDB con soporte para autenticación dual. Incluye:

- **Pre-save middleware**: hashea el `passwordHash` automáticamente antes de guardar. Solo corre si el campo fue modificado.
- **`compararPassword()`**: método de instancia que usa `bcrypt.compare` para verificar el password en login.
- **Virtual `nombreCompleto`**: campo calculado que combina nombre y apellido.
- **`toJSON` transform**: elimina `passwordHash` y `__v` de todas las respuestas JSON automáticamente.

**Campos del usuario:**

| Campo | Tipo | Descripción |
|---|---|---|
| `email` | String | Identificador único, normalizado a lowercase |
| `emailVerified` | Boolean | Google lo marca como `true` automáticamente |
| `nombre` | String | Nombre del usuario |
| `apellido` | String | Apellido del usuario |
| `fotoUrl` | String | URL del avatar (viene de Google) |
| `passwordHash` | String | Hash bcrypt. `null` si se registró con Google |
| `googleId` | String | ID único de Google. `null` si es registro manual |
| `createdAt` | Date | Generado automáticamente por `timestamps: true` |
| `updatedAt` | Date | Generado automáticamente por `timestamps: true` |

> `googleId` usa `sparse: true` para permitir múltiples documentos con `null` sin violar el índice único.

---

### `src/middlewares/auth.middleware.js`

Middleware `verifyToken` que protege rutas. Extrae el JWT del header `Authorization: Bearer <token>`, lo verifica con `JWT_SECRET`, busca al usuario en MongoDB y lo inyecta en `req.user`. Si algo falla devuelve `401`.

---

### `src/controllers/auth.controller.js`

Contiene la lógica HTTP de cada endpoint. Se mantiene delgado: delega la lógica de negocio al modelo y solo maneja request/response.

- **`register`**: valida campos, verifica duplicados, crea usuario, genera JWT.
- **`login`**: busca por email, llama `compararPassword()`, genera JWT.
- **`googleCallback`**: recibe `req.user` de Passport, genera JWT, redirige al frontend.
- **`me`**: devuelve `req.user` inyectado por el middleware.
- **`logout`**: con JWT stateless no invalida nada en servidor. El cliente elimina el token.

---

### `src/routes/auth.routes.js`

Define y agrupa todas las rutas del servicio. Aplica el middleware `verifyToken` solo a las rutas que lo requieren.

---

## Flujo: Auth local (email + password)

```
┌─────────┐                        ┌───────────┐                  ┌──────────┐
│ Cliente │                        │  Backend  │                  │ MongoDB  │
└────┬────┘                        └─────┬─────┘                  └────┬─────┘
     │                                   │                              │
     │  POST /register                   │                              │
     │  { email, password, nombre }      │                              │
     │ ────────────────────────────────► │                              │
     │                                   │  findOne({ email })          │
     │                                   │ ────────────────────────────►│
     │                                   │  null (no existe)            │
     │                                   │ ◄────────────────────────────│
     │                                   │                              │
     │                                   │  pre-save middleware         │
     │                                   │  bcrypt.hash(password)       │
     │                                   │                              │
     │                                   │  User.create(...)            │
     │                                   │ ────────────────────────────►│
     │                                   │  usuario guardado            │
     │                                   │ ◄────────────────────────────│
     │                                   │                              │
     │                                   │  jwt.sign({ id: user._id })  │
     │                                   │                              │
     │  { token, user }                  │                              │
     │ ◄────────────────────────────────  │                              │
     │                                   │                              │
     │  POST /login                      │                              │
     │  { email, password }              │                              │
     │ ────────────────────────────────► │                              │
     │                                   │  findOne({ email })          │
     │                                   │ ────────────────────────────►│
     │                                   │  usuario encontrado          │
     │                                   │ ◄────────────────────────────│
     │                                   │                              │
     │                                   │  bcrypt.compare(             │
     │                                   │    passwordIngresada,        │
     │                                   │    user.passwordHash         │
     │                                   │  )  → true                   │
     │                                   │                              │
     │                                   │  jwt.sign({ id: user._id })  │
     │                                   │                              │
     │  { token, user }                  │                              │
     │ ◄────────────────────────────────  │                              │
     │                                   │                              │
     │  GET /me                          │                              │
     │  Authorization: Bearer <token>    │                              │
     │ ────────────────────────────────► │                              │
     │                                   │  verifyToken middleware       │
     │                                   │  jwt.verify(token)           │
     │                                   │  findById(decoded.id)        │
     │                                   │ ────────────────────────────►│
     │                                   │  usuario                     │
     │                                   │ ◄────────────────────────────│
     │                                   │                              │
     │  { user }                         │                              │
     │ ◄────────────────────────────────  │                              │
```

---

## Flujo: Google OAuth 2.0

```
┌─────────┐       ┌───────────┐       ┌─────────────┐       ┌──────────┐
│ Browser │       │  Backend  │       │   Passport  │       │  Google  │
└────┬────┘       └─────┬─────┘       └──────┬──────┘       └────┬─────┘
     │                  │                    │                    │
     │ GET /auth/google │                    │                    │
     │ ───────────────► │                    │                    │
     │                  │ authenticate()     │                    │
     │                  │ ──────────────────►│                    │
     │                  │                    │ redirect a Google  │
     │ ◄───────────────────────────────────────────────────────── │
     │                  │                    │                    │
     │  usuario ve pantalla de Google        │                    │
     │  y acepta los permisos                │                    │
     │ ──────────────────────────────────────────────────────────►│
     │                  │                    │                    │
     │                  │ GET /callback      │                    │
     │                  │ ?code=xxx          │                    │
     │                  │ ◄──────────────────────────────────────  │
     │                  │                    │                    │
     │                  │ authenticate()     │                    │
     │                  │ ──────────────────►│                    │
     │                  │                    │ intercambia code   │
     │                  │                    │ por access_token   │
     │                  │                    │ ──────────────────►│
     │                  │                    │ access_token       │
     │                  │                    │ ◄──────────────────│
     │                  │                    │                    │
     │                  │                    │ GET perfil usuario │
     │                  │                    │ ──────────────────►│
     │                  │                    │ { id, email,       │
     │                  │                    │   nombre, foto }   │
     │                  │                    │ ◄──────────────────│
     │                  │                    │                    │
     │                  │                    │ ejecuta passport.js│
     │                  │                    │ findOne(googleId)  │
     │                  │                    │ o crea usuario     │
     │                  │                    │                    │
     │                  │ req.user listo     │                    │
     │                  │ ◄──────────────────│                    │
     │                  │                    │                    │
     │                  │ googleCallback()   │                    │
     │                  │ jwt.sign(user._id) │                    │
     │                  │                    │                    │
     │ redirect frontend?token=JWT           │                    │
     │ ◄───────────────  │                    │                    │
```

---

## Los tres escenarios de Google OAuth

```
┌─────────────────────────────────────────────────────────────────────┐
│  Google devuelve profile { id, email, nombre, foto }                │
│                                                                     │
│  ¿Existe usuario con googleId = profile.id?                         │
│                                                                     │
│      SÍ ──────────────────────────────────────────────────────────► │
│      devuelve el usuario tal cual (login normal)                    │
│                                                                     │
│      NO → ¿Existe usuario con ese email (registro manual previo)?   │
│                                                                     │
│             SÍ ─────────────────────────────────────────────────►  │
│             vincula googleId a la cuenta existente                  │
│             (account linking: ahora puede entrar con ambos métodos) │
│                                                                     │
│             NO ─────────────────────────────────────────────────►  │
│             crea cuenta nueva con datos de Google                   │
│             sin passwordHash (null)                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Modelo de usuario en MongoDB

```js
// Usuario registrado manualmente
{
  email:         "juan@hotmail.com",
  emailVerified: false,
  nombre:        "Juan",
  apellido:      "Pérez",
  fotoUrl:       null,
  passwordHash:  "$2b$12$xxxxxxxxxxxxxxxxxxxxx",  // bcrypt hash
  googleId:      null,
  createdAt:     "2025-01-01T00:00:00.000Z"
}

// Usuario registrado con Google
{
  email:         "juan@gmail.com",
  emailVerified: true,                            // Google lo verifica
  nombre:        "Juan",
  apellido:      "Pérez",
  fotoUrl:       "https://lh3.googleusercontent.com/...",
  passwordHash:  null,                            // no tiene contraseña
  googleId:      "109876543210",
  createdAt:     "2025-01-01T00:00:00.000Z"
}

// Usuario con ambos métodos vinculados
{
  email:         "juan@gmail.com",
  emailVerified: true,
  nombre:        "Juan",
  apellido:      "Pérez",
  fotoUrl:       "https://lh3.googleusercontent.com/...",
  passwordHash:  "$2b$12$xxxxxxxxxxxxxxxxxxxxx",  // también tiene password
  googleId:      "109876543210",
  createdAt:     "2025-01-01T00:00:00.000Z"
}
```

---

## Probar con Postman

### Register
```
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "juan@test.com",
  "password": "123456",
  "nombre": "Juan",
  "apellido": "Pérez"
}
```

### Login
```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "juan@test.com",
  "password": "123456"
}
```

### Ruta protegida
```
GET http://localhost:3000/api/auth/me
Authorization: Bearer <token del login>
```

### Google OAuth
Abre en el browser:
```
http://localhost:3000/api/auth/google
```

---

## Notas de seguridad

- El `passwordHash` nunca aparece en respuestas JSON (eliminado por el transform de `toJSON`).
- Se usa el mismo mensaje `"Credenciales inválidas"` para email inexistente y password incorrecto, evitando enumeración de usuarios.
- `googleId` es el identificador de identidad OAuth, no el email. El email puede cambiar; el `googleId` es inmutable.
- bcrypt con `SALT_ROUNDS = 12` hace el ataque de fuerza bruta computacionalmente inviable.
- JWT sin sesiones en servidor (stateless). El logout es responsabilidad del cliente.