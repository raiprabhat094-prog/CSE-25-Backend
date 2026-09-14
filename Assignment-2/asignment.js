const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());


const categories = ['Electronics', 'Clothing', 'Home & Kitchen', 'Books', 'Sports'];

const products = Array.from({ length: 100 }, (_, index) => {
  const id = index + 1;
  const category = categories[index % categories.length];
  return {
    id,
    name: `Product ${id}`,
    description: `This is the detailed description for Product ${id}.`,
    price: parseFloat((Math.random() * 900 + 10).toFixed(2)),
    category,
    inStock: index % 3 !== 0
  };
});


app.get('/api/products', (req, res) => {
  let result = [...products];
  const { page, limit, category, search } = req.query;

  if (category) {
    result = result.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const query = search.toLowerCase();
    result = result.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.description.toLowerCase().includes(query)
    );
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = pageNum * limitNum;

  res.json({
    totalProducts: result.length,
    totalPages: Math.ceil(result.length / limitNum),
    currentPage: pageNum,
    productsPerPage: limitNum,
    data: result.slice(startIndex, endIndex)
  });
});


app.get('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ message: `Product with ID ${id} not found.` });
  }

  res.json(product);
});


app.post('/api/products', (req, res) => {
  const { name, description, price, category, inStock } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({ message: 'Name, price, and category are required.' });
  }

  const newProduct = {
    id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
    name,
    description: description || '',
    price: parseFloat(price),
    category,
    inStock: inStock ?? true
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});


app.put('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = products.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ message: `Product with ID ${id} not found.` });
  }

  const { name, description, price, category, inStock } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({ message: 'Name, price, and category are required.' });
  }

  products[index] = {
    id,
    name,
    description: description || '',
    price: parseFloat(price),
    category,
    inStock: inStock ?? true
  };

  res.json(products[index]);
});


app.delete('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = products.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ message: `Product with ID ${id} not found.` });
  }

  const deletedProduct = products.splice(index, 1)[0];
  res.json({ message: 'Product deleted successfully', product: deletedProduct });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});