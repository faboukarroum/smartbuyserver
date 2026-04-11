const mongoose = require('mongoose');
const dotenv = require('dotenv');

const products = [
  {
    name: 'Vintage Brass Mirror',
    price: 45.00,
    category: 'Decor',
    image: 'https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=800&h=1000&fit=crop',
    description: 'This stunning vintage brass mirror features intricate scrollwork detailing around its oval frame. Dating back to the mid-20th century, it carries a beautiful natural patina that adds character to any wall. Perfect for a hallway, bedroom, or as a statement piece in a gallery wall.',
    details: [
      'Material: Solid Brass',
      'Dimensions: 45cm x 30cm',
      'Origin: France, circa 1950',
      'Condition: Excellent vintage condition with minor surface wear consistent with age'
    ],
    stock: 5,
    isNew: true
  },
  {
    name: 'Ceramic Tea Set',
    price: 32.50,
    category: 'Kitchen',
    image: 'https://images.unsplash.com/photo-1565193998248-d500a72183b1?w=800&h=1000&fit=crop',
    description: 'A delicate 6-piece ceramic tea set with hand-painted floral motifs. This set includes a teapot, four cups, and a serving tray.',
    details: [
      'Material: Hand-painted Ceramic',
      'Set includes: Teapot, 4 cups, 1 tray',
      'Origin: Portugal, circa 1970',
      'Condition: Mint condition, no chips or cracks'
    ],
    stock: 2,
    isNew: false
  },
  {
    name: 'Antique Typewriter',
    price: 120.00,
    category: 'Collectibles',
    image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&h=1000&fit=crop',
    description: 'A classic mechanical typewriter from the 1940s. Still functional and in great aesthetic condition.',
    details: [
      'Material: Steel, Bakelite keys',
      'Brand: Remington',
      'Origin: USA, circa 1945',
      'Condition: Fully functional, needs new ink ribbon'
    ],
    stock: 1,
    isNew: false
  },
  {
    name: 'Velvet Armchair',
    price: 85.00,
    category: 'Furniture',
    image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800&h=1000&fit=crop',
    description: 'A plush velvet armchair in deep emerald green. This piece adds a touch of luxury and comfort to any living space.',
    details: [
      'Material: Velvet upholstery, Oak legs',
      'Color: Emerald Green',
      'Style: Mid-century modern',
      'Condition: Like new, professionally cleaned'
    ],
    stock: 3,
    isNew: true
  },
  {
    name: 'Wooden Wall Clock',
    price: 55.00,
    category: 'Decor',
    image: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=400&h=500&fit=crop',
    description: 'A rustic wooden wall clock with a minimalist design. Perfect for a farmhouse or modern rustic interior.',
    details: [
      'Material: Reclaimed Pine',
      'Mechanism: Silent quartz movement',
      'Dimensions: 30cm diameter',
      'Condition: Handcrafted new item'
    ],
    stock: 10,
    isNew: false
  },
  {
    name: 'Silver Cutlery Set',
    price: 75.00,
    category: 'Kitchen',
    image: 'https://images.unsplash.com/photo-1591133303642-1250f28e515d?w=400&h=500&fit=crop',
    description: 'An elegant silver-plated cutlery set for 4 people. Includes forks, knives, spoons, and teaspoons.',
    details: [
      'Material: Silver-plated Stainless Steel',
      'Set includes: 16 pieces total',
      'Origin: England, vintage style',
      'Condition: Polished and ready for use'
    ],
    stock: 4,
    isNew: false
  },
  {
    name: 'Leather Suitcase',
    price: 95.00,
    category: 'Collectibles',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=500&fit=crop',
    description: 'A sturdy vintage leather suitcase with brass buckles and a fabric-lined interior.',
    details: [
      'Material: Genuine Cowhide Leather',
      'Hardware: Solid Brass',
      'Origin: Italy, circa 1960',
      'Condition: Beautifully aged with authentic travel scuffs'
    ],
    stock: 2,
    isNew: false
  },
  {
    name: 'Brass Candlestick',
    price: 18.00,
    category: 'Decor',
    image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=400&h=500&fit=crop',
    description: 'A heavy solid brass candlestick holder with a classic turned design.',
    details: [
      'Material: Solid Brass',
      'Height: 20cm',
      'Origin: India, vintage item',
      'Condition: Well-preserved with some natural tarnish'
    ],
    stock: 12,
    isNew: false
  }
];

const users = [
  {
    name: 'Admin User',
    email: 'admin@smartbuy.com',
    password: 'password123',
    role: 'admin'
  },
  {
    name: 'Regular User',
    email: 'user@smartbuy.com',
    password: 'password123',
    role: 'user'
  }
];

const connectDB = require('./config/db');
const Product = require('./models/Product');
const User = require('./models/User');
const Order = require('./models/Order');

dotenv.config();

connectDB();

const importData = async () => {
  try {
    await Order.deleteMany();
    await Product.deleteMany();
    await User.deleteMany();

    const createdUsers = await User.insertMany(users);
    const adminUser = createdUsers[0]._id;

    const sampleProducts = products.map((product) => {
      return { ...product, user: adminUser };
    });

    await Product.insertMany(sampleProducts);

    console.log('Data Imported!');
    process.exit();
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await Order.deleteMany();
    await Product.deleteMany();
    await User.deleteMany();

    console.log('Data Destroyed!');
    process.exit();
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
