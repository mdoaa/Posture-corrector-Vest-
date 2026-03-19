import React, { useState, useMemo } from "react";
import axios from "axios";
import NavBar from "./Nav";

const AddProduct = () => {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "",
    description: "",
    image: null,
  });

  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      formData.name.trim() &&
      String(formData.price).trim() &&
      String(formData.stock).trim() &&
      formData.description.trim() &&
      formData.image
    );
  }, [formData]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "image") {
      const file = files?.[0] || null;
      setFormData((p) => ({ ...p, image: file }));

      if (file) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl("");
      }
      return;
    }

    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    const data = new FormData();
    data.append("name", formData.name);
    data.append("price", formData.price);
    data.append("stock", formData.stock);
    data.append("description", formData.description);
    if (formData.image) data.append("image", formData.image);

    try {
      setSubmitting(true);
      const res = await axios.post("https://sitx.onrender.com/products", data, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      alert("Product added successfully ✅");
      console.log("Added product:", res.data);

      // reset
      setFormData({
        name: "",
        price: "",
        stock: "",
        description: "",
        image: null,
      });
      setPreviewUrl("");
    } catch (err) {
      console.error("Error adding product:", err);
      alert("Failed to add product");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      stock: "",
      description: "",
      image: null,
    });
    setPreviewUrl("");
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900">
      <NavBar />

      <main className="mx-auto max-w-4xl px-4 py-14">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Add Product
          </h1>
          <p className="mt-2 text-slate-600">
            Create a new product for your inventory.
          </p>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur md:p-10">
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="grid gap-5 md:grid-cols-2">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Product Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="SitX Posture Corrector Vest"
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Price */}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Price ($) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  placeholder="199"
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Stock */}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Stock <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  required
                  placeholder="50"
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Image upload + preview */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Product Image <span className="text-rose-600">*</span>
                </label>

                <div className="mt-2 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-black/10 bg-white p-4">
                    <input
                      type="file"
                      name="image"
                      accept="image/*"
                      required
                      onChange={handleChange}
                      className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-black"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      PNG/JPG recommended. Keep it under ~2MB if possible.
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-black/10 bg-slate-50">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-44 items-center justify-center text-sm text-slate-500">
                        Image preview will appear here
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Description <span className="text-rose-600">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder="Write a short premium description..."
                  className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-black/20 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-black/10 bg-white px-6 py-3 font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="rounded-xl bg-slate-900 px-6 py-3 font-medium text-white shadow-lg shadow-black/10 transition hover:translate-y-[-1px] hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Adding..." : "Add Product"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AddProduct;
