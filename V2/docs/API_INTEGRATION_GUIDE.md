# API Integration Guide

## 🚀 **Setup Lengkap dengan API Backend**

### **1. Struktur Project**
```
IoT-Scales/V2/
├── server.js                 # Express.js API Backend
├── src/
│   ├── services/
│   │   └── api.js           # API Service untuk Frontend
│   ├── components/
│   │   └── database/
│   │       └── MasterProduct.jsx  # Updated dengan API integration
│   └── ...
├── package.json            # Updated dengan dependencies
└── dist/                   # Built React app
```

### **2. Dependencies yang Ditambahkan**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "pg": "^8.16.3"
  }
}
```

### **3. API Endpoints yang Tersedia**

#### **Products API**
- `GET /api/products` - Get all SKU/Finished Products
- `GET /api/products/:id` - Get specific product
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

#### **Ingredients API**
- `GET /api/ingredients` - Get all raw materials
- `GET /api/ingredients/:id` - Get specific ingredient
- `POST /api/ingredients` - Create new ingredient
- `PUT /api/ingredients/:id` - Update ingredient
- `DELETE /api/ingredients/:id` - Delete ingredient

#### **Formulations API**
- `GET /api/formulations` - Get all formulations
- `GET /api/formulations/:id` - Get specific formulation
- `GET /api/formulations/:id/ingredients` - Get formulation ingredients
- `POST /api/formulations` - Create new formulation
- `PUT /api/formulations/:id` - Update formulation
- `DELETE /api/formulations/:id` - Delete formulation

#### **Tolerance Groupings API**
- `GET /api/tolerance-groupings` - Get all tolerance groupings
- `GET /api/tolerance-groupings/:id` - Get specific tolerance grouping
- `POST /api/tolerance-groupings` - Create new tolerance grouping
- `PUT /api/tolerance-groupings/:id` - Update tolerance grouping
- `DELETE /api/tolerance-groupings/:id` - Delete tolerance grouping

#### **Health Check**
- `GET /api/health` - Check database connection

### **4. Cara Menjalankan**

#### **Development Mode**
```bash
# Terminal 1: Start API Backend
npm run server

# Terminal 2: Start React Dev Server
npm run dev
```

#### **Production Mode**
```bash
# Build React app
npm run build

# Start production server
npm start
```

### **5. Database Connection**
- **Host**: localhost
- **Port**: 5432
- **Database**: FLB_MOWS
- **Username**: postgres
- **Password**: Admin123

### **6. Features yang Sudah Diintegrasikan**

#### **MasterProduct.jsx**
- ✅ **Real Data Loading**: Mengambil data dari database via API
- ✅ **CRUD Operations**: Create, Read, Update, Delete products
- ✅ **Loading States**: Spinner dan loading indicators
- ✅ **Error Handling**: Error messages dan retry functionality
- ✅ **Tolerance Groupings**: Dropdown dengan data dari database
- ✅ **Search & Filter**: Pencarian berdasarkan product code, name, tolerance grouping
- ✅ **Form Validation**: Validasi input sebelum submit

#### **API Service (src/services/api.js)**
- ✅ **Generic Request Method**: Handles all API calls
- ✅ **Error Handling**: Consistent error handling across all endpoints
- ✅ **Response Formatting**: Standardized response format
- ✅ **CORS Support**: Cross-origin requests enabled

#### **Express.js Backend (server.js)**
- ✅ **Database Connection**: PostgreSQL connection pool
- ✅ **CORS Middleware**: Cross-origin resource sharing
- ✅ **JSON Parsing**: Request body parsing
- ✅ **Static File Serving**: Serves React app
- ✅ **Health Check**: Database connection monitoring
- ✅ **Graceful Shutdown**: Proper cleanup on exit

### **7. Data Flow**

```
React UI → API Service → Express.js → PostgreSQL Database
    ↑                                           ↓
    ←─────────── Response Data ←─────────────────
```

### **8. Testing**

#### **API Health Check**
```bash
curl http://localhost:3001/api/health
```

#### **Get Products**
```bash
curl http://localhost:3001/api/products
```

#### **Get Tolerance Groupings**
```bash
curl http://localhost:3001/api/tolerance-groupings
```

### **9. Troubleshooting**

#### **Database Connection Issues**
- Pastikan PostgreSQL berjalan
- Cek kredensial database di `server.js`
- Test koneksi dengan `psql -U postgres -d FLB_MOWS`

#### **API Connection Issues**
- Pastikan server berjalan di port 3001
- Cek CORS settings
- Test dengan curl atau Postman

#### **Frontend Issues**
- Pastikan API service URL benar
- Cek browser console untuk errors
- Test API endpoints secara terpisah

### **10. Next Steps**

1. **Update MasterFormulation.jsx** - Integrate dengan API
2. **Update MasterToleranceGrouping.jsx** - Integrate dengan API
3. **Update MasterUser.jsx** - Integrate dengan API
4. **Add Authentication** - JWT token authentication
5. **Add Logging** - Request/response logging
6. **Add Validation** - Input validation middleware
7. **Add Rate Limiting** - API rate limiting
8. **Add Caching** - Redis caching untuk performance

### **11. Performance Considerations**

- **Database Connection Pool**: Menggunakan connection pooling
- **API Response Caching**: Cache untuk data yang jarang berubah
- **Pagination**: Implement pagination untuk large datasets
- **Compression**: Gzip compression untuk responses
- **CDN**: Static file serving via CDN

### **12. Security Considerations**

- **Input Validation**: Validate semua input
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Restrict CORS origins
- **Rate Limiting**: Prevent API abuse
- **Authentication**: JWT token authentication
- **HTTPS**: SSL/TLS encryption

## 🎯 **Status Integration**

- ✅ **API Backend**: Express.js server dengan PostgreSQL
- ✅ **Database Connection**: Koneksi database berfungsi
- ✅ **API Endpoints**: Semua endpoints tersedia
- ✅ **Frontend Integration**: MasterProduct.jsx terintegrasi
- ✅ **Loading States**: UI feedback untuk loading
- ✅ **Error Handling**: Error handling yang robust
- ✅ **Data Validation**: Form validation
- ✅ **Testing**: API endpoints tested

## 🚀 **Ready to Use!**

Sistem sekarang sudah terintegrasi penuh dengan database. UI akan menampilkan data real dari database PostgreSQL, dan semua CRUD operations akan tersimpan ke database.

