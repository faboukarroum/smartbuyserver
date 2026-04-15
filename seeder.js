const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const User = require('./models/User');
const Order = require('./models/Order');

dotenv.config();

const users = [
  {
    name: 'Admin User',
    email: 'admin@smartbuy.com',
    password: 'password123',
    role: 'admin'
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'user'
  }
];

const products = [
  // --- PARKSIDE (tools) ---
  {
    name: 'Parkside 20V Cordless Angle Grinder',
    price: 65.00,
    category: 'tools',
    image: 'https://images.unsplash.com/photo-1504148455328-497c5efdf156?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1530124560676-4cb0a887f4c0?w=800&q=80',
      'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=800&q=80'
    ],
    description: 'Robust angle grinder for cutting and grinding metal, concrete or tiles. Rubberized housing with robust aluminum front.',
    details: ['Speed: 2500-10000 rpm', 'Disc size: Ø 125 mm', 'Spindle lock for easy disc change', 'Compatible with X 20V Team batteries'],
    stock: 12,
    isNew: true
  },
  {
    name: 'Parkside Performance 20V Cordless Hammer Drill',
    price: 95.00,
    category: 'tools',
    image: 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1504148455328-497c5efdf156?w=800&q=80',
      'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&q=80'
    ],
    description: 'Brushless motor for extra power and longer life. 2-speed gearbox with switchable high-performance hammer mechanism.',
    details: ['Max Torque: 80 Nm', 'Impact rate: 36000 bpm', 'Metal keyless chuck', 'Integrated LED light'],
    stock: 10,
    isNew: true
  },
  {
    name: 'Parkside Electric Leaf Blower & Vacuum',
    price: 55.00,
    category: 'tools',
    image: 'https://images.unsplash.com/photo-1590105577767-e23a1a44b02f?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1590105577767-e23a1a44b02f?w=800&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80'
    ],
    description: '3-in-1: powerful blower, efficient vacuum and integrated mulching function. Large 45L collection bag.',
    details: ['Power: 3000W', 'Air speed: up to 320 km/h', 'Suction volume: 14 m³/min', 'Adjustable shoulder strap'],
    stock: 15,
    isNew: false
  },
  {
    name: 'Parkside 20V Cordless Jigsaw',
    price: 49.00,
    category: 'tools',
    image: 'https://images.unsplash.com/photo-1530124560676-4cb0a887f4c0?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1504148455328-497c5efdf156?w=800&q=80',
      'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&q=80'
    ],
    description: 'Fast sawing progress and optimal curve maneuverability thanks to 3-stage adjustable pendulum stroke.',
    details: ['No-load stroke rate: 0-2700 rpm', 'Cutting depth: 80mm in wood', 'Saw-dust blower function', 'X 20V Team compatible'],
    stock: 18,
    isNew: true
  },
  {
    name: 'Parkside Pressure Washer PHD 170',
    price: 135.00,
    category: 'tools',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1590105577767-e23a1a44b02f?w=800&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80'
    ],
    description: 'Powerful aluminum high-pressure pump with long life and high corrosion resistance. Ideal for vehicles, terraces and facades.',
    details: ['Pressure: max 170 bar', 'Flow rate: max 500 L/h', '10m anti-twist high-pressure hose', 'Integrated detergent tank'],
    stock: 7,
    isNew: false
  },
  {
    name: 'Parkside 20V Cordless Circular Saw',
    price: 79.00,
    category: 'tools',
    image: 'https://images.unsplash.com/photo-1504148455328-497c5efdf156?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1530124560676-4cb0a887f4c0?w=800&q=80',
      'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&q=80'
    ],
    description: 'Infinitely adjustable cutting depth and cutting angle. Switchable laser guidance for precise cutting.',
    details: ['Speed: 3800 rpm', 'Blade: Ø 150 mm', 'Cutting angle: 0-45°', 'Safety switch with quick stop'],
    stock: 9,
    isNew: true
  },
  {
    name: 'Parkside Bench Grinder',
    price: 42.00,
    category: 'tools',
    image: 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1504148455328-497c5efdf156?w=800&q=80',
      'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=800&q=80'
    ],
    description: 'Ideal for grinding, sharpening, deburring and derusting steel and metal. Maintenance-free, quiet induction motor.',
    details: ['Power: 200W', 'Wheel size: Ø 150 mm', 'Adjustable spark guards', 'Tool-free adjustable work supports'],
    stock: 11,
    isNew: false
  },
  {
    name: 'Parkside 4V Cordless Screwdriver',
    price: 25.00,
    category: 'tools',
    image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1504148455328-497c5efdf156?w=800&q=80',
      'https://images.unsplash.com/photo-1530124560676-4cb0a887f4c0?w=800&q=80'
    ],
    description: 'Compact screwdriver with rotatable handle for hard-to-reach places. Integrated LED work light.',
    details: ['Battery: 4V Li-Ion', 'Torque: 10 Nm', 'Includes 30 bits', 'USB-C charging port'],
    stock: 30,
    isNew: true
  },

  // --- SILVERCREST (kitchen & home) ---
  {
    name: 'Silvercrest Digital Air Fryer',
    price: 75.00,
    category: 'kitchen',
    image: 'https://images.unsplash.com/photo-1584949514123-474cfa705df2?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&q=80',
      'https://images.unsplash.com/photo-1584949514123-474cfa705df2?w=800&q=80'
    ],
    description: 'Frying without additional oil or fat. Digital touch control with 8 preset programs.',
    details: ['Capacity: 2.2L', 'Power: 1400W', 'Timer: 60 min', 'Temperature: 80°C to 200°C'],
    stock: 20,
    isNew: true
  },
  {
    name: 'Silvercrest Bread Maker',
    price: 85.00,
    category: 'kitchen',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?w=800&q=80',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80'
    ],
    description: 'With 16 programs and 3 selectable browning levels. Fully automated program sequences – mixing, kneading, rising and baking.',
    details: ['Power: 850W', 'Bread weight: 750/1000/1250g', 'Express program (80 min)', '15-hour timer for delayed baking'],
    stock: 6,
    isNew: false
  },
  {
    name: 'Silvercrest Kitchen Radio with Bluetooth',
    price: 35.00,
    category: 'electronics',
    image: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=800&q=80',
      'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=800&q=80'
    ],
    description: 'Under-cabinet radio with FM reception and Bluetooth for wireless music streaming from your smartphone.',
    details: ['Power output: 2 x 0.8W', '30 station presets', 'Large LED display', 'Includes mounting hardware'],
    stock: 14,
    isNew: true
  },
  {
    name: 'Silvercrest 2-in-1 Cordless Vacuum Cleaner',
    price: 99.00,
    category: 'home',
    image: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
      'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&q=80'
    ],
    description: 'Modern cyclone technology for bagless vacuuming. Can be used as a handheld or floor vacuum cleaner.',
    details: ['Battery: 18V Li-Ion', 'Runtime: 40 min', 'Motorized floor brush', 'HEPA filter included'],
    stock: 10,
    isNew: true
  },
  {
    name: 'Silvercrest Induction Hob',
    price: 45.00,
    category: 'kitchen',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1556911224-b9c5e11eb84f?w=800&q=80',
      'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80'
    ],
    description: 'For fast and energy-saving cooking. With easy-care special glass surface and touch control panel.',
    details: ['Power: 2000W', '10 power levels', 'Temperature range: 60-240°C', 'Automatic pot detection'],
    stock: 12,
    isNew: false
  },
  {
    name: 'Silvercrest Electric Milk Frother',
    price: 28.00,
    category: 'kitchen',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&q=80',
      'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&q=80'
    ],
    description: 'For perfect milk foam in a short time. 4 consistency options: warm and firm, warm and creamy, cold, or warm milk.',
    details: ['Capacity: 300ml', 'Non-stick coating by ILAG', 'Automatic safety shut-off', '360° base'],
    stock: 25,
    isNew: true
  },
  {
    name: 'Silvercrest Toaster with Warming Rack',
    price: 22.00,
    category: 'kitchen',
    image: 'https://images.unsplash.com/photo-1584990333910-efed3a05b424?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1544259686-a0e1e1fa5f2f?w=800&q=80',
      'https://images.unsplash.com/photo-1584990333910-efed3a05b424?w=800&q=80'
    ],
    description: 'Polished stainless steel front with variable browning control and integrated bun warmer.',
    details: ['Power: 920W', 'Defrost and reheat function', 'Removable crumb tray', 'Auto-centering for even browning'],
    stock: 40,
    isNew: false
  },
  {
    name: 'Silvercrest Personal Blender Mix & Go',
    price: 32.00,
    category: 'kitchen',
    image: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&q=80',
      'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&q=80'
    ],
    description: 'Prepare fresh smoothies directly in the drinking cup. Includes 2 cups with lids for on-the-go.',
    details: ['Power: 300W', 'Cup capacity: 600ml', 'Stainless steel cross-blade', 'Dishwasher-safe parts'],
    stock: 22,
    isNew: true
  },

  // --- TEFAL (kitchen) ---
  {
    name: 'Tefal Express Essential Steam Generator',
    price: 120.00,
    category: 'home',
    image: 'https://images.unsplash.com/photo-1517420829317-adff607ff910?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80',
      'https://images.unsplash.com/photo-1517420829317-adff607ff910?w=800&q=80'
    ],
    description: 'Faster ironing with powerful steam. Xpress Glide soleplate for smooth gliding on any fabric.',
    details: ['Steam pressure: 5.2 bar', 'Water tank: 1.4L', 'Vertical steam function', 'Calc-away technology'],
    stock: 8,
    isNew: true
  },
  {
    name: 'Tefal OptiGrill Elite Intelligent Grill',
    price: 195.00,
    category: 'kitchen',
    image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=800&q=80',
      'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=800&q=80'
    ],
    description: 'Measures the thickness of ingredients to the millimeter and adjusts the cooking time automatically for perfect results.',
    details: ['Power: 2000W', '12 automatic programs', 'Searing boost function', 'Dishwasher-safe plates'],
    stock: 5,
    isNew: true
  },
  {
    name: 'Tefal Jamie Oliver Cook\'s Direct Pan',
    price: 45.00,
    category: 'kitchen',
    image: 'https://images.unsplash.com/photo-1584990333910-efed3a05b424?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
      'https://images.unsplash.com/photo-1584990333910-efed3a05b424?w=800&q=80'
    ],
    description: 'Stainless steel frying pan with non-stick coating and Thermo-Signal technology for easy everyday cooking.',
    details: ['Diameter: 28cm', 'Titanium non-stick coating', 'Induction compatible', 'Oven safe up to 175°C'],
    stock: 15,
    isNew: false
  },
  {
    name: 'Tefal Comfort Rice Cooker',
    price: 55.00,
    category: 'kitchen',
    image: 'https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80',
      'https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?w=800&q=80'
    ],
    description: 'Automatic rice cooker with keep-warm function. Simple one-click operation for perfect rice every time.',
    details: ['Capacity: 1.8L (10 cups)', 'Power: 700W', 'Non-stick removable bowl', 'Includes steam basket'],
    stock: 12,
    isNew: true
  },
  {
    name: 'Tefal Uno Deep Fryer',
    price: 65.00,
    category: 'kitchen',
    image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1544259686-a0e1e1fa5f2f?w=800&q=80',
      'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&q=80'
    ],
    description: 'Compact fryer with large capacity. Easy to store thanks to foldable handle. Viewing window for monitoring.',
    details: ['Capacity: 1kg of food', 'Oil capacity: 1.8L', 'Adjustable thermostat', 'Automatic lid opening'],
    stock: 10,
    isNew: false
  },
  {
    name: 'Tefal Virtuo Steam Iron',
    price: 35.00,
    category: 'home',
    image: 'https://images.unsplash.com/photo-1517420829317-adff607ff910?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80',
      'https://images.unsplash.com/photo-1517420829317-adff607ff910?w=800&q=80'
    ],
    description: 'Compact and efficient iron with non-stick soleplate. Ergonomic steam trigger for easy use.',
    details: ['Power: 1800W', 'Continuous steam: 24g/min', 'Steam boost: 80g/min', 'Anti-drip system'],
    stock: 20,
    isNew: true
  },
  {
    name: 'Tefal Daily Cook Induction 5-Piece Set',
    price: 115.00,
    category: 'kitchen',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
      'https://images.unsplash.com/photo-1584990333910-efed3a05b424?w=800&q=80'
    ],
    description: 'Premium stainless steel cookware with smart lids that can stand on the countertop to keep it clean.',
    details: ['Includes: 3 saucepans, 2 lids', 'Internal measuring marks', 'Glass lids with steam vent', 'All hobs compatible'],
    stock: 7,
    isNew: true
  },
  {
    name: 'Tefal Masterseal Food Storage Set',
    price: 25.00,
    category: 'kitchen',
    image: 'https://images.unsplash.com/photo-1564568242889-3470c3d6eb09?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1564568242889-3470c3d6eb09?w=800&q=80',
      'https://images.unsplash.com/photo-1594385208974-2e75f9d8a513?w=800&q=80'
    ],
    description: '100% leak-proof and hygienic food containers. Keeps food fresh for longer thanks to the unique seal.',
    details: ['Set of 5 containers', 'BPA free', 'Microwave and freezer safe', 'Dishwasher safe'],
    stock: 35,
    isNew: false
  },

  // --- LIVARNO (furniture & decor & bedding) ---
  {
    name: 'Livarno Home Shelving Unit with 6 Baskets',
    price: 59.00,
    category: 'furniture',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=800&q=80',
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80'
    ],
    description: 'Versatile storage unit with 6 textile baskets. Ideal for bathroom, bedroom or children\'s room.',
    details: ['Dimensions: 65 x 76 x 35 cm', 'Solid bamboo frame', 'Easy to assemble', 'Max load: 2kg per basket'],
    stock: 8,
    isNew: true
  },
  {
    name: 'Livarno Home LED Desk Lamp',
    price: 24.00,
    category: 'decor',
    image: 'https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80',
      'https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=800&q=80'
    ],
    description: 'Energy-saving LED lamp with flexible arm. 3-stage adjustable brightness with touch control.',
    details: ['Power: 5W', 'USB charging port included', 'Cool white light', 'Sleek matte finish'],
    stock: 25,
    isNew: true
  },
  {
    name: 'Livarno Home Cotton Bed Linen Set',
    price: 35.00,
    category: 'bedding',
    image: 'https://images.unsplash.com/photo-1616627561839-074385245ff6?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80',
      'https://images.unsplash.com/photo-1616627561839-074385245ff6?w=800&q=80'
    ],
    description: 'Soft and breathable cotton bed linen for a comfortable night\'s sleep. Reversible design.',
    details: ['Material: 100% Cotton', 'Includes: 1 duvet cover, 2 pillowcases', 'Zipper closure', 'Machine washable'],
    stock: 15,
    isNew: false
  },
  {
    name: 'Livarno Home Bathroom Mirror Cabinet',
    price: 79.00,
    category: 'furniture',
    image: 'https://images.unsplash.com/photo-1620626011761-9963d7521477?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1552323374-5a6f1f0e3b2a?w=800&q=80',
      'https://images.unsplash.com/photo-1620626011761-9963d7521477?w=800&q=80'
    ],
    description: 'Space-saving cabinet with 3 mirrored doors and 6 height-adjustable glass shelves.',
    details: ['Dimensions: 70 x 75 x 17 cm', 'Melamine resin coating', 'Moisture resistant', 'White gloss finish'],
    stock: 6,
    isNew: true
  },
  {
    name: 'Livarno Home Solar LED Path Lights (Set of 4)',
    price: 18.00,
    category: 'decor',
    image: 'https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80',
      'https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=800&q=80'
    ],
    description: 'Weatherproof outdoor lights that turn on automatically at dusk. No wiring required.',
    details: ['Material: Stainless steel', 'Lighting duration: up to 8 hours', 'Integrated solar panel', 'Ground spike included'],
    stock: 40,
    isNew: false
  },
  {
    name: 'Livarno Home Storage Ottoman',
    price: 32.00,
    category: 'furniture',
    image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
      'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800&q=80'
    ],
    description: 'Padded seat with large internal storage space. Foldable for space-saving storage.',
    details: ['Dimensions: 38 x 38 x 38 cm', 'Max load: 110 kg', 'Linen-look fabric', 'Capacity: approx. 40L'],
    stock: 12,
    isNew: true
  },
  {
    name: 'Livarno Home Velvet Curtains (2 Pack)',
    price: 45.00,
    category: 'decor',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1616627561839-074385245ff6?w=800&q=80',
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80'
    ],
    description: 'Heavy velvet curtains for a luxurious look. Provides privacy and helps block out light.',
    details: ['Size: 135 x 254 cm each', 'Material: 100% Polyester', 'Ready to hang with eyelets', 'Machine washable'],
    stock: 10,
    isNew: false
  },
  {
    name: 'Livarno Home Wall Clock',
    price: 15.00,
    category: 'decor',
    image: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=800&q=80',
      'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=800&q=80'
    ],
    description: 'Minimalist wall clock with silent quartz movement. Large, easy-to-read numbers.',
    details: ['Diameter: 30cm', 'Material: Plastic/Glass', 'Battery included', 'Modern gray frame'],
    stock: 20,
    isNew: true
  }
];

const importData = async () => {
  try {
    await connectDB();

    await Order.deleteMany();
    await Product.deleteMany();
    await User.deleteMany();

    const createdUsers = await User.insertMany(users);
    const regularUser = createdUsers[1]._id;

    const createdProducts = await Product.insertMany(products);

    // Create a sample order
    const orderItems = [
      {
        name: createdProducts[0].name,
        qty: 1,
        image: createdProducts[0].image,
        price: createdProducts[0].price,
        product: createdProducts[0]._id,
      },
      {
        name: createdProducts[8].name,
        qty: 1,
        image: createdProducts[8].image,
        price: createdProducts[8].price,
        product: createdProducts[8]._id,
      }
    ];

    const itemsPrice = orderItems.reduce((acc, item) => acc + item.price * item.qty, 0);
    const shippingPrice = 5.00;
    const totalPrice = itemsPrice + shippingPrice;

    const sampleOrder = {
      user: regularUser,
      orderItems,
      shippingAddress: {
        address: 'Mar Mikhael Street',
        city: 'Beirut',
        postalCode: '1100',
        fullName: 'John Doe',
      },
      paymentMethod: 'Cash on Delivery',
      itemsPrice,
      shippingPrice,
      totalPrice,
      isPaid: false,
      isDelivered: false,
    };

    await Order.create(sampleOrder);

    console.log(`Data Imported Successfully! Total Products: ${createdProducts.length}`);
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await connectDB();

    await Order.deleteMany();
    await Product.deleteMany();
    await User.deleteMany();

    console.log('Data Destroyed!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
