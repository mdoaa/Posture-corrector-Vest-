import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import NavBar from "./Nav";

const ViewProducts = () => {
  const [products, setProducts] = useState([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");

  const [editingProductId, setEditingProductId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    image: null,
  });
  const [imagePreview, setImagePreview] = useState("");

  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setError("");
        const response = await axios.get("https://sitx-backend-new.onrender.com/admin/product", {
          withCredentials: true,
        });
        setProducts(response.data.products || []);
        setCount(response.data.count || 0);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Failed to fetch products");
      }
    };
    fetchProducts();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [products, query]);

  const openEdit = (product) => {
    setError("");
    setEditingProductId(product._id);
    setEditForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price ?? "",
      stock: product.stock ?? "",
      image: null,
    });
    setImagePreview(
      product.image ? `https://sitx-backend-new.onrender.com/uploads/${product.image}` : ""
    );
  };

  const cancelEdit = () => {
    setEditingProductId(null);
    setEditForm({
      name: "",
      description: "",
      price: "",
      stock: "",
      image: null,
    });
    setImagePreview("");
  };

  const handleFormChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "image") {
      const file = files?.[0] || null;
      setEditForm((prev) => ({ ...prev, image: file }));
      setImagePreview(file ? URL.createObjectURL(file) : imagePreview);
      return;
    }

    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!editingProductId) return;
    if (saving) return;

    try {
      setSaving(true);
      setError("");

      const formData = new FormData();
      formData.append("name", editForm.name);
      formData.append("description", editForm.description);
      formData.append("price", editForm.price);
      formData.append("stock", editForm.stock);
      if (editForm.image) formData.append("image", editForm.image);

      const response = await axios.put(
        `https://sitx-backend-new.onrender.com/admin/products/${editingProductId}`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setProducts((prev) =>
        prev.map((p) => (p._id === editingProductId ? response.data : p))
      );
      cancelEdit();
    } catch (err) {
      console.error("Error updating product:", err);
      setError("Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  const money = (n) => (Number(n) || 0).toFixed(2);

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              All Products{" "}
              <span className="text-slate-500">({count || products.length})</span>
            </h1>
            <p className="mt-2 text-slate-600">
              Search, view, and edit products in your inventory.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={() => navigate("/admin")}
              className="rounded-xl border border-black/10 bg-white px-5 py-3 font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              ← Back to Dashboard
            </button>

            <button
              onClick={() => navigate("/addProduct")}
              className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white shadow-lg shadow-black/10 transition hover:translate-y-[-1px] hover:bg-black"
            >
              + Add Product
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 rounded-3xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur md:p-5">
          <label className="text-sm font-medium text-slate-700">Search</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or description..."
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
          />
          {error && (
            <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>
          )}
        </div>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => {
            const isEditing = editingProductId === product._id;

            return (
              <div
                key={product._id}
                className="rounded-3xl border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:shadow-md"
              >
                {/* Image */}
                <div className="overflow-hidden rounded-2xl border border-black/10 bg-slate-50">
                  <img
                    src={
                      isEditing
                        ? imagePreview || "https://via.placeholder.com/600x600?text=No+Image"
                        : product.image
                        ? `https://sitx-backend-new.onrender.com/uploads/${product.image}`
                        : "https://via.placeholder.com/600x600?text=No+Image"
                    }
                    alt={product.name}
                    className="aspect-square w-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="mt-5">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600">
                          Name
                        </label>
                        <input
                          name="name"
                          value={editForm.name}
                          onChange={handleFormChange}
                          className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-600">
                          Description
                        </label>
                        <input
                          name="description"
                          value={editForm.description}
                          onChange={handleFormChange}
                          className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-600">
                            Price
                          </label>
                          <input
                            type="number"
                            name="price"
                            value={editForm.price}
                            onChange={handleFormChange}
                            className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-slate-600">
                            Stock
                          </label>
                          <input
                            type="number"
                            name="stock"
                            value={editForm.stock}
                            onChange={handleFormChange}
                            className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-600">
                          Change Image
                        </label>
                        <input
                          type="file"
                          name="image"
                          accept="image/*"
                          onChange={handleFormChange}
                          className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-black"
                        />
                      </div>

                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-black/10 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-lg font-semibold text-slate-900">
                          {product.name}
                        </h2>
                        <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                          ${money(product.price)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-600 line-clamp-3">
                        {product.description}
                      </p>

                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm text-slate-600">
                          Stock:{" "}
                          <span className="font-semibold text-slate-900">
                            {product.stock}
                          </span>
                        </p>

                        <button
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-black/10 transition hover:translate-y-[-1px] hover:bg-black"
                          onClick={() => openEdit(product)}
                        >
                          Edit
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="mt-10 rounded-3xl border border-black/10 bg-white/70 p-10 text-center shadow-sm backdrop-blur">
            <div className="text-lg font-semibold">No products found</div>
            <p className="mt-2 text-slate-600">
              Try another search term or add a new product.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ViewProducts;