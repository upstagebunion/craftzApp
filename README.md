<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18.x-green?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Express.js-Backend-blue?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/MongoDB-Atlas-brightgreen?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Hosted%20on-Render-purple?style=for-the-badge"/>
</p>

<h1 align="center">🛒 Craftz Backend API</h1>
<h3 align="center">A full-featured backend system for a custom clothing e-commerce store</h3>

<p align="center">
  <em>Inventory. Auth. Product Management. All powered by Node.js and MongoDB.</em>
</p>

---

## 📌 Overview

This is the backend for **Craftz Store**, an online clothing business. It handles:

- 🔐 User authentication
- 📦 Product registration and variant management
- 📂 Category and subcategory structure
- 🛍️ Sales/Orders management
- ☁️ MongoDB Atlas cloud database
- 🚀 Deployed live on Render

It is designed as a modular REST API, built in **Node.js + Express**, using **MongoDB** for persistence and structured to support scalable e-commerce features.

---

## 🔧 Tech Stack

| Tool | Purpose |
|------|---------|
| **Node.js** | Backend runtime |
| **Express.js** | Web framework |
| **MongoDB Atlas** | Cloud-hosted NoSQL DB |
| **Mongoose** | ODM for MongoDB |
| **Render** | Hosting platform |
| **JWT** | Auth & protected routes |

---

## 🌐 Live API

> 🟢 The API is deployed and running on Render.

- **Base URL:** `https://craftz-api.onrender.com/`  
- Health check: `GET /` → `API funcionando`  
- Auth route: `POST /auth/login`  
- Product route: `GET /api/productos` *(protected)*

---

## 📁 Main Endpoints

### 🔐 Auth (`/auth`)
- `POST /register` – Create a user
- `POST /login` – Log in and get JWT
- `GET /tokenVerify` – Check valid session

### 📦 Products (`/api/productos`)
- `GET /` – List all products
- `POST /` – Create a new product
- `PATCH /actualizar` – Update product info
- Add/remove variants, colors, sizes
- All protected via JWT middleware

### 📂 Categories (`/api/categorias`)
- `GET /` – List all categories
- `POST /` – Create category
- `POST /:id/subcategorias` – Add subcategories

### 🛍️ Sales (`/api/ventas`)
- `POST /` – Create a new sale
- `GET /` – Get all sales
- `PATCH /:id` – Update order status

---

## 🧠 Data Modeling

Products are structured to handle a flexible variety system:

```js
{
  nombre: "Playera personalizada",
  descripcion: "Corte recto, algodón 100%",
  categoria: ObjectId,
  subcategoria: ObjectId,
  variantes: [
    {
      tipo: "Estándar",
      colores: [
        {
          color: "Negro",
          tallas: [
            { talla: "M", stock: 10, precio: 199 }
          ]
        }
      ]
    }
  ],
  imagenes: [ "url1.jpg", "url2.jpg" ],
  activo: true
}
```

## 🔐 Auth Middleware
All sensitive routes are protected with JWT-based middleware:
```
const authMiddleware = require('../middleware/auth');
router.get('/', authMiddleware, obtenerProductos);
```

## 🚀 Deployment
- Database: MongoDB Atlas (cloud)
- App Hosting: Render
- CI/CD: GitHub → Render auto-deploy from main branch

## 🛣️ Roadmap
- Completed 
    - Auth & JWT protection
    - Full CRUD for products, variants, sizes, colors
    - Sales endpoints
    - MongoDB Atlas + live deployment
- Missing
    - Admin roles & permissions
    - Inventory analytics
    - Frontend integration with craftzapp.craftzstore.com
 
## 👨‍💻 Author
Developed by Francisco García Solís — built to scale.

## 📎 Related Repos
- Frontend - CraftzApp (Flutter, Dart)

> "A backend built for flexibility, precision, and power — tailored for real-world e-commerce." 💼🧵
