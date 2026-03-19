import NavBar from "./Nav";
import Footer from "./Footer";
import  { useState, useEffect } from "react";
import axios from "axios";
import { useCart } from "./CartContext";

const images = [
  { src: "/vestfront.jpg", alt: "Front View" },
  { src: "/vestback.jpg", alt: "Back View" },
];

const Buy = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  //const { user } = useUser();
  const [, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState("black");
  const { addToCart } = useCart();

  const img = (path) => process.env.PUBLIC_URL + path;

  useEffect(() => {
    axios
      .get("https://sitx-backend-new.onrender.com/products")
      .then((res) => {
        setProducts(res.data);
        if (res.data.length > 0) {
          setSelectedProduct(res.data[0]);
        }
      })
      .catch((err) => console.error("Error fetching products:", err));
  }, []);

  const handleBuy = () => {
    if (selectedProduct) {
      addToCart(selectedProduct._id);
    }
  };

  if (!selectedProduct) {
    return (
      <>
        <NavBar />
        <div className="flex h-[60vh] items-center justify-center text-slate-600">
          Loading products...
        </div>
        <Footer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900">
      <NavBar />

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* LEFT: Images */}
          <div>
            <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
              <img
                src={img(images[currentIndex].src)}
                alt={images[currentIndex].alt}
                className="aspect-square w-full object-cover transition duration-500 hover:scale-[1.02]"
              />
            </div>

            {/* Thumbnails */}
            <div className="mt-4 flex gap-3">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`overflow-hidden rounded-xl border ${
                    currentIndex === index
                      ? "border-slate-900"
                      : "border-black/10"
                  }`}
                >
                  <img
                    src={img(image.src)}
                    alt={image.alt}
                    className="h-20 w-20 object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: Info */}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {selectedProduct.name}
            </h1>

            <div className="mt-4 text-sm text-slate-600">
              ★★★★★ <span className="ml-2">4.9 (2,847 reviews)</span>
            </div>

            <div className="mt-6 text-3xl font-semibold text-slate-900">
              ${selectedProduct.price}
            </div>

            {/* Color */}
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-800">
                Color
              </h3>
              <div className="mt-3 flex gap-3">
                {[
                  { name: "black", color: "#000000" },
                  { name: "gray", color: "#808080" },
                  { name: "blue", color: "#2563eb" },
                ].map((colorOption) => (
                  <button
                    key={colorOption.name}
                    onClick={() => setSelectedColor(colorOption.name)}
                    className={`h-8 w-8 rounded-full border-2 transition ${
                      selectedColor === colorOption.name
                        ? "border-slate-900 scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: colorOption.color }}
                  />
                ))}
              </div>
            </div>

            {/* Add to cart */}
            <div className="mt-10">
              <button
                onClick={handleBuy}
                className="w-full rounded-xl bg-slate-900 px-6 py-4 text-lg font-medium text-white shadow-lg shadow-black/10 transition hover:translate-y-[-2px] hover:bg-black"
              >
                🛒 Add to Cart
              </button>
            </div>

            {/* Features */}
            <div className="mt-12 rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Key Features</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>• Easy to wear — Velcro & elastic straps</li>
                <li>• Durable materials for long-lasting use</li>
                <li>• Designed for men & women</li>
                <li>• Breathable moisture-wicking fabric</li>
                <li>• Helps reduce neck, back & shoulder pain</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Buy;
