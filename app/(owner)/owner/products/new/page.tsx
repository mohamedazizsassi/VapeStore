import { ProductForm } from "../product-form";
import { createProductAction } from "../actions";

export default function NewProduct() {
  return (
    <div className="p-4">
      <div className="card">
        <h1 className="text-xl font-semibold mb-3">New product</h1>
        <ProductForm action={createProductAction} submitLabel="Create" />
      </div>
    </div>
  );
}
