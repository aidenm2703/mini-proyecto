// ==========================================
// CAPA DE DATOS (DataLayer)
// ==========================================
const DataLayer = {
  STORAGE_KEY: 'sys_admin_data',
  data: { clientes: [], productos: [], proveedores: [], pedidos: [], config: { loggedUser: null } },

  init() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try { this.data = JSON.parse(stored); } catch (e) { this.generateMockData(); }
    } else {
      this.generateMockData();
    }
  },

  save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
  },

  getAll(entity) {
    return this.data[entity] || [];
  },

  getById(entity, id) {
    return this.getAll(entity).find(item => item.id === id);
  },

  create(entity, item) {
    item.id = this.getAll(entity).length > 0 ? Math.max(...this.getAll(entity).map(i => i.id)) + 1 : 1;
    this.data[entity].push(item);
    this.save();
    return item;
  },

  update(entity, id, newData) {
    const index = this.data[entity].findIndex(i => i.id === id);
    if (index !== -1) {
      this.data[entity][index] = { ...this.data[entity][index], ...newData };
      this.save();
      return true;
    }
    return false;
  },

  remove(entity, id) {
    this.data[entity] = this.data[entity].filter(i => i.id !== id);
    this.save();
  },

  generateMockData() {
    const nombres = ['Ana', 'Carlos', 'María', 'Diego', 'Laura', 'Roberto', 'Gabriela', 'Fernando', 'Isabel', 'Andrés', 'Patricia', 'Mauricio', 'Carolina', 'Jorge', 'Valentina', 'Luis', 'Sofía', 'Daniel', 'Camila', 'José'];
    const apellidos = ['Roja', 'Chaves', 'Ramírez', 'Méndez', 'Morales', 'Soto', 'Jiménez', 'Navarro', 'Ruiz', 'Castro', 'Hernández', 'Vargas', 'Solís', 'Aguilar', 'Vega', 'Leiva', 'Umaña', 'Barquero', 'Flores', 'Mora'];
    const ciudades = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'];
    const categoriasProd = ['Electrónicos', 'Oficina', 'Mobiliario', 'Insumos'];

    // Generar 80 Clientes
    for (let i = 0; i < 80; i++) {
      this.data.clientes.push({
        id: i + 1,
        nombre: `${nombres[Math.floor(Math.random() * nombres.length)]} ${apellidos[Math.floor(Math.random() * apellidos.length)]} ${apellidos[Math.floor(Math.random() * apellidos.length)]}`,
        cedula: `${Math.floor(Math.random() * 7) + 1}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
        email: `cliente${i + 1}@correo.cr`,
        telefono: `${Math.random() > 0.5 ? '2' : '8'}${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
        direccion: ciudades[Math.floor(Math.random() * ciudades.length)] + ', Costa Rica',
        estado: Math.random() > 0.2 ? 'Activo' : 'Inactivo'
      });
    }

    // Generar 100 Productos
    for (let i = 0; i < 100; i++) {
      this.data.productos.push({
        id: i + 1,
        nombre: `Producto ${nombres[Math.floor(Math.random() * nombres.length)]} ${i + 1}`,
        codigo: `PROD-${String(i + 1).padStart(4, '0')}`,
        categoria: categoriasProd[Math.floor(Math.random() * categoriasProd.length)],
        precio: Math.floor(Math.random() * 200000) + 5000,
        stock: Math.floor(Math.random() * 50),
        estado: Math.random() > 0.1 ? 'Disponible' : 'Agotado'
      });
    }

    // Generar 40 Proveedores
    const catProv = ['Tecnología', 'Suministros', 'Servicios', 'Logística'];
    for (let i = 0; i < 40; i++) {
      this.data.proveedores.push({
        id: i + 1,
        nombre: `Proveedor ${apellidos[Math.floor(Math.random() * apellidos.length)]} S.A.`,
        cedula: `3-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
        telefono: `22${String(Math.floor(Math.random() * 99)).padStart(2, '0')}-${String(Math.floor(Math.random() * 99)).padStart(2, '0')}`,
        email: `proveedor${i + 1}@empresa.cr`,
        direccion: ciudades[Math.floor(Math.random() * ciudades.length)] + ', CR',
        categoria: catProv[Math.floor(Math.random() * catProv.length)],
        estado: 'Activo'
      });
    }
    this.save();
  }
};

// Utilidades Globales
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function exportToJSON() {
  const dataStr = JSON.stringify(DataLayer.data, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; 
  a.download = "sys_admin_backup.json"; 
  a.click();
  URL.revokeObjectURL(url);
}

function importFromJSON(jsonString) {
  try {
    const imported = JSON.parse(jsonString);
    if (imported.clientes && imported.productos) {
      DataLayer.data = imported;
      DataLayer.save();
      return true;
    }
    return false;
  } catch (e) { return false; }
}

// Inicializar al cargar
DataLayer.init();